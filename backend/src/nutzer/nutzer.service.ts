import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { erzeugePasswortSetzenToken } from '../auth/passwort-setzen-token.js';
import { Mailer } from '../mailer/mailer.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { normalisiereEmail } from './email.js';
import { CreateNutzerDto } from './dto/create-nutzer.dto.js';
import { UpdateEigeneDatenDto } from './dto/update-eigene-daten.dto.js';

const INITIAL_ZUGANG_GUELTIGKEIT_MS = 7 * 24 * 60 * 60 * 1000; // 7 Tage
// Länger als beim Self-Service-Reset (1 h): der Nutzer hat die Mail nicht
// selbst angefordert und liest sie evtl. erst später.
const ADMIN_PASSWORT_LINK_GUELTIGKEIT_MS = 24 * 60 * 60 * 1000; // 24 Stunden

export interface NeuerNutzer {
  id: string;
  vorname: string;
  nachname: string;
  email: string;
  standortId: string;
  // Geht per Mail raus; zusätzlich zurückgegeben, damit der Admin ihn auch
  // direkt weitergeben kann.
  passwortSetzenLink: string;
  mailVersendet: boolean;
}

@Injectable()
export class NutzerService {
  private readonly logger = new Logger(NutzerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: Mailer,
  ) {}

  async listNutzer() {
    const nutzer = await this.prisma.nutzer.findMany({
      include: { standort: true },
      orderBy: { erstelltAm: 'asc' },
    });
    return nutzer.map((n) => ({
      id: n.id,
      vorname: n.vorname,
      nachname: n.nachname,
      email: n.email,
      standort: n.standort.name,
      istAdmin: n.istAdmin,
      einladungOffen: n.mussPasswortSetzen,
      erstelltAm: n.erstelltAm,
    }));
  }

  async sendePasswortLink(id: string): Promise<void> {
    const nutzer = await this.prisma.nutzer.findUnique({ where: { id } });
    if (!nutzer) {
      throw new NotFoundException('Nutzer nicht gefunden.');
    }
    const { rawToken, hashedToken } = erzeugePasswortSetzenToken();
    await this.prisma.nutzer.update({
      where: { id },
      data: {
        passwortSetzenToken: hashedToken,
        passwortSetzenTokenAblauf: new Date(Date.now() + ADMIN_PASSWORT_LINK_GUELTIGKEIT_MS),
      },
    });
    await this.mailer.sendPasswortSetzenLink(nutzer.email, `/passwort-setzen?token=${rawToken}`);
  }

  async createNutzer(erstelltVonId: string, dto: CreateNutzerDto): Promise<NeuerNutzer> {
    const standortId = await this.standortIdAus(dto);
    // Platzhalter-Passwort: unbrauchbar, bis der neue Nutzer über den
    // Initial-Zugang sein eigenes Passwort setzt.
    const platzhalterPasswortHash = await bcrypt.hash(randomUUID(), 12);
    const { rawToken, hashedToken } = erzeugePasswortSetzenToken();

    const nutzer = await this.prisma.nutzer.create({
      data: {
        vorname: dto.vorname,
        nachname: dto.nachname,
        email: normalisiereEmail(dto.email),
        standortId,
        passwortHash: platzhalterPasswortHash,
        mussPasswortSetzen: true,
        passwortSetzenToken: hashedToken,
        passwortSetzenTokenAblauf: new Date(Date.now() + INITIAL_ZUGANG_GUELTIGKEIT_MS),
        erstelltVonId,
      },
    });

    const passwortSetzenLink = `/passwort-setzen?token=${rawToken}`;
    // Nutzer ist schon angelegt: ein Mailfehler darf ihn nicht per 500 "verlieren",
    // der Admin gibt den Link dann manuell weiter.
    let mailVersendet = true;
    try {
      await this.mailer.sendEinladung(nutzer.email, passwortSetzenLink);
    } catch (error) {
      mailVersendet = false;
      this.logger.warn(`Einladung an ${nutzer.email} konnte nicht versendet werden: ${String(error)}`);
    }

    return {
      id: nutzer.id,
      vorname: nutzer.vorname,
      nachname: nutzer.nachname,
      email: nutzer.email,
      standortId: nutzer.standortId,
      passwortSetzenLink,
      mailVersendet,
    };
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
    const standortId = await this.standortIdAus(dto);
    const nutzer = await this.prisma.nutzer.update({
      where: { id },
      data: { vorname: dto.vorname, nachname: dto.nachname, standortId },
    });
    return {
      id: nutzer.id,
      vorname: nutzer.vorname,
      nachname: nutzer.nachname,
      email: nutzer.email,
      standortId: nutzer.standortId,
    };
  }

  // Standort aus der Liste oder als Freitext. Freitext wird ohne Rücksicht auf
  // Groß-/Kleinschreibung einem vorhandenen Standort zugeordnet, sonst angelegt.
  // Bewusst ohne Schutz vor Missbrauch: nur Firmenpersonal nutzt die App.
  private async standortIdAus(dto: { standortId?: string; neuerStandort?: string }): Promise<string> {
    const name = dto.neuerStandort?.trim();
    if (!!dto.standortId === !!name) {
      throw new BadRequestException('Bitte einen Standort aus der Liste wählen oder einen neuen eintragen.');
    }
    if (dto.standortId) return dto.standortId;
    const vorhanden = await this.prisma.standort.findFirst({
      where: { name: { equals: name!, mode: 'insensitive' } },
    });
    return (vorhanden ?? (await this.prisma.standort.create({ data: { name: name! } }))).id;
  }
}
