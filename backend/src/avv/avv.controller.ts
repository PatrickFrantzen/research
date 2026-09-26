import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';

// AVV-Liste ist mit 834 Codes zu groß für ein einfaches Dropdown ohne Suche
// (Spezifikation Abschnitt 3.1) – Suche über Code und Bezeichnung, begrenzt
// auf eine für ein Auswahlfeld sinnvolle Trefferzahl.
const SUCHERGEBNIS_LIMIT = 50;

// Nur diese AVV-Kapitel kommen im Betrieb vor. Die übrigen Codes bleiben in
// der DB, damit ältere Wareneinträge weiter anzeigbar sind.
const ERLAUBTE_KAPITEL = ['15', '16', '17', '19', '20'];
const NUR_ERLAUBTE_KAPITEL = { OR: ERLAUBTE_KAPITEL.map((kapitel) => ({ code: { startsWith: `${kapitel} ` } })) };

@Controller('avv-codes')
@UseGuards(JwtAuthGuard)
export class AvvController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(@Query('suche') suche?: string) {
    return this.prisma.avvCode.findMany({
      where: {
        AND: [
          NUR_ERLAUBTE_KAPITEL,
          ...(suche
            ? [
                {
                  OR: [
                    { code: { contains: suche, mode: 'insensitive' as const } },
                    { bezeichnung: { contains: suche, mode: 'insensitive' as const } },
                  ],
                },
              ]
            : []),
        ],
      },
      orderBy: { code: 'asc' },
      take: SUCHERGEBNIS_LIMIT,
    });
  }
}
