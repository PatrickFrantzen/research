import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/jwt.strategy.js';
import { CreateNutzerDto } from './dto/create-nutzer.dto.js';
import { UpdateEigeneDatenDto } from './dto/update-eigene-daten.dto.js';
import { NutzerService } from './nutzer.service.js';

@Controller('nutzer')
@UseGuards(JwtAuthGuard)
export class NutzerController {
  constructor(private readonly nutzerService: NutzerService) {}

  @Get()
  @UseGuards(AdminGuard)
  async list() {
    return this.nutzerService.listNutzer();
  }

  @Post()
  @UseGuards(AdminGuard)
  async createNutzer(@Req() request: AuthenticatedRequest, @Body() dto: CreateNutzerDto) {
    return this.nutzerService.createNutzer(request.user.id, dto);
  }

  @Post(':id/passwort-link')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async sendePasswortLink(@Param('id') id: string): Promise<void> {
    await this.nutzerService.sendePasswortLink(id);
  }

  @Get('me')
  async me(@Req() request: AuthenticatedRequest) {
    return this.nutzerService.findEigeneDaten(request.user.id);
  }

  @Patch('me')
  async updateMe(@Req() request: AuthenticatedRequest, @Body() dto: UpdateEigeneDatenDto) {
    return this.nutzerService.updateEigeneDaten(request.user.id, dto);
  }
}
