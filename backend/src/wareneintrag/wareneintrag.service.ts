import { ForbiddenException, Injectable } from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import { Prisma } from '../generated/prisma/client.js';
import { ObjectStorageService } from '../object-storage/object-storage.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateWareneintragDto } from './dto/create-wareneintrag.dto.js';
import type { EntfernbareDatei } from './dto/entferne-datei.dto.js';
import { UpdateWareneintragDto } from './dto/update-wareneintrag.dto.js';
import { folgetagBeginnBerlin, tagesbeginnBerlin } from './berlin-tag.js';

// Ohne Angabe: neueste zuerst. AVV-Codes haben ein festes Format (17 01 01),
// die Textsortierung entspricht deshalb der numerischen.
export type Sortierung = 'avv-auf' | 'avv-ab';
const AVV_RICHTUNG = { 'avv-auf': 'asc', 'avv-ab': 'desc' } as const;

export interface WareneintragDateien {
  fotoFern?: Express.Multer.File;
  fotoNah?: Express.Multer.File;
  fotoDetail?: Express.Multer.File;
  dokument?: Express.Multer.File;
}

// Nie den client-deklarierten MIME-Type an den Objektspeicher durchreichen:
// die Upload-Validierung prüft zwar die Magic Bytes, aber `foto.mimetype`
// bleibt trotzdem der ungeprüfte Header-Wert. Content-Type im Objektspeicher
// muss dem tatsächlichen Inhalt entsprechen (Issue #43).
async function erkannterBildTyp(
  buffer: Buffer,
  deklarierterTyp: string,
): Promise<string> {
  const erkannt = await fileTypeFromBuffer(buffer);
  return erkannt?.mime ?? deklarierterTyp;
}

async function ladeFotoHoch(
  objectStorage: ObjectStorageService,
  foto?: Express.Multer.File,
): Promise<string | undefined> {
  if (!foto) return undefined;
  return objectStorage.uploadFoto(
    foto.buffer,
    await erkannterBildTyp(foto.buffer, foto.mimetype),
  );
}

