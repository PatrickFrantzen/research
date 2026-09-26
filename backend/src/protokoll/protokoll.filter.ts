import { ArgumentsHost, Catch, HttpException, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/jwt.strategy.js';
import { Protokoll } from './protokoll.js';

function grund(exception: unknown): string {
  if (exception instanceof HttpException) {
    const antwort = exception.getResponse();
    if (typeof antwort === 'string') return antwort;
    const message = (antwort as { message?: unknown }).message;
    return Array.isArray(message) ? message.join('; ') : String(message ?? exception.message);
  }
  return `Unerwarteter Fehler: ${exception instanceof Error ? exception.message : String(exception)}`;
}

// Schreibt jeden Fehler (4xx/5xx) ins Fehler-Log und überlässt die Antwort
// danach Nests Standardbehandlung. IP nur bei Login-Fehlern (ADR-0007).
@Catch()
export class ProtokollFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(ProtokollFilter.name);

  constructor(private readonly protokoll: Protokoll) {
    super();
  }

  override catch(exception: unknown, host: ArgumentsHost): void {
    try {
      this.protokolliere(exception, host);
    } catch (error) {
      this.logger.error(`Fehler nicht protokolliert: ${String(error)}`);
    }
    super.catch(exception, host);
  }

  private protokolliere(exception: unknown, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const pfad = request.originalUrl.split('?')[0];
    // Die App fragt beim Start ohne Login immer /auth/me ab: erwartet, kein Fehler.
    if (status === 401 && pfad.endsWith('/auth/me')) return;
    const felder = [String(status), `${request.method} ${pfad}`];
    if (pfad.endsWith('/auth/login')) {
      const email = String((request.body as { email?: unknown } | undefined)?.email ?? '-').slice(0, 200);
      felder.push(`versucht: ${email}`, grund(exception), `IP ${request.ip}`);
    } else {
      felder.push(request.user?.email ?? '-', grund(exception));
    }
    this.protokoll.fehler(felder);
  }
}
