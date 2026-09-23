import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { NutzerService } from './nutzer.service.js';

describe('NutzerService', () => {
  describe('createNutzer', () => {
    const dto = {
      vorname: 'Max',
      nachname: 'Mustermann',
      email: 'max@research.local',
      standortId: 'standort-1',
      passwort: 'Initial-Passwort-1',
    };

    it('creates the account with the hashed initial password and forces a change on first login – Issue #76', async () => {
      const prisma = { nutzer: { create: vi.fn().mockResolvedValue({ id: 'nutzer-2', ...dto }) } };
      const service = new NutzerService(prisma as never);

      const result = await service.createNutzer('erstellender-nutzer-1', dto);

      const data = prisma.nutzer.create.mock.calls[0][0].data;
      expect(data.mussPasswortSetzen).toBe(true);
      expect(data.erstelltVonId).toBe('erstellender-nutzer-1');
      expect(data.passwortHash).not.toBe(dto.passwort);
      expect(await bcrypt.compare(dto.passwort, data.passwortHash)).toBe(true);
      expect(data).not.toHaveProperty('passwortSetzenToken');
      expect(result).toEqual({
        id: 'nutzer-2',
        vorname: 'Max',
        nachname: 'Mustermann',
        email: 'max@research.local',
        standortId: 'standort-1',
      });
    });

    it('reports a duplicate email as conflict', async () => {
      const prisma = { nutzer: { create: vi.fn().mockRejectedValue({ code: 'P2002' }) } };
      const service = new NutzerService(prisma as never);

      await expect(service.createNutzer('erstellender-nutzer-1', dto)).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findAlle', () => {
    it('lists Nutzer without password or token fields, sorted by name', async () => {
      const prisma = { nutzer: { findMany: vi.fn().mockResolvedValue([]) } };
      const service = new NutzerService(prisma as never);

      await service.findAlle();

      const args = prisma.nutzer.findMany.mock.calls[0][0];
      expect(Object.keys(args.select)).toEqual(['id', 'vorname', 'nachname', 'email', 'standort']);
      expect(args.orderBy).toEqual([{ nachname: 'asc' }, { vorname: 'asc' }]);
    });
  });

  describe('passwortZuruecksetzen', () => {
    it('sets a new initial password, forces a change and invalidates existing sessions – Issue #76', async () => {
      const prisma = { nutzer: { update: vi.fn().mockResolvedValue({}) } };
      const service = new NutzerService(prisma as never);

      await service.passwortZuruecksetzen('nutzer-1', 'nutzer-2', 'Neues-Initial-Pw-1');

      const { where, data } = prisma.nutzer.update.mock.calls[0][0];
      expect(where).toEqual({ id: 'nutzer-2' });
      expect(data.mussPasswortSetzen).toBe(true);
      expect(data.passwortGeaendertAm).toBeInstanceOf(Date);
      expect(await bcrypt.compare('Neues-Initial-Pw-1', data.passwortHash)).toBe(true);
    });

    it('refuses to reset the own password', async () => {
      const prisma = { nutzer: { update: vi.fn() } };
      const service = new NutzerService(prisma as never);

      await expect(service.passwortZuruecksetzen('nutzer-1', 'nutzer-1', 'Neues-Initial-Pw-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.nutzer.update).not.toHaveBeenCalled();
    });

    it('reports an unknown Nutzer as not found', async () => {
      const prisma = { nutzer: { update: vi.fn().mockRejectedValue({ code: 'P2025' }) } };
      const service = new NutzerService(prisma as never);

      await expect(service.passwortZuruecksetzen('nutzer-1', 'unbekannt', 'Neues-Initial-Pw-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
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
