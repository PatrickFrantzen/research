import { describe, expect, it, vi } from 'vitest';
import { hashPasswortSetzenToken } from '../auth/passwort-setzen-token.js';
import { NutzerService } from './nutzer.service.js';

function mailerFake() {
  return { sendEinladung: vi.fn(), sendPasswortSetzenLink: vi.fn() };
}

function tokenAus(link: string): string {
  return new URLSearchParams(link.split('?')[1]).get('token')!;
}

describe('NutzerService', () => {
  it('schickt dem neuen Nutzer den Einladungslink per Mail und speichert die E-Mail klein', async () => {
    const prisma = {
      nutzer: { create: vi.fn().mockImplementation(async ({ data }) => ({ id: 'nutzer-2', ...data })) },
    };
    const mailer = mailerFake();
    const service = new NutzerService(prisma as never, mailer as never);

    const result = await service.createNutzer('admin-1', {
      vorname: 'Thomas',
      nachname: 'Test',
      email: ' Thomas@Research.local ',
      standortId: 'standort-1',
    });

    expect(prisma.nutzer.create.mock.calls[0][0].data.email).toBe('thomas@research.local');
    expect(mailer.sendEinladung).toHaveBeenCalledWith('thomas@research.local', result.passwortSetzenLink);
    expect(prisma.nutzer.create.mock.calls[0][0].data.passwortSetzenToken).toBe(
      hashPasswortSetzenToken(tokenAus(result.passwortSetzenLink)),
    );
  });

  it('liefert den Link trotzdem zurück, wenn der Mailversand scheitert', async () => {
    const prisma = {
      nutzer: { create: vi.fn().mockImplementation(async ({ data }) => ({ id: 'nutzer-2', ...data })) },
    };
    const mailer = mailerFake();
    mailer.sendEinladung.mockRejectedValue(new Error('SMTP down'));
    const service = new NutzerService(prisma as never, mailer as never);

    const result = await service.createNutzer('admin-1', {
      vorname: 'Thomas',
      nachname: 'Test',
      email: 'thomas@research.local',
      standortId: 'standort-1',
    });

    expect(result.mailVersendet).toBe(false);
    expect(result.passwortSetzenLink).toContain('/passwort-setzen?token=');
  });

  describe('sendePasswortLink', () => {
    it('setzt einen 24 h gültigen Token und mailt den Rohwert an den Nutzer', async () => {
      const prisma = {
        nutzer: {
          findUnique: vi.fn().mockResolvedValue({ id: 'nutzer-2', email: 'thomas@research.local' }),
          update: vi.fn(),
        },
      };
      const mailer = mailerFake();
      const service = new NutzerService(prisma as never, mailer as never);
      const vorher = Date.now();

      await service.sendePasswortLink('nutzer-2');

      const [empfaenger, link] = mailer.sendPasswortSetzenLink.mock.calls[0] as [string, string];
      const data = prisma.nutzer.update.mock.calls[0][0].data;
      expect(empfaenger).toBe('thomas@research.local');
      expect(data.passwortSetzenToken).toBe(hashPasswortSetzenToken(tokenAus(link)));
      const gueltigMs = data.passwortSetzenTokenAblauf.getTime() - vorher;
      expect(gueltigMs).toBeGreaterThan(23 * 60 * 60 * 1000);
      expect(gueltigMs).toBeLessThanOrEqual(24 * 60 * 60 * 1000 + 1000);
    });
  });

  it('creates a Nutzer account with a placeholder password and a setup token', async () => {
    const created = {
      id: 'nutzer-2',
      vorname: 'Max',
      nachname: 'Mustermann',
      email: 'max@research.local',
      standortId: 'standort-1',
    };
    const prisma = { nutzer: { create: vi.fn().mockResolvedValue(created) } };
    const service = new NutzerService(prisma as never, mailerFake() as never);

    const result = await service.createNutzer('erstellender-nutzer-1', {
      vorname: 'Max',
      nachname: 'Mustermann',
      email: 'max@research.local',
      standortId: 'standort-1',
    });

    expect(prisma.nutzer.create).toHaveBeenCalledOnce();
    const createArgs = prisma.nutzer.create.mock.calls[0][0].data;
    expect(createArgs.mussPasswortSetzen).toBe(true);
    expect(createArgs.erstelltVonId).toBe('erstellender-nutzer-1');
    expect(createArgs.passwortSetzenToken).toBeTypeOf('string');

    expect(result.passwortSetzenLink).toContain('/passwort-setzen?token=');
    const rawToken = result.passwortSetzenLink.split('token=')[1];
    // Persisted value must be the hash of the raw token handed to the erstellenden Nutzer, not the raw token itself.
    expect(createArgs.passwortSetzenToken).toBe(hashPasswortSetzenToken(rawToken));
    expect(result.email).toBe('max@research.local');
  });

  describe('findEigeneDaten', () => {
    it('returns the own Nutzer-Stammdaten without password or token fields', async () => {
      const nutzer = {
        id: 'nutzer-1',
        vorname: 'Erika',
        nachname: 'Musterfrau',
        email: 'erika@research.local',
        standortId: 'standort-1',
        passwortHash: 'geheim',
        passwortSetzenToken: 'token-geheim',
      };
      const prisma = { nutzer: { findUniqueOrThrow: vi.fn().mockResolvedValue(nutzer) } };
      const service = new NutzerService(prisma as never, mailerFake() as never);

      const result = await service.findEigeneDaten('nutzer-1');

      expect(prisma.nutzer.findUniqueOrThrow).toHaveBeenCalledWith({ where: { id: 'nutzer-1' } });
      expect(result).toEqual({
        id: 'nutzer-1',
        vorname: 'Erika',
        nachname: 'Musterfrau',
        email: 'erika@research.local',
        standortId: 'standort-1',
      });
    });
  });

  describe('updateEigeneDaten', () => {
    it('updates vorname, nachname and standortId of the own Nutzer', async () => {
      const aktualisiert = {
        id: 'nutzer-1',
        vorname: 'Erika',
        nachname: 'Neuername',
        email: 'erika@research.local',
        standortId: 'standort-2',
      };
      const prisma = { nutzer: { update: vi.fn().mockResolvedValue(aktualisiert) } };
      const service = new NutzerService(prisma as never, mailerFake() as never);

      const result = await service.updateEigeneDaten('nutzer-1', {
        vorname: 'Erika',
        nachname: 'Neuername',
        standortId: 'standort-2',
      });

      expect(prisma.nutzer.update).toHaveBeenCalledWith({
        where: { id: 'nutzer-1' },
        data: { vorname: 'Erika', nachname: 'Neuername', standortId: 'standort-2' },
      });
      expect(result).toEqual({
        id: 'nutzer-1',
        vorname: 'Erika',
        nachname: 'Neuername',
        email: 'erika@research.local',
        standortId: 'standort-2',
      });
    });
  });
});
