import {
  Controller,
  Delete,
  FileTypeValidator,
  HttpCode,
  ParseFilePipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/jwt.strategy.js';
import { Aktivitaet } from '../protokoll/aktivitaet.decorator.js';
import { ERLAUBTE_FOTO_TYPEN } from '../wareneintrag/wareneintrag.controller.js';
import { FotoAnalyseService } from './foto-analyse.service.js';
import { MAX_FOTOS_BYTES } from './ki-analyse.service.js';

// Genau ein Foto, keine weiteren Felder.
const FOTO_UPLOAD_OPTIONS = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_FOTOS_BYTES, files: 1, fields: 0, parts: 1 },
};

// Magic-Byte-Prüfung wie beim Wareneintrag (Issue #32).
const fotoPipe = () =>
  new ParseFilePipe({
    validators: [
      new FileTypeValidator({
        fileType: ERLAUBTE_FOTO_TYPEN,
        fallbackToMimetype: false,
      }),
    ],
  });

// Mobile Foto-Analyse (Issue #147), für jeden angemeldeten Nutzer.
@Controller('foto-analyse')
@UseGuards(JwtAuthGuard)
export class FotoAnalyseController {
  constructor(private readonly fotoAnalyseService: FotoAnalyseService) {}

  @Post()
  @HttpCode(200)
  @Aktivitaet('Foto-Analyse')
  @UseInterceptors(FileInterceptor('foto', FOTO_UPLOAD_OPTIONS))
  analysieren(
    @Req() request: AuthenticatedRequest,
    @UploadedFile(fotoPipe()) foto: Express.Multer.File,
  ) {
    return this.fotoAnalyseService.analysiere(
      { daten: foto.buffer, mimeType: foto.mimetype },
      request.user.id,
    );
  }

  @Delete()
  @HttpCode(204)
  async verwerfen(@Req() request: AuthenticatedRequest): Promise<void> {
    await this.fotoAnalyseService.verwerfe(request.user.id);
  }

  // Das Foto kommt erneut vom Client, das Ergebnis aus Redis.
  @Post('mail')
  @HttpCode(204)
  @Aktivitaet('Foto-Analyse per E-Mail gesendet')
  @UseInterceptors(FileInterceptor('foto', FOTO_UPLOAD_OPTIONS))
  async senden(
    @Req() request: AuthenticatedRequest,
    @UploadedFile(fotoPipe()) foto: Express.Multer.File,
  ): Promise<void> {
    await this.fotoAnalyseService.sende(
      { daten: foto.buffer, mimeType: foto.mimetype },
      request.user.id,
    );
  }
}
