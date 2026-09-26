import { BadRequestException, Body, Controller, Get, Header, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/jwt.strategy.js';
import { AppFehlerDto } from './dto/app-fehler.dto.js';
import { DATUM, Protokoll, type ProtokollArt } from './protokoll.js';

const ARTEN: ProtokollArt[] = ['aktivitaet', 'fehler'];

@Controller('protokoll')
@UseGuards(JwtAuthGuard)
export class ProtokollController {
  constructor(private readonly protokoll: Protokoll) {}

  @Get()
  @UseGuards(AdminGuard)
  tage() {
    return { tage: this.protokoll.tage() };
  }

  @Get(':art/:datum')
  @UseGuards(AdminGuard)
  @Header('Content-Type', 'text/plain; charset=utf-8')
  lese(@Param('art') art: string, @Param('datum') datum: string): string {
    if (!ARTEN.includes(art as ProtokollArt) || !DATUM.test(datum)) {
      throw new BadRequestException('Unbekannte Log-Art oder ungültiges Datum.');
    }
    return this.protokoll.lese(art as ProtokollArt, datum) ?? '';
  }

  // Fehler, die nur in der App auftreten (z.B. abgelehntes Foto) und den
  // Server sonst nie erreichen. Nur eingeloggt, gegen anonymes Vollschreiben.
  @Post('app-fehler')
  @HttpCode(HttpStatus.NO_CONTENT)
  appFehler(@Req() request: AuthenticatedRequest, @Body() dto: AppFehlerDto): void {
    this.protokoll.fehler(['App', dto.seite, request.user.email, dto.meldung]);
  }
}
