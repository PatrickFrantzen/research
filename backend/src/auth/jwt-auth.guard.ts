import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { csrfIstGueltig } from './csrf.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const istAuthentifiziert = (await super.canActivate(context)) as boolean;
    if (!istAuthentifiziert) {
      return false;
    }

    // Cookie-basierte Auth heißt: der Browser schickt den Access-Token bei
    // JEDEM Request automatisch mit, auch von fremden Seiten ausgelöst.
    // Der Double-Submit-CSRF-Check verhindert, dass eine fremde Seite
    // state-changing Requests im Namen des eingeloggten Nutzers auslöst
    // (Issue #24).
    const request = context.switchToHttp().getRequest<Request>();
    if (!csrfIstGueltig(request)) {
      throw new ForbiddenException('CSRF-Token fehlt oder ungültig.');
    }
    return true;
  }
}
