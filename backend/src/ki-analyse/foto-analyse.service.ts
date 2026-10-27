import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Mailer } from '../mailer/mailer.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AnalyseFoto } from './gemini.client.js';
import {
  FOTO_SYSTEM_PROMPT,
  type FotoAnalyseErgebnis,
  fotoAnalyseMailText,
} from './ki-analyse.js';
import {
  frageKi,
  KI_REDIS,
  type KiRedis,
  pruefeKiLimit,
  VORSCHAU_TTL_SEKUNDEN,
} from './ki-analyse.service.js';
import { KiClient } from './ki.client.js';

export type FotoDatei = Omit<AnalyseFoto, 'label'>;

export function fotoVorschauSchluessel(nutzerId: string): string {
  return `ki-analyse:foto:${nutzerId}`;
}

// Foto-Analyse ohne Stoffstrom (Issue #147). Foto und Ergebnis werden nicht
// gespeichert; nur das Ergebnis liegt bis zum Mailversand oder Verwerfen in
// Redis, damit die Mail genau das enthält, was von der KI kam.
@Injectable()
export class FotoAnalyseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ki: KiClient,
    @Inject(KI_REDIS) private readonly redis: KiRedis,
    private readonly mailer: Mailer,
  ) {}

  async analysiere(
    foto: FotoDatei,
    nutzerId: string,
  ): Promise<FotoAnalyseErgebnis> {
    await pruefeKiLimit(this.redis, nutzerId);
    const { fraktionen, einschaetzung, avvPruefung } = await frageKi(() =>
      this.ki.analysiere(
        [{ label: 'Foto', ...foto }],
        'Foto-Analyse ohne erfassten AVV-Code.',
        FOTO_SYSTEM_PROMPT,
      ),
    );
    const code = avvPruefung.vorgeschlagenerCode;
    const treffer = code
      ? await this.prisma.avvCode.findUnique({
          where: { code },
          select: { code: true, bezeichnung: true, gefaehrlich: true },
        })
      : null;
    const ergebnis: FotoAnalyseErgebnis = {
      fraktionen,
      einschaetzung,
      avvVorschlag: treffer
        ? { ...treffer, begruendung: avvPruefung.begruendung }
        : null,
    };
    await this.redis.set(
      fotoVorschauSchluessel(nutzerId),
      JSON.stringify(ergebnis),
      'EX',
      VORSCHAU_TTL_SEKUNDEN,
    );
    return ergebnis;
  }

  // "Verwerfen": die Vorschau nicht erst nach einer Stunde ablaufen lassen.
  async verwerfe(nutzerId: string): Promise<void> {
    await this.redis.del(fotoVorschauSchluessel(nutzerId));
  }

  // Empfänger ist immer die eigene Adresse, nie ein Wert aus dem Request.
  async sende(foto: FotoDatei, nutzerId: string): Promise<void> {
    const schluessel = fotoVorschauSchluessel(nutzerId);
    const vorschau = await this.redis.get(schluessel);
    if (!vorschau) {
      throw new BadRequestException(
        'Keine aktuelle Analyse zum Senden vorhanden. Bitte erneut analysieren.',
      );
    }
    const nutzer = await this.prisma.nutzer.findUniqueOrThrow({
      where: { id: nutzerId },
      select: { vorname: true, email: true },
    });
    await this.mailer.sendFotoAnalyse(
      nutzer.email,
      fotoAnalyseMailText(
        JSON.parse(vorschau) as FotoAnalyseErgebnis,
        nutzer.vorname,
        new Date(),
      ),
      foto,
    );
    await this.redis.del(schluessel);
  }
}
