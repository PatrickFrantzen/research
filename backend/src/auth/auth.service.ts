import { randomBytes } from 'node:crypto';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Mailer } from '../mailer/mailer.js';
import { PrismaService } from '../prisma/prisma.service.js';

const PASSWORT_VERGESSEN_GUELTIGKEIT_MS = 60 * 60 * 1000; // 1 Stunde

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailer: Mailer,
  ) {}

  async login(email: string, passwort: string): Promise<{ accessToken: string; mussPasswortSetzen: boolean }> {
    const nutzer = await this.prisma.nutzer.findUnique({ where: { email } });
    if (!nutzer || !(await bcrypt.compare(passwort, nutzer.passwortHash))) {
      throw new UnauthorizedException('E-Mail oder Passwort ungültig.');
    }

    const accessToken = await this.jwtService.signAsync({ sub: nutzer.id, rolle: nutzer.rolle });
    return { accessToken, mussPasswortSetzen: nutzer.mussPasswortSetzen };
  }

  async passwortVergessen(email: string): Promise<void> {
    const nutzer = await this.prisma.nutzer.findUnique({ where: { email } });
    // Existenz des Accounts nicht per Antwortzeit/Fehler verraten.
    if (!nutzer) {
      return;
    }

    const token = randomBytes(32).toString('hex');
    await this.prisma.nutzer.update({
      where: { id: nutzer.id },
      data: {
        passwortSetzenToken: token,
        passwortSetzenTokenAblauf: new Date(Date.now() + PASSWORT_VERGESSEN_GUELTIGKEIT_MS),
      },
    });

    await this.mailer.sendPasswortSetzenLink(email, `/passwort-setzen?token=${token}`);
  }

  async passwortSetzen(token: string, neuesPasswort: string): Promise<void> {
    const nutzer = await this.prisma.nutzer.findUnique({ where: { passwortSetzenToken: token } });
    if (!nutzer || !nutzer.passwortSetzenTokenAblauf || nutzer.passwortSetzenTokenAblauf < new Date()) {
      throw new BadRequestException('Link ist ungültig oder abgelaufen.');
    }

    const passwortHash = await bcrypt.hash(neuesPasswort, 12);
    await this.prisma.nutzer.update({
      where: { id: nutzer.id },
      data: {
        passwortHash,
        mussPasswortSetzen: false,
        passwortSetzenToken: null,
        passwortSetzenTokenAblauf: null,
      },
    });
  }
}
