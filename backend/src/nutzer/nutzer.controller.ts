import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import type { AuthenticatedRequest } from '../auth/jwt.strategy.js';
import { Rolle } from '../generated/prisma/enums.js';
import { CreateMitarbeiterDto } from './dto/create-mitarbeiter.dto.js';
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
}
