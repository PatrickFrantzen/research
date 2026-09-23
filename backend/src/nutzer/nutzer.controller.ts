import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/jwt.strategy.js';
import { CreateNutzerDto } from './dto/create-nutzer.dto.js';
import { PasswortZuruecksetzenDto } from './dto/passwort-zuruecksetzen.dto.js';
import { UpdateEigeneDatenDto } from './dto/update-eigene-daten.dto.js';
import { NutzerService } from './nutzer.service.js';

@Controller('nutzer')
@UseGuards(JwtAuthGuard)
export class NutzerController {
  constructor(private readonly nutzerService: NutzerService) {}

  @Post()
  async createNutzer(@Req() request: AuthenticatedRequest, @Body() dto: CreateNutzerDto) {
    return this.nutzerService.createNutzer(request.user.id, dto);
  }

  @Get()
  async findAlle() {
    return this.nutzerService.findAlle();
  }

  @Post(':id/passwort-zuruecksetzen')
  @HttpCode(HttpStatus.NO_CONTENT)
  async passwortZuruecksetzen(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PasswortZuruecksetzenDto,
  ): Promise<void> {
    await this.nutzerService.passwortZuruecksetzen(request.user.id, id, dto.passwort);
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
