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
import { Prisma } from '../generated/prisma/client.js';
import { ObjectStorageService } from '../object-storage/object-storage.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GeminiClient, GeminiKontingentErschoepft, GeminiNichtEingerichtet } from './gemini.client.js';
import { GepruefteAntwort, KiAnalyseErgebnis, pruefeAntwort } from './ki-analyse.js';

export const KI_REDIS = Symbol('KI_REDIS');

export interface GespeicherteAnalyse {
  ergebnis: KiAnalyseErgebnis;
  analysiertVon: { vorname: string; nachname: string };
  analysiertAm: Date;
}

const ANALYSE_AUSWAHL = {
  ergebnis: true,
  analysiertAm: true,
  analysiertVon: { select: { vorname: true, nachname: true } },
} as const;

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
    @Inject(KI_REDIS) private readonly redis: Pick<Redis, 'incr' | 'expire' | 'set' | 'get' | 'del'>,
  ) {}

  async gespeicherte(wareneintragId: string): Promise<GespeicherteAnalyse | null> {
    const analyse = await this.prisma.wareneintragAnalyse.findUnique({ where: { wareneintragId }, select: ANALYSE_AUSWAHL });
    return analyse as unknown as GespeicherteAnalyse | null;
  }

  // Übernimmt ausschließlich die Vorschau dieses Nutzers aus Redis (Issue #94):
  // ein Request-Body wird gar nicht gelesen, manipulierte Werte kommen nie an.
  // Eine Analyse pro Eintrag, jeder Nutzer darf überschreiben.
  async speichern(wareneintragId: string, nutzerId: string): Promise<GespeicherteAnalyse> {
    const schluessel = vorschauSchluessel(wareneintragId, nutzerId);
    const vorschau = await this.redis.get(schluessel);
    if (!vorschau) {
      throw new BadRequestException('Keine aktuelle Analyse zum Speichern vorhanden. Bitte erneut analysieren.');
    }
    const ergebnis = JSON.parse(vorschau) as Prisma.InputJsonObject;
    const daten = { ergebnis, analysiertVonId: nutzerId, analysiertAm: new Date() };
    const analyse = await this.prisma.wareneintragAnalyse.upsert({
      where: { wareneintragId },
      create: { wareneintragId, ...daten },
      update: daten,
      select: ANALYSE_AUSWAHL,
    });
    await this.redis.del(schluessel);
    return analyse as unknown as GespeicherteAnalyse;
  }

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

    // Größe erst über die Metadaten prüfen: zu große Fotos nie in den RAM
    // laden, Base64 für Gemini würde sie noch einmal aufblähen (Issue #102).
    const groessen = await Promise.all(keys.map(({ key }) => this.objectStorage.fotoGroesse(key)));
    if (groessen.reduce((summe, groesse) => summe + groesse, 0) > MAX_FOTOS_BYTES) {
      throw new UnprocessableEntityException(
        'Die Fotos sind zusammen zu groß für die KI-Analyse. Bitte im Bearbeiten-Dialog neu aufnehmen, sie werden dabei verkleinert.',
      );
    }
    const fotos = await Promise.all(
      keys.map(async ({ label, key }) => ({ label, ...(await this.objectStorage.ladeFoto(key)) })),
    );

    const kontext = `Erfasster AVV-Code: ${wareneintrag.avvCode.code} ${wareneintrag.avvCode.bezeichnung}\nFreitext des Nutzers: ${wareneintrag.freitext}`;
    let antwort: GepruefteAntwort | null;
    try {
      antwort = pruefeAntwort(await this.gemini.analysiere(fotos, kontext));
    } catch (error) {
      if (error instanceof GeminiNichtEingerichtet) throw new ServiceUnavailableException('Die KI-Analyse ist nicht eingerichtet.');
      if (error instanceof GeminiKontingentErschoepft) {
        throw new HttpException('Tageskontingent der KI-Analyse erschöpft, bitte morgen erneut versuchen.', HttpStatus.TOO_MANY_REQUESTS);
      }
      antwort = null;
    }
    if (!antwort) throw new BadGatewayException('Die KI-Analyse ist fehlgeschlagen. Bitte später erneut versuchen.');
    const ergebnis = await this.mitAvvVorschlag(antwort, wareneintrag.avvCode.code);

    await this.redis.set(vorschauSchluessel(wareneintragId, nutzerId), JSON.stringify(ergebnis), 'EX', VORSCHAU_TTL_SEKUNDEN);
    return ergebnis;
  }

  // Nur existierende Codes werden vorgeschlagen, samt Bezeichnung aus
  // avv_codes (Issue #95). Unbekannte Codes und der bereits erfasste Code
  // entfallen, das Urteil bleibt. Übernommen wird nur über "Bearbeiten".
  private async mitAvvVorschlag(antwort: GepruefteAntwort, erfassterCode: string): Promise<KiAnalyseErgebnis> {
    const { vorgeschlagenerCode, ...pruefung } = antwort.avvPruefung;
    const vorschlag =
      vorgeschlagenerCode && vorgeschlagenerCode !== erfassterCode
        ? await this.prisma.avvCode.findUnique({ where: { code: vorgeschlagenerCode }, select: { code: true, bezeichnung: true } })
        : null;
    return { ...antwort, avvPruefung: { ...pruefung, vorschlag } };
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
