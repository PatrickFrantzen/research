import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('standorte')
@UseGuards(JwtAuthGuard)
export class StandortController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(@Query('nurMitEintraegen') nurMitEintraegen?: string) {
    return this.prisma.standort.findMany({
      where: nurMitEintraegen === 'true' ? { wareneintraege: { some: {} } } : undefined,
      orderBy: { name: 'asc' },
    });
  }
}
