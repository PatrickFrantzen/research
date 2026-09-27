import {
  BadRequestException,
  Body,
  CallHandler,
  Controller,
  Delete,
  ExecutionContext,
  FileTypeValidator,
  Get,
  Injectable,
  NestInterceptor,
  Param,
  ParseFilePipe,
  Patch,
  PayloadTooLargeException,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { catchError, throwError } from 'rxjs';
import { uploadMaxMb } from '../config/env.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Aktivitaet } from '../protokoll/aktivitaet.decorator.js';
import type { AuthenticatedRequest } from '../auth/jwt.strategy.js';
import { CreateWareneintragDto } from './dto/create-wareneintrag.dto.js';
import { UpdateWareneintragDto } from './dto/update-wareneintrag.dto.js';
import { WareneintragDateien, WareneintragService } from './wareneintrag.service.js';

const UPLOAD_MAX_MB = uploadMaxMb();
const STANDARD_PRO_SEITE = 20;
const MAX_PRO_SEITE = 100;

// Enges Whitelisting statt `/^image\//`: verhindert riskante Subtypen wie
// image/svg+xml (kann Script enthalten) und erzwingt echte
// Magic-Number-Prüfung statt client-kontrolliertem MIME-Type (Issue #32).
const ERLAUBTE_FOTO_TYPEN = /^(image\/jpeg|image\/png|image\/webp)$/;
const ERLAUBTER_DOKUMENT_TYP = /^application\/pdf$/;

// Multer bricht den Stream ab, sobald ein Limit überschritten wird, statt
// die komplette (potenziell riesige) Anfrage erst in den RAM zu puffern.
// Neben der Dateigröße sind auch Anzahl und Größe der Textfelder begrenzt,
// sonst puffert multer beliebig viele Felder à 1 MiB (Security-Audit run-1).
const FOTO_UPLOAD_OPTIONS = {
  storage: memoryStorage(),
  limits: {
    fileSize: UPLOAD_MAX_MB * 1024 * 1024,
    files: 4,
    fields: 5,
    fieldSize: 16 * 1024, // Freitext max. 2000 Zeichen à max. 4 Byte UTF-8
    parts: 9,
  },
};

// Alle drei Ansichten sind optional – der Nutzer entscheidet selbst, wie
// viele Fotos er aufnimmt (0 bis 3), siehe CONTEXT.md.
const FOTO_FELDER = [
  { name: 'fotoFern', maxCount: 1 },
  { name: 'fotoNah', maxCount: 1 },
  { name: 'fotoDetail', maxCount: 1 },
  // Optionales PDF, z. B. Lieferschein (Issue #103).
  { name: 'dokument', maxCount: 1 },
];

// Multer meldet eine zu große Datei nur als "File too large". Die App zeigt
// Backend-Meldungen direkt an, daher hier mit dem konfigurierten Limit.
// Muss vor dem FileFieldsInterceptor stehen, um dessen Fehler zu sehen.
@Injectable()
class VerstaendlicheGroessenMeldung implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      catchError((error: unknown) =>
        throwError(() =>
          error instanceof PayloadTooLargeException && error.message === 'File too large'
            ? new PayloadTooLargeException(`Datei ist größer als ${UPLOAD_MAX_MB} MB.`)
            : error,
        ),
      ),
    );
  }
}

interface HochgeladeneDateien {
  fotoFern?: Express.Multer.File[];
  fotoNah?: Express.Multer.File[];
  fotoDetail?: Express.Multer.File[];
  dokument?: Express.Multer.File[];
}

function typValidator(fileType: RegExp) {
  return new ParseFilePipe({
    fileIsRequired: false,
    validators: [
      // fallbackToMimetype: false – bei nicht erkennbarem Dateisignatur wird
      // abgelehnt statt dem client-kontrollierten MIME-Type zu vertrauen.
      new FileTypeValidator({ fileType, fallbackToMimetype: false }),
    ],
  });
}

// ParseFilePipe validiert nur ein einzelnes File oder ein flaches Array,
// nicht die benannte Feldstruktur, die FileFieldsInterceptor liefert
// (`{fotoFern: [File], ...}`) – deshalb hier manuell auf die tatsächlich
// hochgeladenen Dateien anwenden, statt es der Pipe direkt zu übergeben.
async function extrahiereUndValidiereDateien(dateien: HochgeladeneDateien): Promise<WareneintragDateien> {
  const fotoFern = dateien.fotoFern?.[0];
  const fotoNah = dateien.fotoNah?.[0];
  const fotoDetail = dateien.fotoDetail?.[0];
  const dokument = dateien.dokument?.[0];
  const vorhandeneFotos = [fotoFern, fotoNah, fotoDetail].filter(
    (foto): foto is Express.Multer.File => foto !== undefined,
  );
  await typValidator(ERLAUBTE_FOTO_TYPEN).transform(vorhandeneFotos);
  if (dokument) await typValidator(ERLAUBTER_DOKUMENT_TYP).transform(dokument);
  return { fotoFern, fotoNah, fotoDetail, dokument };
}

@Controller('wareneintraege')
@UseGuards(JwtAuthGuard)
export class WareneintragController {
  constructor(private readonly wareneintragService: WareneintragService) {}

  @Get()
  async findAll(
    @Query('avvCodeId') avvCodeId?: string,
    @Query('suche') suche?: string,
    @Query('seite') seite?: string,
    @Query('proSeite') proSeite?: string,
    @Query('standortId') standortId?: string,
  ) {
    const seitenNummer = this.parseGanzeZahl(seite, 0, 0, Number.MAX_SAFE_INTEGER, 'seite');
    const eintraegeProSeite = this.parseGanzeZahl(proSeite, STANDARD_PRO_SEITE, 1, MAX_PRO_SEITE, 'proSeite');
    return this.wareneintragService.findAll({
      avvCodeId,
      standortId,
      suche,
      seite: seitenNummer,
      proSeite: eintraegeProSeite,
    });
  }

  private parseGanzeZahl(wert: string | undefined, standardwert: number, minimum: number, maximum: number, name: string) {
    if (wert === undefined) return standardwert;
    const zahl = Number(wert);
    if (!Number.isInteger(zahl) || zahl < minimum || zahl > maximum) {
      throw new BadRequestException(`${name} muss eine ganze Zahl zwischen ${minimum} und ${maximum} sein.`);
    }
    return zahl;
  }

  @Post()
  @Aktivitaet('Wareneintrag erstellt')
  @UseInterceptors(VerstaendlicheGroessenMeldung, FileFieldsInterceptor(FOTO_FELDER, FOTO_UPLOAD_OPTIONS))
  async create(
    @Req() request: AuthenticatedRequest,
    @UploadedFiles() dateien: HochgeladeneDateien,
    @Body() dto: CreateWareneintragDto,
  ) {
    return this.wareneintragService.create(request.user.id, dto, await extrahiereUndValidiereDateien(dateien));
  }

  @Patch(':id')
  @Aktivitaet('Wareneintrag geändert')
  @UseInterceptors(VerstaendlicheGroessenMeldung, FileFieldsInterceptor(FOTO_FELDER, FOTO_UPLOAD_OPTIONS))
  async update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateWareneintragDto,
    @UploadedFiles() dateien: HochgeladeneDateien,
  ) {
    return this.wareneintragService.update(id, request.user.id, dto, await extrahiereUndValidiereDateien(dateien));
  }

  @Delete(':id')
  @Aktivitaet('Wareneintrag gelöscht')
  async remove(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.wareneintragService.remove(id, request.user.id);
  }
}
