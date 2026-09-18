import { randomBytes, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Rolle } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateMitarbeiterDto } from './dto/create-mitarbeiter.dto.js';

const INITIAL_ZUGANG_GUELTIGKEIT_MS = 7 * 24 * 60 * 60 * 1000; // 7 Tage

export interface NeuerMitarbeiter {
  id: string;
  vorname: string;
  nachname: string;
  email: string;
  standortId: string;
  // Vorgesetzter übergibt den Link direkt an den Mitarbeiter (kein Mailversand,
  // siehe docs/research/01-projektbeschreibung-spezifikation.md Abschnitt 2).
  passwortSetzenLink: string;
}

@Injectable()
export class NutzerService {
  constructor(private readonly prisma: PrismaService) {}

  async createMitarbeiter(erstelltVonId: string, dto: CreateMitarbeiterDto): Promise<NeuerMitarbeiter> {
    // Platzhalter-Passwort: unbrauchbar, bis der Mitarbeiter über den
    // Initial-Zugang sein eigenes Passwort setzt.
    const platzhalterPasswortHash = await bcrypt.hash(randomUUID(), 12);
    const token = randomBytes(32).toString('hex');

    const nutzer = await this.prisma.nutzer.create({
      data: {
        vorname: dto.vorname,
        nachname: dto.nachname,
        email: dto.email,
        standortId: dto.standortId,
        rolle: Rolle.MITARBEITER,
        passwortHash: platzhalterPasswortHash,
        mussPasswortSetzen: true,
        passwortSetzenToken: token,
        passwortSetzenTokenAblauf: new Date(Date.now() + INITIAL_ZUGANG_GUELTIGKEIT_MS),
        erstelltVonId,
      },
    });

    return {
      id: nutzer.id,
      vorname: nutzer.vorname,
      nachname: nutzer.nachname,
      email: nutzer.email,
      standortId: nutzer.standortId,
      passwortSetzenLink: `/passwort-setzen?token=${token}`,
    };
  }
}
