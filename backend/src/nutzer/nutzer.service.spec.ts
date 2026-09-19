import { describe, expect, it, vi } from 'vitest';
import { Rolle } from '../generated/prisma/enums.js';
import { hashPasswortSetzenToken } from '../auth/passwort-setzen-token.js';
import { NutzerService } from './nutzer.service.js';

describe('NutzerService', () => {
  it('creates a Mitarbeiter account with a placeholder password and a setup token', async () => {
    const created = {
      id: 'nutzer-2',
      vorname: 'Max',
      nachname: 'Mustermann',
      email: 'max@research.local',
      standortId: 'standort-1',
    };
    const prisma = { nutzer: { create: vi.fn().mockResolvedValue(created) } };
    const service = new NutzerService(prisma as never);

    const result = await service.createMitarbeiter('vorgesetzter-1', {
      vorname: 'Max',
      nachname: 'Mustermann',
      email: 'max@research.local',
      standortId: 'standort-1',
    });

    expect(prisma.nutzer.create).toHaveBeenCalledOnce();
    const createArgs = prisma.nutzer.create.mock.calls[0][0].data;
    expect(createArgs.rolle).toBe(Rolle.MITARBEITER);
    expect(createArgs.mussPasswortSetzen).toBe(true);
    expect(createArgs.erstelltVonId).toBe('vorgesetzter-1');
    expect(createArgs.passwortSetzenToken).toBeTypeOf('string');

    expect(result.passwortSetzenLink).toContain('/passwort-setzen?token=');
    const rawToken = result.passwortSetzenLink.split('token=')[1];
    // Persisted value must be the hash of the raw token handed to the Vorgesetzter, not the raw token itself.
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
      const service = new NutzerService(prisma as never);

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
      const service = new NutzerService(prisma as never);

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
