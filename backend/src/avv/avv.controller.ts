import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';

// AVV-Liste ist mit 834 Codes zu groß für ein einfaches Dropdown ohne Suche
// (Spezifikation Abschnitt 3.1) – Suche über Code und Bezeichnung, begrenzt
// auf eine für ein Auswahlfeld sinnvolle Trefferzahl.
const SUCHERGEBNIS_LIMIT = 50;

@Controller('avv-codes')
@UseGuards(JwtAuthGuard)
export class AvvController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(@Query('suche') suche?: string) {
    return this.prisma.avvCode.findMany({
      where: suche
        ? {
            OR: [
              { code: { contains: suche, mode: 'insensitive' } },
              { bezeichnung: { contains: suche, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { code: 'asc' },
      take: SUCHERGEBNIS_LIMIT,
    });
  }
}
