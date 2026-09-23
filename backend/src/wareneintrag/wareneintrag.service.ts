import { ForbiddenException, Injectable } from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import { Prisma } from '../generated/prisma/client.js';
import { ObjectStorageService } from '../object-storage/object-storage.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateWareneintragDto } from './dto/create-wareneintrag.dto.js';
import { UpdateWareneintragDto } from './dto/update-wareneintrag.dto.js';

export interface WareneintragFotos {
  fotoFern?: Express.Multer.File;
  fotoNah?: Express.Multer.File;
  fotoDetail?: Express.Multer.File;
}

// Nie den client-deklarierten MIME-Type an den Objektspeicher durchreichen:
// die Upload-Validierung prüft zwar die Magic Bytes, aber `foto.mimetype`
// bleibt trotzdem der ungeprüfte Header-Wert. Content-Type im Objektspeicher
// muss dem tatsächlichen Inhalt entsprechen (Issue #43).
async function erkannterBildTyp(buffer: Buffer, deklarierterTyp: string): Promise<string> {
  const erkannt = await fileTypeFromBuffer(buffer);
  return erkannt?.mime ?? deklarierterTyp;
}

async function ladeFotoHoch(objectStorage: ObjectStorageService, foto?: Express.Multer.File): Promise<string | undefined> {
  if (!foto) return undefined;
  return objectStorage.uploadFoto(foto.buffer, await erkannterBildTyp(foto.buffer, foto.mimetype));
}

