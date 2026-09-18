import { Injectable } from '@nestjs/common';
import { ObjectStorageService } from '../object-storage/object-storage.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateWareneintragDto } from './dto/create-wareneintrag.dto.js';

@Injectable()
export class WareneintragService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly objectStorage: ObjectStorageService,
  ) {}

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
}
