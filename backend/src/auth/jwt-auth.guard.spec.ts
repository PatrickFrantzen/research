import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErlaubtMitInitialpasswort } from './erlaubt-mit-initialpasswort.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

class Controller {
  normal() {}

  @ErlaubtMitInitialpasswort()
  erlaubt() {}
}

function kontext(handler: () => void, mussPasswortSetzen: boolean): ExecutionContext {
  const request = { method: 'GET', cookies: {}, headers: {}, user: { id: 'nutzer-1', mussPasswortSetzen } };
  return {
    getHandler: () => handler,
    getClass: () => Controller,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

// Pflicht-Passwortwechsel beim ersten Login, serverseitig erzwungen (Issue #76).
describe('JwtAuthGuard mit Initialpasswort', () => {
  const guard = new JwtAuthGuard(new Reflector());

  beforeEach(() => {
    // Passport-Authentifizierung selbst ist nicht Gegenstand dieses Tests.
    vi.spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('blocks regular endpoints while the initial password is still set', async () => {
    await expect(guard.canActivate(kontext(Controller.prototype.normal, true))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows endpoints marked with @ErlaubtMitInitialpasswort', async () => {
    await expect(guard.canActivate(kontext(Controller.prototype.erlaubt, true))).resolves.toBe(true);
  });

  it('allows regular endpoints after the password was changed', async () => {
    await expect(guard.canActivate(kontext(Controller.prototype.normal, false))).resolves.toBe(true);
  });
});
