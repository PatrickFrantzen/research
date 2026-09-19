import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import type { AuthenticatedRequest } from '../auth/jwt.strategy.js';
import { Rolle } from '../generated/prisma/enums.js';
import { CreateWareneintragDto } from './dto/create-wareneintrag.dto.js';
import { UpdateWareneintragDto } from './dto/update-wareneintrag.dto.js';
import { WareneintragService } from './wareneintrag.service.js';

const FOTO_MAX_GROESSE_BYTES = 10 * 1024 * 1024; // 10 MB

// Enges Whitelisting statt `/^image\//`: verhindert riskante Subtypen wie
// image/svg+xml (kann Script enthalten) und erzwingt echte
// Magic-Number-Prüfung statt client-kontrolliertem MIME-Type (Issue #32).
const ERLAUBTE_FOTO_TYPEN = /^(image\/jpeg|image\/png|image\/webp)$/;

// Multer bricht den Stream ab, sobald das Limit überschritten wird, statt
// die komplette (potenziell riesige) Datei erst in den RAM zu puffern.
const FOTO_UPLOAD_OPTIONS = { storage: memoryStorage(), limits: { fileSize: FOTO_MAX_GROESSE_BYTES } };

function fotoValidators(fileIsRequired: boolean) {
  return new ParseFilePipe({
    fileIsRequired,
    validators: [
      // fallbackToMimetype: false – bei nicht erkennbarem Dateisignatur wird
      // abgelehnt statt dem client-kontrollierten MIME-Type zu vertrauen.
      new FileTypeValidator({ fileType: ERLAUBTE_FOTO_TYPEN, fallbackToMimetype: false }),
      new MaxFileSizeValidator({ maxSize: FOTO_MAX_GROESSE_BYTES }),
    ],
  });
}

@Controller('wareneintraege')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WareneintragController {
  constructor(private readonly wareneintragService: WareneintragService) {}

  @Get()
  @Roles(Rolle.VORGESETZTER)
  async findAll(@Query('avvCodeId') avvCodeId?: string, @Query('suche') suche?: string) {
    return this.wareneintragService.findAll({ avvCodeId, suche });
  }

  // Erfassen ist die Kernaufgabe des Mitarbeiters, aber auch der
  // Vorgesetzte darf im Vertretungsfall Wareneinträge anlegen (siehe
  // Frontend-Guard `kannWareneintragErfassenGuard`).
  @Post()
  @Roles(Rolle.MITARBEITER, Rolle.VORGESETZTER)
  @UseInterceptors(FileInterceptor('foto', FOTO_UPLOAD_OPTIONS))
  async create(
    @Req() request: AuthenticatedRequest,
    @UploadedFile(fotoValidators(true))
    foto: Express.Multer.File,
    @Body() dto: CreateWareneintragDto,
  ) {
    return this.wareneintragService.create(request.user.id, foto, dto);
  }

  @Patch(':id')
  @Roles(Rolle.VORGESETZTER)
  @UseInterceptors(FileInterceptor('foto', FOTO_UPLOAD_OPTIONS))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWareneintragDto,
    @UploadedFile(fotoValidators(false))
    foto?: Express.Multer.File,
  ) {
    return this.wareneintragService.update(id, dto, foto);
  }

  @Delete(':id')
  @Roles(Rolle.VORGESETZTER)
  async remove(@Param('id') id: string) {
    return this.wareneintragService.remove(id);
  }
}
