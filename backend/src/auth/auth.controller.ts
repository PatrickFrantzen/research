import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { PasswortSetzenDto } from './dto/passwort-setzen.dto.js';
import { PasswortVergessenDto } from './dto/passwort-vergessen.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.passwort);
  }

  @Post('passwort-vergessen')
  @HttpCode(HttpStatus.NO_CONTENT)
  async passwortVergessen(@Body() dto: PasswortVergessenDto): Promise<void> {
    await this.authService.passwortVergessen(dto.email);
  }

  @Post('passwort-setzen')
  @HttpCode(HttpStatus.NO_CONTENT)
  async passwortSetzen(@Body() dto: PasswortSetzenDto): Promise<void> {
    await this.authService.passwortSetzen(dto.token, dto.neuesPasswort);
  }
}
