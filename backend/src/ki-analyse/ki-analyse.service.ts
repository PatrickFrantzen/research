import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Redis } from 'ioredis';
import { ObjectStorageService } from '../object-storage/object-storage.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GeminiClient, GeminiKontingentErschoepft, GeminiNichtEingerichtet } from './gemini.client.js';
import { KiAnalyseErgebnis, pruefeAntwort } from './ki-analyse.js';

export const KI_REDIS = Symbol('KI_REDIS');

// Gemini nimmt inline höchstens ~20 MB pro Request, Base64 bläht um 4/3 auf.
export const MAX_FOTOS_BYTES = 14 * 1024 * 1024;
export const ANALYSEN_PRO_MINUTE = 5;
const VORSCHAU_TTL_SEKUNDEN = 60 * 60;

// Schlüssel pro Eintrag und Nutzer: das Speichern (Issue #94) übernimmt nur,
// was hier wirklich von der KI kam, nie Werte aus dem Client.
export function vorschauSchluessel(wareneintragId: string, nutzerId: string): string {
  return `ki-analyse:vorschau:${wareneintragId}:${nutzerId}`;
}

@Injectable()
export class KiAnalyseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly objectStorage: ObjectStorageService,
    private readonly gemini: GeminiClient,
    @Inject(KI_REDIS) private readonly redis: Pick<Redis, 'incr' | 'expire' | 'set'>,
  ) {}

  async analysiere(wareneintragId: string, nutzerId: string): Promise<KiAnalyseErgebnis> {
    const wareneintrag = await this.prisma.wareneintrag.findUnique({
      where: { id: wareneintragId },
      include: { avvCode: { select: { code: true, bezeichnung: true } } },
    });
    if (!wareneintrag) throw new NotFoundException('Wareneintrag nicht gefunden.');
    const keys = [
      { label: 'Fernansicht', key: wareneintrag.fotoFernUrl },
      { label: 'Nahansicht', key: wareneintrag.fotoNahUrl },
      { label: 'Detailansicht', key: wareneintrag.fotoDetailUrl },
    ].filter((foto): foto is { label: string; key: string } => foto.key !== null);
    if (keys.length === 0) throw new BadRequestException('Der Wareneintrag hat keine Fotos.');

    await this.pruefeLimit(nutzerId);

    const fotos = await Promise.all(
      keys.map(async ({ label, key }) => ({ label, ...(await this.objectStorage.ladeFoto(key)) })),
    );
    if (fotos.reduce((summe, foto) => summe + foto.daten.length, 0) > MAX_FOTOS_BYTES) {
      throw new UnprocessableEntityException(
        'Die Fotos sind zusammen zu groß für die KI-Analyse. Bitte im Bearbeiten-Dialog neu aufnehmen, sie werden dabei verkleinert.',
      );
    }

    const kontext = `Erfasster AVV-Code: ${wareneintrag.avvCode.code} ${wareneintrag.avvCode.bezeichnung}\nFreitext des Nutzers: ${wareneintrag.freitext}`;
    let ergebnis: KiAnalyseErgebnis | null;
    try {
      ergebnis = pruefeAntwort(await this.gemini.analysiere(fotos, kontext));
    } catch (error) {
      if (error instanceof GeminiNichtEingerichtet) throw new ServiceUnavailableException('Die KI-Analyse ist nicht eingerichtet.');
      if (error instanceof GeminiKontingentErschoepft) {
        throw new HttpException('Tageskontingent der KI-Analyse erschöpft, bitte morgen erneut versuchen.', HttpStatus.TOO_MANY_REQUESTS);
      }
      ergebnis = null;
    }
    if (!ergebnis) throw new BadGatewayException('Die KI-Analyse ist fehlgeschlagen. Bitte später erneut versuchen.');

    await this.redis.set(vorschauSchluessel(wareneintragId, nutzerId), JSON.stringify(ergebnis), 'EX', VORSCHAU_TTL_SEKUNDEN);
    return ergebnis;
  }

  // Eigener Zähler statt ThrottlerGuard: der globale Guard läuft vor der
  // Anmeldung und kennt nur die IP, das Limit gilt aber pro Nutzer.
  private async pruefeLimit(nutzerId: string): Promise<void> {
    const schluessel = `ki-analyse:limit:${nutzerId}`;
    const anzahl = await this.redis.incr(schluessel);
    if (anzahl === 1) await this.redis.expire(schluessel, 60);
    if (anzahl > ANALYSEN_PRO_MINUTE) {
      throw new HttpException('Zu viele KI-Analysen. Bitte eine Minute warten.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
