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

  describe('update', () => {
    it('passes id, dto and the optional foto through to the service', async () => {
      const wareneintragService = { update: vi.fn().mockResolvedValue({ id: 'wareneintrag-1' }) };
      const controller = new WareneintragController(wareneintragService as never);
      const dto = { avvCodeId: 'avv-2', freitext: 'Aktualisierter Text' };
      const foto = { buffer: Buffer.from('neu'), mimetype: 'image/png' } as Express.Multer.File;

      await controller.update('wareneintrag-1', dto, foto);

      expect(wareneintragService.update).toHaveBeenCalledWith('wareneintrag-1', dto, foto);
    });

    it('passes undefined when no foto is uploaded', async () => {
      const wareneintragService = { update: vi.fn().mockResolvedValue({ id: 'wareneintrag-1' }) };
      const controller = new WareneintragController(wareneintragService as never);
      const dto = { avvCodeId: 'avv-2', freitext: 'Aktualisierter Text' };

      await controller.update('wareneintrag-1', dto, undefined);

      expect(wareneintragService.update).toHaveBeenCalledWith('wareneintrag-1', dto, undefined);
    });
  });

  describe('remove', () => {
    it('passes the id through to the service', async () => {
      const wareneintragService = { remove: vi.fn().mockResolvedValue({ id: 'wareneintrag-1' }) };
      const controller = new WareneintragController(wareneintragService as never);

      await controller.remove('wareneintrag-1');

      expect(wareneintragService.remove).toHaveBeenCalledWith('wareneintrag-1');
    });
  });
});
