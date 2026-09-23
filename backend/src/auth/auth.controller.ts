import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service.js';
import { ErlaubtMitInitialpasswort } from './erlaubt-mit-initialpasswort.js';
import { ACCESS_TOKEN_COOKIE, CSRF_COOKIE, erzeugeCsrfToken } from './auth-cookies.js';
import { LoginDto } from './dto/login.dto.js';
import { PasswortAendernDto } from './dto/passwort-aendern.dto.js';
import { PasswortSetzenDto } from './dto/passwort-setzen.dto.js';
import { PasswortVergessenDto } from './dto/passwort-vergessen.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import type { AuthenticatedRequest } from './jwt.strategy.js';

// Enger als das globale Limit, um Brute-Force/Credential-Stuffing und
// massenhaftes Auslösen von Passwort-Resets zu erschweren (Issue #31).
// AUTH_THROTTLE_LIMIT nur für den E2E-Test-Stack (frontend/e2e/stack.sh),
// der mehr Logins pro Minute braucht; produktiv bleibt es bei 5.
const AUTH_THROTTLE = { default: { limit: authThrottleLimit(), ttl: 60_000 } };

function authThrottleLimit(): number {
  const wert = process.env['AUTH_THROTTLE_LIMIT'];
  if (wert === undefined) return 5;
  const limit = Number(wert);
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error('AUTH_THROTTLE_LIMIT muss eine positive ganze Zahl sein.');
  }
  return limit;
}

function istProduktion(): boolean {
  return process.env['NODE_ENV'] === 'production';
}

// Path muss "/" sein, nicht auf "/api" eingeschränkt: die Cookie-Path-
// Regel gilt auch für document.cookie-Lesezugriffe, nicht nur für welche
// Requests den Cookie automatisch mitschicken. Die App läuft unter "/",
// mit Path=/api hätte das Frontend-JS das CSRF-Cookie nie sehen können.
// Kein maxAge/expires gesetzt: Session-Cookie, verschwindet beim
// Schließen des Browsers – entspricht dem bisherigen sessionStorage-Verhalten.
function setzeAuthCookies(res: Response, accessToken: string): void {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: istProduktion(),
    sameSite: 'strict',
    path: '/',
  });
  // Nicht HttpOnly: das Frontend-JS muss den Wert lesen können, um ihn als
  // CSRF-Header mitzuschicken (Double-Submit-Cookie-Pattern, Issue #24).
  res.cookie(CSRF_COOKIE, erzeugeCsrfToken(), {
    httpOnly: false,
    secure: istProduktion(),
    sameSite: 'strict',
    path: '/',
  });
}

function loescheAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_TOKEN_COOKIE, { path: '/' });
  res.clearCookie(CSRF_COOKIE, { path: '/' });
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle(AUTH_THROTTLE)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, mussPasswortSetzen, id } = await this.authService.login(dto.email, dto.passwort);
    setzeAuthCookies(res, accessToken);
    return { mussPasswortSetzen, id };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response): void {
    loescheAuthCookies(res);
  }

  // Liefert dem Frontend die ID des eingeloggten Nutzers (u.a. für
  // Besitz-Checks bei Wareneinträgen) – das JWT selbst ist HttpOnly und
  // damit für JS nicht lesbar (Issue #24).
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ErlaubtMitInitialpasswort()
  me(@Req() req: AuthenticatedRequest) {
    return { id: req.user.id, mussPasswortSetzen: req.user.mussPasswortSetzen };
  }

  // Pflicht-Passwortwechsel beim ersten Login (Issue #76). Setzt neue
  // Cookies, damit der Nutzer eingeloggt bleibt.
  @Post('passwort-aendern')
  @UseGuards(JwtAuthGuard)
  @ErlaubtMitInitialpasswort()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async passwortAendern(
    @Req() req: AuthenticatedRequest,
    @Body() dto: PasswortAendernDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const { accessToken } = await this.authService.passwortAendern(req.user.id, dto.neuesPasswort);
    setzeAuthCookies(res, accessToken);
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
