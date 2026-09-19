import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { loadEnv } from '../config/env.js';
import { Rolle } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface JwtPayload {
  sub: string;
  rolle: Rolle;
}

export interface AuthenticatedUser {
  id: string;
  rolle: Rolle;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: loadEnv().auth.jwtSecret,
      // Explizit fixieren statt dem Default zu vertrauen: verhindert
      // Algorithm-Confusion-Angriffe (Issue #34).
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // Nutzer muss noch existieren, damit ein Token für einen gelöschten
    // Account nicht weiter funktioniert (Issue #34). Rolle kommt aus der DB,
    // nicht aus dem (potenziell veralteten) Token-Claim.
    const nutzer = await this.prisma.nutzer.findUnique({ where: { id: payload.sub } });
    if (!nutzer) {
      throw new UnauthorizedException();
    }
    return { id: nutzer.id, rolle: nutzer.rolle };
  }
}
