import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Mailer } from '../mailer/mailer.js';
import { normalisiereEmail } from '../nutzer/email.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { erzeugePasswortSetzenToken, hashPasswortSetzenToken } from './passwort-setzen-token.js';

const PASSWORT_VERGESSEN_GUELTIGKEIT_MS = 60 * 60 * 1000; // 1 Stunde

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailer: Mailer,
  ) {}

  async login(
    email: string,
    passwort: string,
  ): Promise<{ accessToken: string; mussPasswortSetzen: boolean; id: string; istAdmin: boolean }> {
    const nutzer = await this.prisma.nutzer.findUnique({ where: { email: normalisiereEmail(email) } });
    if (!nutzer || !(await bcrypt.compare(passwort, nutzer.passwortHash))) {
      throw new UnauthorizedException('E-Mail oder Passwort ungültig.');
    }

    const accessToken = await this.jwtService.signAsync({ sub: nutzer.id });
    return { accessToken, mussPasswortSetzen: nutzer.mussPasswortSetzen, id: nutzer.id, istAdmin: nutzer.istAdmin };
  }

  async passwortVergessen(rohEmail: string): Promise<void> {
    const email = normalisiereEmail(rohEmail);
    const nutzer = await this.prisma.nutzer.findUnique({ where: { email } });
    // Existenz des Accounts nicht per Antwortzeit/Fehler verraten.
    if (!nutzer) {
      return;
    }
    // Ein noch gültiger Initial-Zugang-Link darf nicht anonym ersetzt werden:
    // der neue Link wird (noch) nicht zugestellt, der Einladungslink wäre
    // damit tot und das Konto ließe sich nicht mehr aktivieren (Security-Audit run-1).
    if (nutzer.mussPasswortSetzen && nutzer.passwortSetzenTokenAblauf && nutzer.passwortSetzenTokenAblauf > new Date()) {
      return;
    }

    const { rawToken, hashedToken } = erzeugePasswortSetzenToken();
    await this.prisma.nutzer.update({
      where: { id: nutzer.id },
      data: {
        passwortSetzenToken: hashedToken,
        passwortSetzenTokenAblauf: new Date(Date.now() + PASSWORT_VERGESSEN_GUELTIGKEIT_MS),
      },
    });

    await this.mailer.sendPasswortSetzenLink(email, `/passwort-setzen?token=${rawToken}`);
  }

  async passwortSetzen(token: string, neuesPasswort: string): Promise<void> {
    const nutzer = await this.prisma.nutzer.findUnique({
      where: { passwortSetzenToken: hashPasswortSetzenToken(token) },
    });
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
        // Invalidiert zuvor ausgestellte Tokens, siehe JwtStrategy (Issue #40).
        passwortGeaendertAm: new Date(),
      },
    });
  }
}
