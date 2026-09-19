import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { PasswortSetzenDto } from './dto/passwort-setzen.dto.js';
import { PasswortVergessenDto } from './dto/passwort-vergessen.dto.js';

// Enger als das globale Limit, um Brute-Force/Credential-Stuffing und
// massenhaftes Auslösen von Passwort-Resets zu erschweren (Issue #31).
const AUTH_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle(AUTH_THROTTLE)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.passwort);
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
