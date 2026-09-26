import { createHash } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service.js';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

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
        passwortHash,
        mussPasswortSetzen: false,
      });

      const result = await service.login('nutzer@research.local', 'geheim123');

      expect(result).toEqual({
        accessToken: 'signed-token',
        mussPasswortSetzen: false,
        id: 'nutzer-1',
      });
      expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: 'nutzer-1' });
    });

    it('findet den Nutzer unabhängig von Groß-/Kleinschreibung der E-Mail', async () => {
      const { service, prisma } = buildService();
      const passwortHash = await bcrypt.hash('geheim123', 4);
      prisma.nutzer.findUnique.mockResolvedValue({ id: 'nutzer-1', passwortHash, mussPasswortSetzen: false });

      await service.login(' Thomas@Research.local', 'geheim123');

      expect(prisma.nutzer.findUnique).toHaveBeenCalledWith({ where: { email: 'thomas@research.local' } });
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
        passwortHash,
        mussPasswortSetzen: false,
      });

      await expect(service.login('max@research.local', 'falsch')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('passwortVergessen', () => {
    it('sets a hashed reset token and sends the raw token to the user', async () => {
      const { service, prisma, mailer } = buildService();
      prisma.nutzer.findUnique.mockResolvedValue({ id: 'nutzer-1' });

      await service.passwortVergessen('max@research.local');

      expect(prisma.nutzer.update).toHaveBeenCalledOnce();
      const persistedToken = prisma.nutzer.update.mock.calls[0][0].data.passwortSetzenToken as string;
      expect(mailer.sendPasswortSetzenLink).toHaveBeenCalledWith(
        'max@research.local',
        expect.stringContaining('/passwort-setzen?token='),
      );
      const [, sentLink] = mailer.sendPasswortSetzenLink.mock.calls[0] as [string, string];
      const rawToken = new URLSearchParams(sentLink.split('?')[1]).get('token')!;
      // Persisted value must be the SHA-256 hash of the raw token, not the raw token itself.
      expect(persistedToken).toBe(sha256(rawToken));
      expect(persistedToken).not.toBe(rawToken);
    });

    it('sucht und mailt an die klein geschriebene E-Mail', async () => {
      const { service, prisma, mailer } = buildService();
      prisma.nutzer.findUnique.mockResolvedValue({ id: 'nutzer-1' });

      await service.passwortVergessen('Max@Research.local');

      expect(prisma.nutzer.findUnique).toHaveBeenCalledWith({ where: { email: 'max@research.local' } });
      expect(mailer.sendPasswortSetzenLink.mock.calls[0][0]).toBe('max@research.local');
    });

    it('keeps a still valid Initial-Zugang token instead of replacing it with an undelivered one', async () => {
      const { service, prisma, mailer } = buildService();
      prisma.nutzer.findUnique.mockResolvedValue({
        id: 'nutzer-1',
        mussPasswortSetzen: true,
        passwortSetzenTokenAblauf: new Date(Date.now() + 1000 * 60),
      });

      await service.passwortVergessen('neu@research.local');

      expect(prisma.nutzer.update).not.toHaveBeenCalled();
      expect(mailer.sendPasswortSetzenLink).not.toHaveBeenCalled();
    });

    it('issues a new token for a pending account whose Initial-Zugang token has expired', async () => {
      const { service, prisma } = buildService();
      prisma.nutzer.findUnique.mockResolvedValue({
        id: 'nutzer-1',
        mussPasswortSetzen: true,
        passwortSetzenTokenAblauf: new Date(Date.now() - 1000),
      });

      await service.passwortVergessen('neu@research.local');

      expect(prisma.nutzer.update).toHaveBeenCalledOnce();
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
    it('looks up the user by the hash of the provided raw token, not the raw token', async () => {
      const { service, prisma } = buildService();
      prisma.nutzer.findUnique.mockResolvedValue({
        id: 'nutzer-1',
        passwortSetzenTokenAblauf: new Date(Date.now() + 1000 * 60),
      });

      await service.passwortSetzen('mein-roh-token', 'neuesPasswort1');

      expect(prisma.nutzer.findUnique).toHaveBeenCalledWith({
        where: { passwortSetzenToken: sha256('mein-roh-token') },
      });
    });

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

    it('records when the password was changed, invalidating previously issued tokens – Issue #40', async () => {
      const { service, prisma } = buildService();
      prisma.nutzer.findUnique.mockResolvedValue({
        id: 'nutzer-1',
        passwortSetzenTokenAblauf: new Date(Date.now() + 1000 * 60),
      });
      const vorher = new Date();

      await service.passwortSetzen('gueltig', 'neuesPasswort1');

      const data = prisma.nutzer.update.mock.calls[0][0].data as { passwortGeaendertAm: Date };
      expect(data.passwortGeaendertAm).toBeInstanceOf(Date);
      expect(data.passwortGeaendertAm.getTime()).toBeGreaterThanOrEqual(vorher.getTime());
    });
  });
});
