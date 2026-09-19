import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service.js';
import { ACCESS_TOKEN_COOKIE, CSRF_COOKIE, erzeugeCsrfToken } from './auth-cookies.js';
import { LoginDto } from './dto/login.dto.js';
import { PasswortSetzenDto } from './dto/passwort-setzen.dto.js';
import { PasswortVergessenDto } from './dto/passwort-vergessen.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import type { AuthenticatedRequest } from './jwt.strategy.js';

// Enger als das globale Limit, um Brute-Force/Credential-Stuffing und
// massenhaftes Auslösen von Passwort-Resets zu erschweren (Issue #31).
const AUTH_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

function istProduktion(): boolean {
  return process.env['NODE_ENV'] === 'production';
}

// Kein maxAge/expires gesetzt: Session-Cookie, verschwindet beim
// Schließen des Browsers – entspricht dem bisherigen sessionStorage-Verhalten.
function setzeAuthCookies(res: Response, accessToken: string): void {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: istProduktion(),
    sameSite: 'strict',
    path: '/api',
  });
  // Nicht HttpOnly: das Frontend-JS muss den Wert lesen können, um ihn als
  // CSRF-Header mitzuschicken (Double-Submit-Cookie-Pattern, Issue #24).
  res.cookie(CSRF_COOKIE, erzeugeCsrfToken(), {
    httpOnly: false,
    secure: istProduktion(),
    sameSite: 'strict',
    path: '/api',
  });
}

function loescheAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_TOKEN_COOKIE, { path: '/api' });
  res.clearCookie(CSRF_COOKIE, { path: '/api' });
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle(AUTH_THROTTLE)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, mussPasswortSetzen, rolle } = await this.authService.login(dto.email, dto.passwort);
    setzeAuthCookies(res, accessToken);
    return { mussPasswortSetzen, rolle };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response): void {
    loescheAuthCookies(res);
  }

  // Liefert dem Frontend die Rolle des eingeloggten Nutzers – das JWT selbst
  // ist HttpOnly und damit für JS nicht lesbar (Issue #24).
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: AuthenticatedRequest) {
    return { rolle: req.user.rolle };
  }

  @Post('passwort-vergessen')
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async passwortVergessen(@Body() dto: PasswortVergessenDto): Promise<void> {
    await this.authService.passwortVergessen(dto.email);
  }

  @Post('passwort-setzen')
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async passwortSetzen(@Body() dto: PasswortSetzenDto): Promise<void> {
    await this.authService.passwortSetzen(dto.token, dto.neuesPasswort);
  }
}
