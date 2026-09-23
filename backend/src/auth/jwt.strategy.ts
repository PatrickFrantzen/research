import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { loadEnv } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ACCESS_TOKEN_COOKIE } from './auth-cookies.js';

// Token kommt aus dem HttpOnly-Cookie statt aus dem Authorization-Header,
// damit clientseitiges JS ihn nie zu Gesicht bekommt (Issue #24).
function extractJwtFromCookie(req: Request): string | null {
  return (req.cookies?.[ACCESS_TOKEN_COOKIE] as string | undefined) ?? null;
}

export interface JwtPayload {
  sub: string;
  // Von jsonwebtoken automatisch gesetzt (Sekunden seit Epoch), nicht selbst
  // signiert. Optional, da Tests/Fremdcode Payloads ohne iat konstruieren
  // können - siehe Vergleich unten.
  iat?: number;
}

export interface AuthenticatedUser {
  id: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: extractJwtFromCookie,
      secretOrKey: loadEnv().auth.jwtSecret,
      // Explizit fixieren statt dem Default zu vertrauen: verhindert
      // Algorithm-Confusion-Angriffe (Issue #34).
      algorithms: ['HS256'],
      // Nur Tokens akzeptieren, die von diesem Backend für dieses Frontend
      // ausgestellt wurden (Issue #34).
      issuer: loadEnv().auth.jwtIssuer,
      audience: loadEnv().auth.jwtAudience,
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
    // Token vor der letzten Passwortänderung ausgestellt? Dann ungültig,
    // auch wenn es noch nicht abgelaufen ist (Issue #40). Vergleich in ganzen
    // Sekunden, weil iat sekundengenau ist: sonst wäre ein Login in derselben
    // Sekunde wie das Passwort-Setzen sofort ungültig.
    if (payload.iat !== undefined && payload.iat < Math.floor(nutzer.passwortGeaendertAm.getTime() / 1000)) {
      throw new UnauthorizedException();
    }
    return { id: nutzer.id };
  }
}
