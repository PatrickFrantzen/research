import { describe, expect, it, vi } from 'vitest';
import { Rolle } from '../generated/prisma/enums.js';
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
    expect(result.email).toBe('max@research.local');
  });
});
