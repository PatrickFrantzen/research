import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Rolle } from '../generated/prisma/enums.js';
import { AuthService } from './auth.service.js';

function buildService() {
  const prisma = {
    nutzer: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
  const jwtService = { signAsync: vi.fn().mockResolvedValue('signed-token') };
  const mailer = { sendPasswortSetzenLink: vi.fn() };

  const service = new AuthService(prisma as never, jwtService as never, mailer as never);
  return { service, prisma, jwtService, mailer };
}

describe('AuthService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('login', () => {
    it('issues a JWT for valid credentials', async () => {
      const { service, prisma, jwtService } = buildService();
      const passwortHash = await bcrypt.hash('geheim123', 4);
      prisma.nutzer.findUnique.mockResolvedValue({
        id: 'nutzer-1',
        rolle: Rolle.VORGESETZTER,
        passwortHash,
        mussPasswortSetzen: false,
      });

      const result = await service.login('chef@research.local', 'geheim123');

      expect(result).toEqual({ accessToken: 'signed-token', mussPasswortSetzen: false });
      expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: 'nutzer-1', rolle: Rolle.VORGESETZTER });
    });

    it('rejects an unknown email', async () => {
      const { service, prisma } = buildService();
      prisma.nutzer.findUnique.mockResolvedValue(null);

      await expect(service.login('unbekannt@research.local', 'egal')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects a wrong password', async () => {
      const { service, prisma } = buildService();
      const passwortHash = await bcrypt.hash('richtig', 4);
      prisma.nutzer.findUnique.mockResolvedValue({
        id: 'nutzer-1',
        rolle: Rolle.MITARBEITER,
        passwortHash,
        mussPasswortSetzen: false,
      });

      await expect(service.login('max@research.local', 'falsch')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('passwortVergessen', () => {
    it('sets a reset token and sends it for an existing user', async () => {
      const { service, prisma, mailer } = buildService();
      prisma.nutzer.findUnique.mockResolvedValue({ id: 'nutzer-1' });

      await service.passwortVergessen('max@research.local');

      expect(prisma.nutzer.update).toHaveBeenCalledOnce();
      expect(mailer.sendPasswortSetzenLink).toHaveBeenCalledWith(
        'max@research.local',
        expect.stringContaining('/passwort-setzen?token='),
      );
    });

    it('does nothing observable for an unknown email (no account enumeration)', async () => {
      const { service, prisma, mailer } = buildService();
      prisma.nutzer.findUnique.mockResolvedValue(null);

      await expect(service.passwortVergessen('unbekannt@research.local')).resolves.toBeUndefined();
      expect(prisma.nutzer.update).not.toHaveBeenCalled();
      expect(mailer.sendPasswortSetzenLink).not.toHaveBeenCalled();
    });
  });

  describe('passwortSetzen', () => {
    it('rejects an unknown token', async () => {
      const { service, prisma } = buildService();
      prisma.nutzer.findUnique.mockResolvedValue(null);

      await expect(service.passwortSetzen('unbekannt', 'neuesPasswort1')).rejects.toThrow();
    });

    it('rejects an expired token', async () => {
      const { service, prisma } = buildService();
      prisma.nutzer.findUnique.mockResolvedValue({
        id: 'nutzer-1',
        passwortSetzenTokenAblauf: new Date(Date.now() - 1000),
      });

      await expect(service.passwortSetzen('abgelaufen', 'neuesPasswort1')).rejects.toThrow();
    });

    it('sets the new password and clears the token for a valid token', async () => {
      const { service, prisma } = buildService();
      prisma.nutzer.findUnique.mockResolvedValue({
        id: 'nutzer-1',
        passwortSetzenTokenAblauf: new Date(Date.now() + 1000 * 60),
      });

      await service.passwortSetzen('gueltig', 'neuesPasswort1');

      expect(prisma.nutzer.update).toHaveBeenCalledWith({
        where: { id: 'nutzer-1' },
        data: expect.objectContaining({
          mussPasswortSetzen: false,
          passwortSetzenToken: null,
          passwortSetzenTokenAblauf: null,
        }),
      });
    });
  });
});
