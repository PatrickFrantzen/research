import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env['DATABASE_URL'] ??= 'postgresql://localhost/test';
process.env['OBJECT_STORAGE_ENDPOINT'] ??= 'http://localhost:9000';
process.env['OBJECT_STORAGE_ACCESS_KEY_ID'] ??= 'access';
process.env['OBJECT_STORAGE_SECRET_ACCESS_KEY'] ??= 'secret';
process.env['OBJECT_STORAGE_BUCKET'] ??= 'bucket';
process.env['REDIS_URL'] ??= 'redis://localhost:6379';
process.env['JWT_SECRET'] ??= 'test-secret';

const { JwtStrategy } = await import('./jwt.strategy.js');

function buildStrategy() {
  const prisma = { nutzer: { findUnique: vi.fn() } };
  const strategy = new JwtStrategy(prisma as never);
  return { strategy, prisma };
}

describe('JwtStrategy', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts a token whose Nutzer still exists', async () => {
    const { strategy, prisma } = buildStrategy();
    prisma.nutzer.findUnique.mockResolvedValue({ id: 'nutzer-1' });

    const user = await strategy.validate({ sub: 'nutzer-1' });

    expect(user).toEqual({ id: 'nutzer-1' });
  });

  it('rejects a token for a Nutzer that no longer exists (deleted account) – Issue #34', async () => {
    const { strategy, prisma } = buildStrategy();
    prisma.nutzer.findUnique.mockResolvedValue(null);

    await expect(strategy.validate({ sub: 'geloeschter-nutzer' })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  describe('Invalidierung nach Passwortänderung (Issue #40)', () => {
    it('rejects a token issued before the last password change', async () => {
      const { strategy, prisma } = buildStrategy();
      const passwortGeaendertAm = new Date('2026-01-02T00:00:00Z');
      prisma.nutzer.findUnique.mockResolvedValue({ id: 'nutzer-1', passwortGeaendertAm });
      const iatVorDerAenderung = Math.floor(new Date('2026-01-01T00:00:00Z').getTime() / 1000);

      await expect(strategy.validate({ sub: 'nutzer-1', iat: iatVorDerAenderung })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('accepts a token issued after the last password change', async () => {
      const { strategy, prisma } = buildStrategy();
      const passwortGeaendertAm = new Date('2026-01-02T00:00:00Z');
      prisma.nutzer.findUnique.mockResolvedValue({ id: 'nutzer-1', passwortGeaendertAm });
      const iatNachDerAenderung = Math.floor(new Date('2026-01-03T00:00:00Z').getTime() / 1000);

      await expect(strategy.validate({ sub: 'nutzer-1', iat: iatNachDerAenderung })).resolves.toEqual({
        id: 'nutzer-1',
      });
    });

    // iat ist sekundengenau (JWT-Standard), passwortGeaendertAm
    // millisekundengenau: ein Login in derselben Sekunde wie das Passwort-
    // Setzen darf nicht sofort als "vor der Änderung" gelten (gefunden per E2E).
    it('accepts a token issued in the same second as the password change', async () => {
      const { strategy, prisma } = buildStrategy();
      const passwortGeaendertAm = new Date('2026-01-02T00:00:00.750Z');
      prisma.nutzer.findUnique.mockResolvedValue({ id: 'nutzer-1', passwortGeaendertAm });
      const iatSelbeSekunde = Math.floor(new Date('2026-01-02T00:00:00.900Z').getTime() / 1000);

      await expect(strategy.validate({ sub: 'nutzer-1', iat: iatSelbeSekunde })).resolves.toEqual({
        id: 'nutzer-1',
      });
    });
  });
});
