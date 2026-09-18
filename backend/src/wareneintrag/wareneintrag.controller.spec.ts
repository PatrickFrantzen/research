import { describe, expect, it, vi } from 'vitest';
import { WareneintragController } from './wareneintrag.controller.js';

describe('WareneintragController', () => {
  describe('findAll', () => {
    it('lists Wareneintraege without a filter when no query params are given', async () => {
      const wareneintragService = { findAll: vi.fn().mockResolvedValue([]) };
      const controller = new WareneintragController(wareneintragService as never);

      await controller.findAll(undefined, undefined);

      expect(wareneintragService.findAll).toHaveBeenCalledWith({ avvCodeId: undefined, suche: undefined });
    });

    it('passes avvCodeId and suche query params through to the service', async () => {
      const wareneintragService = { findAll: vi.fn().mockResolvedValue([]) };
      const controller = new WareneintragController(wareneintragService as never);

      await controller.findAll('avv-1', 'Bauschutt');

      expect(wareneintragService.findAll).toHaveBeenCalledWith({ avvCodeId: 'avv-1', suche: 'Bauschutt' });
    });
  });
});
