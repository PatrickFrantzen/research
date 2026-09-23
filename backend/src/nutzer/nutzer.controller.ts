import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/jwt.strategy.js';
import { CreateNutzerDto } from './dto/create-nutzer.dto.js';
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

  @Get('me')
  async me(@Req() request: AuthenticatedRequest) {
    return this.nutzerService.findEigeneDaten(request.user.id);
  }

  @Patch('me')
  async updateMe(@Req() request: AuthenticatedRequest, @Body() dto: UpdateEigeneDatenDto) {
    return this.nutzerService.updateEigeneDaten(request.user.id, dto);
  }
}
