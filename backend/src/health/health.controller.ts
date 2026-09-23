import { Controller, Get, HttpStatus, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { HealthService } from './health.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  // Öffentlicher Liveness-Check: nur "läuft der Prozess", ohne
  // Infrastrukturdetails (Issue #37). Kein Abfragen von DB/Object Storage.
  @Get()
  liveness(@Res() res: Response): void {
    res.status(HttpStatus.OK).json({ status: 'ok' });
  }

  // Detaillierter Readiness-/Dependency-Check bleibt authentifizierten
  // Nutzern vorbehalten, statt öffentlich Infrastrukturdetails
  // preiszugeben (Issue #37).
  @Get('details')
  @UseGuards(JwtAuthGuard)
  async details(@Res() res: Response): Promise<void> {
    const result = await this.healthService.check();
    res.status(result.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json(result);
  }
}
