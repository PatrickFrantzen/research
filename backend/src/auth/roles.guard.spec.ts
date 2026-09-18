import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { Rolle } from '../generated/prisma/enums.js';
import { RolesGuard } from './roles.guard.js';

function buildContext(rolle: Rolle | undefined): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user: { id: 'nutzer-1', rolle } }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows access when no roles are required', () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(buildContext(Rolle.MITARBEITER))).toBe(true);
  });

  it('allows access when the user has a required role', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([Rolle.VORGESETZTER]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(buildContext(Rolle.VORGESETZTER))).toBe(true);
  });

  it('denies access when the user lacks a required role', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([Rolle.VORGESETZTER]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(buildContext(Rolle.MITARBEITER))).toBe(false);
  });
});
