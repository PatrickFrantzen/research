import { describe, expect, it, vi } from 'vitest';
import { NutzerController } from './nutzer.controller.js';

function buildRequest(id: string) {
  return { user: { id } } as never;
}

describe('NutzerController', () => {
  describe('me', () => {
    it('returns the own Nutzer-Stammdaten', async () => {
      const nutzerService = { findEigeneDaten: vi.fn().mockResolvedValue({ id: 'nutzer-1' }) };
      const controller = new NutzerController(nutzerService as never);

      await controller.me(buildRequest('nutzer-1'));

      expect(nutzerService.findEigeneDaten).toHaveBeenCalledWith('nutzer-1');
    });
  });

  describe('updateMe', () => {
    it('passes the own id and dto through to the service', async () => {
      const nutzerService = { updateEigeneDaten: vi.fn().mockResolvedValue({ id: 'nutzer-1' }) };
      const controller = new NutzerController(nutzerService as never);
      const dto = { vorname: 'Erika', nachname: 'Neuername', standortId: 'standort-2' };

      await controller.updateMe(buildRequest('nutzer-1'), dto);

      expect(nutzerService.updateEigeneDaten).toHaveBeenCalledWith('nutzer-1', dto);
    });
  });
});