@Injectable()
export class WareneintragService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly objectStorage: ObjectStorageService,
  ) {}

  async findAll(filter: {
    avvCodeId?: string;
    standortId?: string;
    suche?: string;
    datumVon?: string;
    datumBis?: string;
    sortierung?: Sortierung;
    seite?: number;
    proSeite?: number;
  }) {
    const {
      suche,
      avvCodeId,
      standortId,
      sortierung,
      seite = 0,
      proSeite = 20,
    } = filter;
    // Berliner Kalendertage, "bis" einschließlich: obere Grenze ist der Folgetag.
    const von = filter.datumVon && tagesbeginnBerlin(filter.datumVon);
    const bis = filter.datumBis && folgetagBeginnBerlin(filter.datumBis);
    const gemeinsam = { avvCodeId, standortId, von, bis, sortierung };
    const { treffer, gesamt } = suche
      ? await this.sucheMitVolltext({ ...gemeinsam, suche, seite, proSeite })
      : await this.listeAlle({ ...gemeinsam, seite, proSeite });
    const daten = await Promise.all(
      treffer.map(async (wareneintrag) => ({
        ...wareneintrag,
        // *Url sind in der DB nur Object-Storage-Keys (ADR-0003), keine
        // abrufbaren URLs. Erst hier, unmittelbar vor der Auslieferung an den
        // Client, in zeitlich begrenzt gültige URLs übersetzen, statt den
        // Bucket öffentlich lesbar zu machen (Issue #45). Fehlende Fotos
        // (optional, siehe CONTEXT.md) bleiben null.
        fotoFernUrl: wareneintrag.fotoFernUrl
          ? await this.objectStorage.getSignedUrl(wareneintrag.fotoFernUrl)
          : null,
        fotoNahUrl: wareneintrag.fotoNahUrl
          ? await this.objectStorage.getSignedUrl(wareneintrag.fotoNahUrl)
          : null,
        fotoDetailUrl: wareneintrag.fotoDetailUrl
          ? await this.objectStorage.getSignedUrl(wareneintrag.fotoDetailUrl)
          : null,
        dokumentUrl: wareneintrag.dokumentUrl
          ? await this.objectStorage.getSignedUrl(wareneintrag.dokumentUrl)
          : null,
      })),
    );
    return { daten, gesamt };
  }

  private async listeAlle(filter: {
    avvCodeId?: string;
    standortId?: string;
    von?: Date | '';
    bis?: Date | '';
    sortierung?: Sortierung;
    seite: number;
    proSeite: number;
  }) {
    const bedingungen = {
      ...(filter.avvCodeId && { avvCodeId: filter.avvCodeId }),
      ...(filter.standortId && { standortId: filter.standortId }),
      ...((filter.von || filter.bis) && {
        erstelltAm: {
          ...(filter.von && { gte: filter.von }),
          ...(filter.bis && { lt: filter.bis }),
        },
      }),
    };
    const where = Object.keys(bedingungen).length > 0 ? bedingungen : undefined;
    const [treffer, gesamt] = await Promise.all([
      this.prisma.wareneintrag.findMany({
        where,
        include: {
          avvCode: { select: { id: true, code: true, bezeichnung: true } },
          standort: { select: { id: true, name: true } },
          erfasstVon: {
            select: {
              id: true,
              vorname: true,
              nachname: true,
              email: true,
              telefon: true,
              position: true,
            },
          },
        },
        orderBy: [
          ...(filter.sortierung
            ? [{ avvCode: { code: AVV_RICHTUNG[filter.sortierung] } }]
            : []),
          { erstelltAm: 'desc' },
          { id: 'desc' },
        ],
        skip: filter.seite * filter.proSeite,
        take: filter.proSeite,
      }),
      this.prisma.wareneintrag.count({ where }),
    ]);
    return { treffer, gesamt };
  }

  // Volltextsuche über die generierte tsvector-Spalte (GIN-indiziert), kein
  // LIKE-Scan, siehe Issue #4.
  private async sucheMitVolltext(filter: {
    avvCodeId?: string;
    standortId?: string;
    von?: Date | '';
    bis?: Date | '';
    sortierung?: Sortierung;
    suche: string;
    seite: number;
    proSeite: number;
  }) {
    const avvFilter = filter.avvCodeId
      ? Prisma.sql`AND avv_code_id = ${filter.avvCodeId}`
      : Prisma.empty;
    const standortFilter = filter.standortId
      ? Prisma.sql`AND wareneintraege.standort_id = ${filter.standortId}`
      : Prisma.empty;
    const vonFilter = filter.von
      ? Prisma.sql`AND wareneintraege.erstellt_am >= ${filter.von}`
      : Prisma.empty;
    const bisFilter = filter.bis
      ? Prisma.sql`AND wareneintraege.erstellt_am < ${filter.bis}`
      : Prisma.empty;
    const reihenfolge = filter.sortierung
      ? filter.sortierung === 'avv-auf'
        ? Prisma.sql`avv_codes.code ASC, `
        : Prisma.sql`avv_codes.code DESC, `
      : Prisma.empty;
    const praefixSuche = (filter.suche.match(/[\p{L}\p{N}]+/gu) ?? [])
      .map((wort) => `${wort}:*`)
      .join(' & ');
    const treffer = await this.prisma.$queryRaw<
      {
        id: string;
        fotoFernUrl: string | null;
        fotoNahUrl: string | null;
        fotoDetailUrl: string | null;
        dokumentUrl: string | null;
        gesamt: bigint;
      }[]
    >`
      SELECT
        wareneintraege.id, wareneintraege.foto_fern_url AS "fotoFernUrl", wareneintraege.foto_nah_url AS "fotoNahUrl",
        wareneintraege.foto_detail_url AS "fotoDetailUrl", wareneintraege.dokument_url AS "dokumentUrl",
        wareneintraege.avv_code_id AS "avvCodeId",
        wareneintraege.freitext, wareneintraege.gewicht, wareneintraege.erfasst_von_id AS "erfasstVonId",
        wareneintraege.standort_id AS "standortId", wareneintraege.erstellt_am AS "erstelltAm",
        json_build_object('id', avv_codes.id, 'code', avv_codes.code, 'bezeichnung', avv_codes.bezeichnung) AS "avvCode",
        json_build_object('id', standorte.id, 'name', standorte.name) AS "standort",
        json_build_object('id', nutzer.id, 'vorname', nutzer.vorname, 'nachname', nutzer.nachname, 'email', nutzer.email, 'telefon', nutzer.telefon, 'position', nutzer.position) AS "erfasstVon",
        COUNT(*) OVER () AS "gesamt"
      FROM wareneintraege
      JOIN avv_codes ON avv_codes.id = wareneintraege.avv_code_id
      JOIN standorte ON standorte.id = wareneintraege.standort_id
      JOIN nutzer ON nutzer.id = wareneintraege.erfasst_von_id
      WHERE freitext_tsv @@ (
        websearch_to_tsquery('german', ${filter.suche})
        || to_tsquery('german', ${praefixSuche})
      )
      ${avvFilter}
      ${standortFilter}
      ${vonFilter}
      ${bisFilter}
      ORDER BY ${reihenfolge}wareneintraege.erstellt_am DESC, wareneintraege.id DESC
      LIMIT ${filter.proSeite} OFFSET ${filter.seite * filter.proSeite}
    `;
    return {
      treffer: treffer.map(
        ({ gesamt: _gesamt, ...wareneintrag }) => wareneintrag,
      ),
      gesamt: Number(treffer[0]?.gesamt ?? 0),
    };
  }

  async create(
    erfasstVonId: string,
    dto: CreateWareneintragDto,
    fotos: WareneintragDateien,
  ) {
    // Standort wird als Kopie des aktuellen Nutzer-Standorts geschrieben, nicht
    // nur über erfasstVonId live abgeleitet, siehe ADR-0004.
    const nutzer = await this.prisma.nutzer.findUniqueOrThrow({
      where: { id: erfasstVonId },
    });
    const [fotoFernUrl, fotoNahUrl, fotoDetailUrl, dokumentUrl] =
      await Promise.all([
        ladeFotoHoch(this.objectStorage, fotos.fotoFern),
        ladeFotoHoch(this.objectStorage, fotos.fotoNah),
        ladeFotoHoch(this.objectStorage, fotos.fotoDetail),
        ladeFotoHoch(this.objectStorage, fotos.dokument),
      ]);

    return this.prisma.wareneintrag.create({
      data: {
        fotoFernUrl,
        fotoNahUrl,
        fotoDetailUrl,
        dokumentUrl,
        avvCodeId: dto.avvCodeId,
        freitext: dto.freitext,
        gewicht: dto.gewicht?.trim() || null,
        erfasstVonId,
        standortId: nutzer.standortId,
      },
    });
  }

  async update(
    id: string,
    nutzerId: string,
    dto: UpdateWareneintragDto,
    fotos: WareneintragDateien,
  ) {
    const bestehend = await this.pruefeBesitz(id, nutzerId);

    // Altes Foto ersetzen: erst neues hochladen, dann altes im Objektspeicher
    // entfernen, um verwaiste Referenzen bei einem Fehlschlag zu vermeiden.
    const [fotoFernUrl, fotoNahUrl, fotoDetailUrl, dokumentUrl] =
      await Promise.all([
        this.ersetzeFoto(bestehend.fotoFernUrl, fotos.fotoFern),
        this.ersetzeFoto(bestehend.fotoNahUrl, fotos.fotoNah),
        this.ersetzeFoto(bestehend.fotoDetailUrl, fotos.fotoDetail),
        this.ersetzeFoto(bestehend.dokumentUrl, fotos.dokument),
      ]);

    // Ob die KI-Analyse nach neuen Fotos noch passt, entscheidet der Nutzer
    // per Rückfrage (Issue #104, löst das automatische Löschen aus #96 ab).
    // Vor dem Update, damit ein späterer Fehler sie nicht stehen lässt.
    if (dto.analyseLoeschen) await this.loescheAnalyse(id);

    return this.prisma.wareneintrag.update({
      where: { id },
      data: {
        avvCodeId: dto.avvCodeId,
        freitext: dto.freitext,
        gewicht: dto.gewicht?.trim() || null,
        fotoFernUrl,
        fotoNahUrl,
        fotoDetailUrl,
        dokumentUrl,
      },
    });
  }

  // Einzelne Datei sofort löschen, aus dem Bearbeiten-Dialog heraus (Issue #104).
  async entferneDatei(
    id: string,
    nutzerId: string,
    feld: EntfernbareDatei,
    analyseLoeschen = false,
  ) {
    const bestehend = await this.pruefeBesitz(id, nutzerId);
    if (analyseLoeschen) await this.loescheAnalyse(id);
    const aktualisiert = await this.prisma.wareneintrag.update({
      where: { id },
      data: { [`${feld}Url`]: null },
    });
    // Erst nach dem Update, damit der Eintrag nie auf ein fehlendes Objekt zeigt.
    const key = bestehend[`${feld}Url`];
    if (key) await this.objectStorage.deleteFoto(key);
    return aktualisiert;
  }

  private loescheAnalyse(wareneintragId: string) {
    return this.prisma.wareneintragAnalyse.deleteMany({
      where: { wareneintragId },
    });
  }

  private async ersetzeFoto(
    bestehenderKey: string | null,
    neuesFoto?: Express.Multer.File,
  ): Promise<string | null> {
    if (!neuesFoto) return bestehenderKey;
    const neuerKey = await ladeFotoHoch(this.objectStorage, neuesFoto);
    if (bestehenderKey) await this.objectStorage.deleteFoto(bestehenderKey);
    return neuerKey ?? null;
  }

  async remove(id: string, nutzerId: string) {
    const wareneintrag = await this.pruefeBesitz(id, nutzerId);
    await Promise.all(
      [
        wareneintrag.fotoFernUrl,
        wareneintrag.fotoNahUrl,
        wareneintrag.fotoDetailUrl,
        wareneintrag.dokumentUrl,
      ]
        .filter((key): key is string => key !== null)
        .map((key) => this.objectStorage.deleteFoto(key)),
    );
    return this.prisma.wareneintrag.delete({ where: { id } });
  }

  // Nur der erfassende Nutzer darf seinen eigenen Wareneintrag
  // bearbeiten/löschen (nicht mehr rollenbasiert, siehe CONTEXT.md).
  private async pruefeBesitz(id: string, nutzerId: string) {
    const wareneintrag = await this.prisma.wareneintrag.findUniqueOrThrow({
      where: { id },
    });
    if (wareneintrag.erfasstVonId !== nutzerId) {
      throw new ForbiddenException(
        'Nur der erfassende Nutzer darf diesen Wareneintrag ändern.',
      );
    }
    return wareneintrag;
  }
}
