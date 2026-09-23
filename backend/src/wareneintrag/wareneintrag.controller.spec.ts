import { describe, expect, it, vi } from 'vitest';
import { WareneintragController } from './wareneintrag.controller.js';

function buildRequest(id: string) {
  return { user: { id } } as never;
}

// Minimaler gültiger PNG-Header, den `file-type` als image/png erkennt –
// die Foto-Validierung prüft Magic Bytes, nicht nur den mimetype.
const PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
]);

describe('WareneintragController', () => {
  describe('findAll', () => {
    it('requests the first page without filters when no query params are given', async () => {
      const wareneintragService = { findAll: vi.fn().mockResolvedValue([]) };
      const controller = new WareneintragController(wareneintragService as never);

      await controller.findAll(undefined, undefined, undefined, undefined);

      expect(wareneintragService.findAll).toHaveBeenCalledWith({
        avvCodeId: undefined,
        suche: undefined,
        seite: 0,
        proSeite: 20,
      });
    });

    it('passes filters and pagination query params through to the service', async () => {
      const wareneintragService = { findAll: vi.fn().mockResolvedValue([]) };
      const controller = new WareneintragController(wareneintragService as never);

      await controller.findAll('avv-1', 'Bauschutt', '2', '50');

      expect(wareneintragService.findAll).toHaveBeenCalledWith({
        avvCodeId: 'avv-1',
        suche: 'Bauschutt',
        seite: 2,
        proSeite: 50,
      });
    });

    it('passes the standortId filter through to the service', async () => {
      const wareneintragService = { findAll: vi.fn().mockResolvedValue([]) };
      const controller = new WareneintragController(wareneintragService as never);

      await controller.findAll(undefined, undefined, undefined, undefined, 'standort-2');

      expect(wareneintragService.findAll).toHaveBeenCalledWith(expect.objectContaining({ standortId: 'standort-2' }));
    });
  });

  describe('create', () => {
    it('passes the acting user, dto and the uploaded fotos (0 to 3) through to the service', async () => {
      const wareneintragService = { create: vi.fn().mockResolvedValue({ id: 'wareneintrag-1' }) };
      const controller = new WareneintragController(wareneintragService as never);
      const dto = { avvCodeId: 'avv-1', freitext: 'Bauschutt am Eingang' };
      const fotoFern = { buffer: PNG_BYTES, mimetype: 'image/png', size: PNG_BYTES.length } as Express.Multer.File;

      await controller.create(buildRequest('nutzer-1'), { fotoFern: [fotoFern] }, dto);

      expect(wareneintragService.create).toHaveBeenCalledWith('nutzer-1', dto, {
        fotoFern,
        fotoNah: undefined,
        fotoDetail: undefined,
      });
    });

    it('passes undefined for every foto field when none is uploaded', async () => {
      const wareneintragService = { create: vi.fn().mockResolvedValue({ id: 'wareneintrag-1' }) };
      const controller = new WareneintragController(wareneintragService as never);
      const dto = { avvCodeId: 'avv-1', freitext: 'Bauschutt am Eingang' };

      await controller.create(buildRequest('nutzer-1'), {}, dto);

      expect(wareneintragService.create).toHaveBeenCalledWith('nutzer-1', dto, {
        fotoFern: undefined,
        fotoNah: undefined,
        fotoDetail: undefined,
      });
    });
  });

  describe('update', () => {
    it('passes the acting user, id, dto and the optional fotos through to the service', async () => {
      const wareneintragService = { update: vi.fn().mockResolvedValue({ id: 'wareneintrag-1' }) };
      const controller = new WareneintragController(wareneintragService as never);
      const dto = { avvCodeId: 'avv-2', freitext: 'Aktualisierter Text' };
      const fotoNah = { buffer: PNG_BYTES, mimetype: 'image/png', size: PNG_BYTES.length } as Express.Multer.File;

      await controller.update(buildRequest('nutzer-1'), 'wareneintrag-1', dto, { fotoNah: [fotoNah] });

      expect(wareneintragService.update).toHaveBeenCalledWith('wareneintrag-1', 'nutzer-1', dto, {
        fotoFern: undefined,
        fotoNah,
        fotoDetail: undefined,
      });
    });

    it('passes undefined for every foto field when none is uploaded', async () => {
      const wareneintragService = { update: vi.fn().mockResolvedValue({ id: 'wareneintrag-1' }) };
      const controller = new WareneintragController(wareneintragService as never);
      const dto = { avvCodeId: 'avv-2', freitext: 'Aktualisierter Text' };

      await controller.update(buildRequest('nutzer-1'), 'wareneintrag-1', dto, {});

      expect(wareneintragService.update).toHaveBeenCalledWith('wareneintrag-1', 'nutzer-1', dto, {
        fotoFern: undefined,
        fotoNah: undefined,
        fotoDetail: undefined,
      });
    });
  });

  describe('remove', () => {
    it('passes the id and the acting user through to the service', async () => {
      const wareneintragService = { remove: vi.fn().mockResolvedValue({ id: 'wareneintrag-1' }) };
      const controller = new WareneintragController(wareneintragService as never);

      await controller.remove(buildRequest('nutzer-1'), 'wareneintrag-1');

      expect(wareneintragService.remove).toHaveBeenCalledWith('wareneintrag-1', 'nutzer-1');
    });
  });
});
