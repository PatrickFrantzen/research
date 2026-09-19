import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Rolle } from '../generated/prisma/enums.js';

process.env['DATABASE_URL'] ??= 'postgresql://localhost/test';
process.env['OBJECT_STORAGE_ENDPOINT'] ??= 'http://localhost:9000';
process.env['OBJECT_STORAGE_ACCESS_KEY_ID'] ??= 'access';
process.env['OBJECT_STORAGE_SECRET_ACCESS_KEY'] ??= 'secret';
process.env['OBJECT_STORAGE_BUCKET'] ??= 'bucket';
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
    prisma.nutzer.findUnique.mockResolvedValue({ id: 'nutzer-1', rolle: Rolle.VORGESETZTER });

    const user = await strategy.validate({ sub: 'nutzer-1', rolle: Rolle.VORGESETZTER });

    expect(user).toEqual({ id: 'nutzer-1', rolle: Rolle.VORGESETZTER });
  });

  it('rejects a token for a Nutzer that no longer exists (deleted account) – Issue #34', async () => {
    const { strategy, prisma } = buildStrategy();
    prisma.nutzer.findUnique.mockResolvedValue(null);

    await expect(strategy.validate({ sub: 'geloeschter-nutzer', rolle: Rolle.MITARBEITER })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('uses the current role from the DB rather than trusting a stale role claim in the token – Issue #34', async () => {
    const { strategy, prisma } = buildStrategy();
    // Token wurde vor einer Rollenänderung ausgestellt (aktuell nicht möglich, aber defensiv).
    prisma.nutzer.findUnique.mockResolvedValue({ id: 'nutzer-1', rolle: Rolle.VORGESETZTER });

    const user = await strategy.validate({ sub: 'nutzer-1', rolle: Rolle.MITARBEITER });

    expect(user.rolle).toBe(Rolle.VORGESETZTER);
  });
});
