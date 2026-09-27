import { Controller, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/jwt.strategy.js';
import { Aktivitaet } from '../protokoll/aktivitaet.decorator.js';
import { KiAnalyseService } from './ki-analyse.service.js';

// Jeder angemeldete Nutzer darf analysieren (Issue #93).
@Controller('wareneintraege/:id/ki-analyse')
@UseGuards(JwtAuthGuard)
export class KiAnalyseController {
  constructor(private readonly kiAnalyseService: KiAnalyseService) {}

  @Post()
  @HttpCode(200)
  @Aktivitaet('KI-Analyse')
  analysieren(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.kiAnalyseService.analysiere(id, request.user.id);
  }
}
