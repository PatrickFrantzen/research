import { Injectable } from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import { Prisma } from '../generated/prisma/client.js';
import { ObjectStorageService } from '../object-storage/object-storage.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateWareneintragDto } from './dto/create-wareneintrag.dto.js';
import { UpdateWareneintragDto } from './dto/update-wareneintrag.dto.js';

// Nie den client-deklarierten MIME-Type an den Objektspeicher durchreichen:
// die Upload-Validierung prüft zwar die Magic Bytes, aber `foto.mimetype`
// bleibt trotzdem der ungeprüfte Header-Wert. Content-Type im Objektspeicher
// muss dem tatsächlichen Inhalt entsprechen (Issue #43).
async function erkannterBildTyp(buffer: Buffer, deklarierterTyp: string): Promise<string> {
  const erkannt = await fileTypeFromBuffer(buffer);
  return erkannt?.mime ?? deklarierterTyp;
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
        // fotoUrl ist in der DB nur der Object-Storage-Key (ADR-0003), keine
        // abrufbare URL. Erst hier, unmittelbar vor der Auslieferung an den
        // Client, in eine zeitlich begrenzt gültige URL übersetzen, statt den
        // Bucket öffentlich lesbar zu machen (Issue #45).
        fotoUrl: await this.objectStorage.getSignedUrl(wareneintrag.fotoUrl),
      })),
    );
    return { daten, gesamt };
  }

  private async listeAlle(filter: { avvCodeId?: string; seite: number; proSeite: number }) {
    const where = filter.avvCodeId ? { avvCodeId: filter.avvCodeId } : undefined;
    const [treffer, gesamt] = await Promise.all([
      this.prisma.wareneintrag.findMany({
        where,
        include: { avvCode: { select: { code: true } } },
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
    const treffer = await this.prisma.$queryRaw<{ id: string; fotoUrl: string; gesamt: bigint }[]>`
      SELECT
        wareneintraege.id, foto_url AS "fotoUrl", avv_code_id AS "avvCodeId", freitext,
        erfasst_von_id AS "erfasstVonId", standort_id AS "standortId", erstellt_am AS "erstelltAm",
        json_build_object('code', avv_codes.code) AS "avvCode",
        COUNT(*) OVER () AS "gesamt"
      FROM wareneintraege
      JOIN avv_codes ON avv_codes.id = wareneintraege.avv_code_id
      WHERE freitext_tsv @@ (
        websearch_to_tsquery('german', ${filter.suche})
        || to_tsquery('german', ${praefixSuche})
      )
      ${avvFilter}
      ORDER BY erstellt_am DESC, id DESC
      LIMIT ${filter.proSeite} OFFSET ${filter.seite * filter.proSeite}
    `;
    return {
      treffer: treffer.map(({ gesamt: _gesamt, ...wareneintrag }) => wareneintrag),
      gesamt: Number(treffer[0]?.gesamt ?? 0),
    };
  }

  async create(erfasstVonId: string, foto: Express.Multer.File, dto: CreateWareneintragDto) {
    // Standort wird als Kopie des aktuellen Nutzer-Standorts geschrieben, nicht
    // nur über erfasstVonId live abgeleitet, siehe ADR-0004.
    const nutzer = await this.prisma.nutzer.findUniqueOrThrow({ where: { id: erfasstVonId } });
    const fotoUrl = await this.objectStorage.uploadFoto(foto.buffer, await erkannterBildTyp(foto.buffer, foto.mimetype));

    return this.prisma.wareneintrag.create({
      data: {
        fotoUrl,
        avvCodeId: dto.avvCodeId,
        freitext: dto.freitext,
        erfasstVonId,
        standortId: nutzer.standortId,
      },
    });
  }

  async update(id: string, dto: UpdateWareneintragDto, foto?: Express.Multer.File) {
    if (!foto) {
      return this.prisma.wareneintrag.update({
        where: { id },
        data: { avvCodeId: dto.avvCodeId, freitext: dto.freitext },
      });
    }

    // Altes Foto ersetzen: erst neues hochladen, dann altes im Objektspeicher
    // entfernen, um verwaiste Referenzen bei einem Fehlschlag zu vermeiden.
    const bestehend = await this.prisma.wareneintrag.findUniqueOrThrow({ where: { id } });
    const fotoUrl = await this.objectStorage.uploadFoto(foto.buffer, await erkannterBildTyp(foto.buffer, foto.mimetype));
    await this.objectStorage.deleteFoto(bestehend.fotoUrl);

    return this.prisma.wareneintrag.update({
      where: { id },
      data: { avvCodeId: dto.avvCodeId, freitext: dto.freitext, fotoUrl },
    });
  }

  async remove(id: string) {
    const wareneintrag = await this.prisma.wareneintrag.findUniqueOrThrow({ where: { id } });
    await this.objectStorage.deleteFoto(wareneintrag.fotoUrl);
    return this.prisma.wareneintrag.delete({ where: { id } });
  }
}
