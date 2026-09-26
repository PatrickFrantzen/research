import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import type { AuthenticatedRequest } from '../auth/jwt.strategy.js';
import { AKTIVITAET } from './aktivitaet.decorator.js';
import { Protokoll } from './protokoll.js';

@Injectable()
export class ProtokollInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ProtokollInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly protokoll: Protokoll,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const aktion = this.reflector.get<string | undefined>(AKTIVITAET, context.getHandler());
    if (!aktion) return next.handle();
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return next.handle().pipe(
      tap((antwort) => {
        const id = (antwort as { id?: string } | undefined)?.id ?? request.params['id'] ?? '-';
        try {
          this.protokoll.aktivitaet([request.user?.email ?? '-', aktion, String(id)]);
        } catch (error) {
          // Ein volles Log darf die eigentliche Aktion nicht scheitern lassen.
          this.logger.error(`Aktivität nicht protokolliert: ${String(error)}`);
        }
      }),
    );
  }
}
