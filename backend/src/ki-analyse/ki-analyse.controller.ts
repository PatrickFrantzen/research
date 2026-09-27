import { Controller, Get, HttpCode, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/jwt.strategy.js';
import { Aktivitaet } from '../protokoll/aktivitaet.decorator.js';
import { KiAnalyseService } from './ki-analyse.service.js';

// Jeder angemeldete Nutzer darf analysieren (Issue #93).
@Controller('wareneintraege/:id/ki-analyse')
@UseGuards(JwtAuthGuard)
export class KiAnalyseController {
  constructor(private readonly kiAnalyseService: KiAnalyseService) {}

  // Gespeicherte Analyse oder null, falls der Eintrag noch keine hat.
  @Get()
  gespeicherte(@Param('id') id: string) {
    return this.kiAnalyseService.gespeicherte(id);
  }

  // Speichert die Vorschau des Nutzers aus Redis, nie Werte aus dem Body.
  @Put()
  @Aktivitaet('KI-Analyse gespeichert')
  speichern(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.kiAnalyseService.speichern(id, request.user.id);
  }

  @Post()
  @HttpCode(200)
  @Aktivitaet('KI-Analyse')
  analysieren(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.kiAnalyseService.analysiere(id, request.user.id);
  }
}
