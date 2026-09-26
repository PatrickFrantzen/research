import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedRequest } from './jwt.strategy.js';

// Nach JwtAuthGuard einsetzen: istAdmin stammt aus der DB (JwtStrategy).
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (!context.switchToHttp().getRequest<AuthenticatedRequest>().user.istAdmin) {
      throw new ForbiddenException('Nur für Admins.');
    }
    return true;
  }
}
