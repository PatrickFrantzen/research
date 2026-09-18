import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import type { AuthenticatedRequest } from '../auth/jwt.strategy.js';
import { Rolle } from '../generated/prisma/enums.js';
import { CreateMitarbeiterDto } from './dto/create-mitarbeiter.dto.js';
import { UpdateEigeneDatenDto } from './dto/update-eigene-daten.dto.js';
import { NutzerService } from './nutzer.service.js';

@Controller('nutzer')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NutzerController {
  constructor(private readonly nutzerService: NutzerService) {}

  @Post()
  @Roles(Rolle.VORGESETZTER)
  async createMitarbeiter(@Req() request: AuthenticatedRequest, @Body() dto: CreateMitarbeiterDto) {
    return this.nutzerService.createMitarbeiter(request.user.id, dto);
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
