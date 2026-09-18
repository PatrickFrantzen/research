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

@Controller('wareneintraege')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WareneintragController {
  constructor(private readonly wareneintragService: WareneintragService) {}

  @Get()
  @Roles(Rolle.VORGESETZTER)
  async findAll(@Query('avvCodeId') avvCodeId?: string, @Query('suche') suche?: string) {
    return this.wareneintragService.findAll({ avvCodeId, suche });
  }

  @Post()
  @Roles(Rolle.MITARBEITER)
  @UseInterceptors(FileInterceptor('foto', { storage: memoryStorage() }))
  async create(
    @Req() request: AuthenticatedRequest,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: /^image\//, fallbackToMimetype: true }),
          new MaxFileSizeValidator({ maxSize: FOTO_MAX_GROESSE_BYTES }),
        ],
      }),
    )
    foto: Express.Multer.File,
    @Body() dto: CreateWareneintragDto,
  ) {
    return this.wareneintragService.create(request.user.id, foto, dto);
  }

  @Patch(':id')
  @Roles(Rolle.VORGESETZTER)
  @UseInterceptors(FileInterceptor('foto', { storage: memoryStorage() }))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWareneintragDto,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new FileTypeValidator({ fileType: /^image\//, fallbackToMimetype: true }),
          new MaxFileSizeValidator({ maxSize: FOTO_MAX_GROESSE_BYTES }),
        ],
      }),
    )
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
