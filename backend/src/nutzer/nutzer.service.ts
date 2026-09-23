import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateNutzerDto } from './dto/create-nutzer.dto.js';
import { UpdateEigeneDatenDto } from './dto/update-eigene-daten.dto.js';

export interface NeuerNutzer {
  id: string;
  vorname: string;
  nachname: string;
  email: string;
  standortId: string;
}

export interface NutzerUebersicht {
  id: string;
  vorname: string;
  nachname: string;
  email: string;
  standort: { id: string; name: string };
}

function istEindeutigkeitsVerletzung(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002';
}

function istNichtGefunden(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2025';
}

@Injectable()
export class NutzerService {
  constructor(private readonly prisma: PrismaService) {}

  // Kein Mailversand (#63 zurückgestellt): Der erstellende Nutzer vergibt ein
  // Initialpasswort und übergibt die Zugangsdaten persönlich. Beim ersten
  // Login ist der Wechsel Pflicht (mussPasswortSetzen, Issue #76).
  async createNutzer(erstelltVonId: string, dto: CreateNutzerDto): Promise<NeuerNutzer> {
    const passwortHash = await bcrypt.hash(dto.passwort, 12);

    try {
      const nutzer = await this.prisma.nutzer.create({
        data: {
          vorname: dto.vorname,
          nachname: dto.nachname,
          email: dto.email,
          standortId: dto.standortId,
          passwortHash,
          mussPasswortSetzen: true,
          erstelltVonId,
        },
      });
      return {
        id: nutzer.id,
        vorname: nutzer.vorname,
        nachname: nutzer.nachname,
        email: nutzer.email,
        standortId: nutzer.standortId,
      };
    } catch (error) {
      if (istEindeutigkeitsVerletzung(error)) {
        throw new ConflictException('Es gibt bereits einen Account mit dieser E-Mail.');
      }
      throw error;
    }
  }

  async findAlle(): Promise<NutzerUebersicht[]> {
    return this.prisma.nutzer.findMany({
      select: { id: true, vorname: true, nachname: true, email: true, standort: { select: { id: true, name: true } } },
      orderBy: [{ nachname: 'asc' }, { vorname: 'asc' }],
    });
  }

  // Passwort vergessen ohne Mailversand (Issue #76): Ein Kollege vergibt ein
  // neues Initialpasswort. Bestehende Sessions des Betroffenen werden über
  // passwortGeaendertAm ungültig, beim nächsten Login ist der Wechsel Pflicht.
  async passwortZuruecksetzen(ausfuehrendeId: string, zielId: string, passwort: string): Promise<void> {
    if (ausfuehrendeId === zielId) {
      throw new BadRequestException('Das eigene Passwort lässt sich hier nicht zurücksetzen.');
    }
    const passwortHash = await bcrypt.hash(passwort, 12);
    try {
      await this.prisma.nutzer.update({
        where: { id: zielId },
        data: {
          passwortHash,
          mussPasswortSetzen: true,
          passwortSetzenToken: null,
          passwortSetzenTokenAblauf: null,
          passwortGeaendertAm: new Date(),
        },
      });
    } catch (error) {
      if (istNichtGefunden(error)) {
        throw new NotFoundException('Nutzer nicht gefunden.');
      }
      throw error;
    }
  }

  async findEigeneDaten(id: string) {
    const nutzer = await this.prisma.nutzer.findUniqueOrThrow({ where: { id } });
    return {
      id: nutzer.id,
      vorname: nutzer.vorname,
      nachname: nutzer.nachname,
      email: nutzer.email,
      standortId: nutzer.standortId,
    };
  }

  async updateEigeneDaten(id: string, dto: UpdateEigeneDatenDto) {
    // Standort wird nur am Nutzer aktualisiert; bereits erfasste Wareneinträge
    // behalten ihre eigene Standort-Kopie, siehe ADR-0004.
    const nutzer = await this.prisma.nutzer.update({
      where: { id },
      data: { vorname: dto.vorname, nachname: dto.nachname, standortId: dto.standortId },
    });
    return {
      id: nutzer.id,
      vorname: nutzer.vorname,
      nachname: nutzer.nachname,
      email: nutzer.email,
      standortId: nutzer.standortId,
    };
  }
}
