import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { loadEnv } from '../config/env.js';
import { Rolle } from '../generated/prisma/enums.js';

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
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: loadEnv().auth.jwtSecret,
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return { id: payload.sub, rolle: payload.rolle };
  }
}
