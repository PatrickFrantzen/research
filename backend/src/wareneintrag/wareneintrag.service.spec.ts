import { describe, expect, it, vi } from 'vitest';
import { WareneintragService } from './wareneintrag.service.js';

describe('WareneintragService', () => {
  it('creates a Wareneintrag with the foto reference and the current Nutzer-Standort as snapshot', async () => {
    const prisma = {
      nutzer: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'nutzer-1', standortId: 'standort-1' }) },
      wareneintrag: { create: vi.fn().mockResolvedValue({ id: 'wareneintrag-1' }) },
    };
    const objectStorage = { uploadFoto: vi.fn().mockResolvedValue('wareneintraege/foto-1') };
    const service = new WareneintragService(prisma as never, objectStorage as never);

    const foto = { buffer: Buffer.from('foto-bytes'), mimetype: 'image/jpeg' } as Express.Multer.File;
    await service.create('nutzer-1', foto, { avvCodeId: 'avv-1', freitext: 'Bauschutt am Eingang' });

    expect(objectStorage.uploadFoto).toHaveBeenCalledWith(foto.buffer, 'image/jpeg');
    expect(prisma.wareneintrag.create).toHaveBeenCalledWith({
      data: {
        fotoUrl: 'wareneintraege/foto-1',
        avvCodeId: 'avv-1',
        freitext: 'Bauschutt am Eingang',
        erfasstVonId: 'nutzer-1',
        standortId: 'standort-1',
      },
    });
  });
});