@Injectable()
export class WareneintragService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly objectStorage: ObjectStorageService,
  ) {}

  async findAll(filter: { avvCodeId?: string; suche?: string; seite?: number; proSeite?: number }) {
    const { suche, avvCodeId, seite = 0, proSeite = 20 } = filter;
    const { treffer, gesamt } = suche
      ? await this.sucheMitVolltext({ avvCodeId, suche, seite, proSeite })
      : await this.listeAlle({ avvCodeId, seite, proSeite });
    const daten = await Promise.all(
      treffer.map(async (wareneintrag) => ({
        ...wareneintrag,
        // *Url sind in der DB nur Object-Storage-Keys (ADR-0003), keine
        // abrufbaren URLs. Erst hier, unmittelbar vor der Auslieferung an den
        // Client, in zeitlich begrenzt gültige URLs übersetzen, statt den
        // Bucket öffentlich lesbar zu machen (Issue #45). Fehlende Fotos
        // (optional, siehe CONTEXT.md) bleiben null.
        fotoFernUrl: wareneintrag.fotoFernUrl ? await this.objectStorage.getSignedUrl(wareneintrag.fotoFernUrl) : null,
        fotoNahUrl: wareneintrag.fotoNahUrl ? await this.objectStorage.getSignedUrl(wareneintrag.fotoNahUrl) : null,
        fotoDetailUrl: wareneintrag.fotoDetailUrl
          ? await this.objectStorage.getSignedUrl(wareneintrag.fotoDetailUrl)
          : null,
      })),
    );
    return { daten, gesamt };
  }

  private async listeAlle(filter: { avvCodeId?: string; seite: number; proSeite: number }) {
    const where = filter.avvCodeId ? { avvCodeId: filter.avvCodeId } : undefined;
    const [treffer, gesamt] = await Promise.all([
      this.prisma.wareneintrag.findMany({
        where,
        include: {
          avvCode: { select: { id: true, code: true, bezeichnung: true } },
          standort: { select: { id: true, name: true } },
          erfasstVon: { select: { id: true, vorname: true, nachname: true } },
        },
        orderBy: [{ erstelltAm: 'desc' }, { id: 'desc' }],
        skip: filter.seite * filter.proSeite,
        take: filter.proSeite,
      }),
      this.prisma.wareneintrag.count({ where }),
    ]);
    return { treffer, gesamt };
  }

  // Volltextsuche über die generierte tsvector-Spalte (GIN-indiziert), kein
  // LIKE-Scan, siehe Issue #4.
  private async sucheMitVolltext(filter: { avvCodeId?: string; suche: string; seite: number; proSeite: number }) {
    const avvFilter = filter.avvCodeId ? Prisma.sql`AND avv_code_id = ${filter.avvCodeId}` : Prisma.empty;
    const praefixSuche = (filter.suche.match(/[\p{L}\p{N}]+/gu) ?? []).map((wort) => `${wort}:*`).join(' & ');
    const treffer = await this.prisma.$queryRaw<
      { id: string; fotoFernUrl: string | null; fotoNahUrl: string | null; fotoDetailUrl: string | null; gesamt: bigint }[]
    >`
      SELECT
        wareneintraege.id, wareneintraege.foto_fern_url AS "fotoFernUrl", wareneintraege.foto_nah_url AS "fotoNahUrl",
        wareneintraege.foto_detail_url AS "fotoDetailUrl", wareneintraege.avv_code_id AS "avvCodeId",
        wareneintraege.freitext, wareneintraege.erfasst_von_id AS "erfasstVonId",
        wareneintraege.standort_id AS "standortId", wareneintraege.erstellt_am AS "erstelltAm",
        json_build_object('id', avv_codes.id, 'code', avv_codes.code, 'bezeichnung', avv_codes.bezeichnung) AS "avvCode",
        json_build_object('id', standorte.id, 'name', standorte.name) AS "standort",
        json_build_object('id', nutzer.id, 'vorname', nutzer.vorname, 'nachname', nutzer.nachname) AS "erfasstVon",
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
      ORDER BY wareneintraege.erstellt_am DESC, wareneintraege.id DESC
      LIMIT ${filter.proSeite} OFFSET ${filter.seite * filter.proSeite}
    `;
    return {
      treffer: treffer.map(({ gesamt: _gesamt, ...wareneintrag }) => wareneintrag),
      gesamt: Number(treffer[0]?.gesamt ?? 0),
    };
  }

  async create(erfasstVonId: string, dto: CreateWareneintragDto, fotos: WareneintragFotos) {
    // Standort wird als Kopie des aktuellen Nutzer-Standorts geschrieben, nicht
    // nur über erfasstVonId live abgeleitet, siehe ADR-0004.
    const nutzer = await this.prisma.nutzer.findUniqueOrThrow({ where: { id: erfasstVonId } });
    const [fotoFernUrl, fotoNahUrl, fotoDetailUrl] = await Promise.all([
      ladeFotoHoch(this.objectStorage, fotos.fotoFern),
      ladeFotoHoch(this.objectStorage, fotos.fotoNah),
      ladeFotoHoch(this.objectStorage, fotos.fotoDetail),
    ]);

    return this.prisma.wareneintrag.create({
      data: {
        fotoFernUrl,
        fotoNahUrl,
        fotoDetailUrl,
        avvCodeId: dto.avvCodeId,
        freitext: dto.freitext,
        erfasstVonId,
        standortId: nutzer.standortId,
      },
    });
  }

  async update(id: string, nutzerId: string, dto: UpdateWareneintragDto, fotos: WareneintragFotos) {
    const bestehend = await this.pruefeBesitz(id, nutzerId);

    // Altes Foto ersetzen: erst neues hochladen, dann altes im Objektspeicher
    // entfernen, um verwaiste Referenzen bei einem Fehlschlag zu vermeiden.
    const [fotoFernUrl, fotoNahUrl, fotoDetailUrl] = await Promise.all([
      this.ersetzeFoto(bestehend.fotoFernUrl, fotos.fotoFern),
      this.ersetzeFoto(bestehend.fotoNahUrl, fotos.fotoNah),
      this.ersetzeFoto(bestehend.fotoDetailUrl, fotos.fotoDetail),
    ]);

    return this.prisma.wareneintrag.update({
      where: { id },
      data: { avvCodeId: dto.avvCodeId, freitext: dto.freitext, fotoFernUrl, fotoNahUrl, fotoDetailUrl },
    });
  }

  private async ersetzeFoto(bestehenderKey: string | null, neuesFoto?: Express.Multer.File): Promise<string | null> {
    if (!neuesFoto) return bestehenderKey;
    const neuerKey = await ladeFotoHoch(this.objectStorage, neuesFoto);
    if (bestehenderKey) await this.objectStorage.deleteFoto(bestehenderKey);
    return neuerKey ?? null;
  }

  async remove(id: string, nutzerId: string) {
    const wareneintrag = await this.pruefeBesitz(id, nutzerId);
    await Promise.all(
      [wareneintrag.fotoFernUrl, wareneintrag.fotoNahUrl, wareneintrag.fotoDetailUrl]
        .filter((key): key is string => key !== null)
        .map((key) => this.objectStorage.deleteFoto(key)),
    );
    return this.prisma.wareneintrag.delete({ where: { id } });
  }

  // Nur der erfassende Nutzer darf seinen eigenen Wareneintrag
  // bearbeiten/löschen (nicht mehr rollenbasiert, siehe CONTEXT.md).
  private async pruefeBesitz(id: string, nutzerId: string) {
    const wareneintrag = await this.prisma.wareneintrag.findUniqueOrThrow({ where: { id } });
    if (wareneintrag.erfasstVonId !== nutzerId) {
      throw new ForbiddenException('Nur der erfassende Nutzer darf diesen Wareneintrag ändern.');
    }
    return wareneintrag;
  }
}
