import {
  BadRequestException,
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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/jwt.strategy.js';
import { CreateWareneintragDto } from './dto/create-wareneintrag.dto.js';
import { UpdateWareneintragDto } from './dto/update-wareneintrag.dto.js';
import { WareneintragFotos, WareneintragService } from './wareneintrag.service.js';

const FOTO_MAX_GROESSE_BYTES = 10 * 1024 * 1024; // 10 MB
const STANDARD_PRO_SEITE = 20;
const MAX_PRO_SEITE = 100;

// Enges Whitelisting statt `/^image\//`: verhindert riskante Subtypen wie
// image/svg+xml (kann Script enthalten) und erzwingt echte
// Magic-Number-Prüfung statt client-kontrolliertem MIME-Type (Issue #32).
const ERLAUBTE_FOTO_TYPEN = /^(image\/jpeg|image\/png|image\/webp)$/;

// Multer bricht den Stream ab, sobald das Limit überschritten wird, statt
// die komplette (potenziell riesige) Datei erst in den RAM zu puffern.
const FOTO_UPLOAD_OPTIONS = { storage: memoryStorage(), limits: { fileSize: FOTO_MAX_GROESSE_BYTES } };

// Alle drei Ansichten sind optional – der Nutzer entscheidet selbst, wie
// viele Fotos er aufnimmt (0 bis 3), siehe CONTEXT.md.
const FOTO_FELDER = [
  { name: 'fotoFern', maxCount: 1 },
  { name: 'fotoNah', maxCount: 1 },
  { name: 'fotoDetail', maxCount: 1 },
];

interface HochgeladeneFotos {
  fotoFern?: Express.Multer.File[];
  fotoNah?: Express.Multer.File[];
  fotoDetail?: Express.Multer.File[];
}

function fotoValidators() {
  return new ParseFilePipe({
    fileIsRequired: false,
    validators: [
      // fallbackToMimetype: false – bei nicht erkennbarem Dateisignatur wird
      // abgelehnt statt dem client-kontrollierten MIME-Type zu vertrauen.
      new FileTypeValidator({ fileType: ERLAUBTE_FOTO_TYPEN, fallbackToMimetype: false }),
      new MaxFileSizeValidator({ maxSize: FOTO_MAX_GROESSE_BYTES }),
    ],
  });
}

// ParseFilePipe validiert nur ein einzelnes File oder ein flaches Array,
// nicht die benannte Feldstruktur, die FileFieldsInterceptor liefert
// (`{fotoFern: [File], ...}`) – deshalb hier manuell auf die tatsächlich
// hochgeladenen Dateien anwenden, statt es der Pipe direkt zu übergeben.
async function extrahiereUndValidiereFotos(dateien: HochgeladeneFotos): Promise<WareneintragFotos> {
  const fotoFern = dateien.fotoFern?.[0];
  const fotoNah = dateien.fotoNah?.[0];
  const fotoDetail = dateien.fotoDetail?.[0];
  const vorhandeneFotos = [fotoFern, fotoNah, fotoDetail].filter(
    (foto): foto is Express.Multer.File => foto !== undefined,
  );
  await fotoValidators().transform(vorhandeneFotos);
  return { fotoFern, fotoNah, fotoDetail };
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
  @UseInterceptors(FileFieldsInterceptor(FOTO_FELDER, FOTO_UPLOAD_OPTIONS))
  async create(
    @Req() request: AuthenticatedRequest,
    @UploadedFiles() dateien: HochgeladeneFotos,
    @Body() dto: CreateWareneintragDto,
  ) {
    const fotos = await extrahiereUndValidiereFotos(dateien);
    return this.wareneintragService.create(request.user.id, dto, fotos);
  }

  @Patch(':id')
  @UseInterceptors(FileFieldsInterceptor(FOTO_FELDER, FOTO_UPLOAD_OPTIONS))
  async update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateWareneintragDto,
    @UploadedFiles() dateien: HochgeladeneFotos,
  ) {
    const fotos = await extrahiereUndValidiereFotos(dateien);
    return this.wareneintragService.update(id, request.user.id, dto, fotos);
  }

  @Delete(':id')
  async remove(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.wareneintragService.remove(id, request.user.id);
  }
}
