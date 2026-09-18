import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { ObjectStorageService } from '../object-storage/object-storage.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateWareneintragDto } from './dto/create-wareneintrag.dto.js';
import { UpdateWareneintragDto } from './dto/update-wareneintrag.dto.js';

@Injectable()
export class WareneintragService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly objectStorage: ObjectStorageService,
  ) {}

  async findAll(filter: { avvCodeId?: string; suche?: string }) {
    if (!filter.suche) {
      return this.prisma.wareneintrag.findMany({
        where: filter.avvCodeId ? { avvCodeId: filter.avvCodeId } : undefined,
        orderBy: { erstelltAm: 'desc' },
      });
    }

    // Volltextsuche über die generierte tsvector-Spalte (GIN-indiziert), kein
    // LIKE-Scan, siehe Issue #4.
    const avvFilter = filter.avvCodeId ? Prisma.sql`AND avv_code_id = ${filter.avvCodeId}` : Prisma.empty;
    return this.prisma.$queryRaw`
      SELECT
        id, foto_url AS "fotoUrl", avv_code_id AS "avvCodeId", freitext,
        erfasst_von_id AS "erfasstVonId", standort_id AS "standortId", erstellt_am AS "erstelltAm"
      FROM wareneintraege
      WHERE freitext_tsv @@ websearch_to_tsquery('german', ${filter.suche})
      ${avvFilter}
      ORDER BY erstellt_am DESC
    `;
  }

  async create(erfasstVonId: string, foto: Express.Multer.File, dto: CreateWareneintragDto) {
    // Standort wird als Kopie des aktuellen Nutzer-Standorts geschrieben, nicht
    // nur über erfasstVonId live abgeleitet, siehe ADR-0004.
    const nutzer = await this.prisma.nutzer.findUniqueOrThrow({ where: { id: erfasstVonId } });
    const fotoUrl = await this.objectStorage.uploadFoto(foto.buffer, foto.mimetype);

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
    const fotoUrl = await this.objectStorage.uploadFoto(foto.buffer, foto.mimetype);
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
