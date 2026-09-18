import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('standorte')
@UseGuards(JwtAuthGuard)
export class StandortController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll() {
    return this.prisma.standort.findMany({ orderBy: { name: 'asc' } });
  }
}
