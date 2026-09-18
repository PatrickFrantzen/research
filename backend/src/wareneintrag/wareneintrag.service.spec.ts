import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '../generated/prisma/client.js';
import { WareneintragService } from './wareneintrag.service.js';

describe('WareneintragService', () => {
  describe('findAll', () => {
    it('lists all Wareneintraege when no filter is given', async () => {
      const prisma = { wareneintrag: { findMany: vi.fn().mockResolvedValue([]) } };
      const service = new WareneintragService(prisma as never, {} as never);

      await service.findAll({});

      expect(prisma.wareneintrag.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { erstelltAm: 'desc' },
      });
    });

    it('filters by avvCodeId when given', async () => {
      const prisma = { wareneintrag: { findMany: vi.fn().mockResolvedValue([]) } };
      const service = new WareneintragService(prisma as never, {} as never);

      await service.findAll({ avvCodeId: 'avv-1' });

      expect(prisma.wareneintrag.findMany).toHaveBeenCalledWith({
        where: { avvCodeId: 'avv-1' },
        orderBy: { erstelltAm: 'desc' },
      });
    });

    it('uses the tsvector full-text index instead of LIKE when a search term is given', async () => {
      const prisma = { $queryRaw: vi.fn().mockResolvedValue([]) };
      const service = new WareneintragService(prisma as never, {} as never);

      await service.findAll({ suche: 'Bauschutt' });

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      const [strings, ...values] = prisma.$queryRaw.mock.calls[0];
      const sql = strings.join('?');
      expect(sql).not.toMatch(/LIKE/i);
      expect(sql).toContain('freitext_tsv');
      expect(sql).toContain('websearch_to_tsquery');
      expect(sql).toContain('german');
      expect(values).toContain('Bauschutt');
      expect(sql).not.toContain('SELECT *');
      expect(sql).toContain('"fotoUrl"');
      expect(sql).toContain('"avvCodeId"');
      expect(sql).toContain('"erstelltAm"');
    });

    it('combines the avvCodeId filter with the full-text search', async () => {
      const prisma = { $queryRaw: vi.fn().mockResolvedValue([]) };
      const service = new WareneintragService(prisma as never, {} as never);

      await service.findAll({ avvCodeId: 'avv-1', suche: 'Bauschutt' });

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      const [strings, ...values] = prisma.$queryRaw.mock.calls[0];
      const sql = strings.join('?');
      const nestedFragment = values.find((value: unknown) => value instanceof Prisma.Sql) as
        | InstanceType<typeof Prisma.Sql>
        | undefined;
      expect(sql).toContain('freitext_tsv');
      expect(nestedFragment?.sql).toContain('avv_code_id');
      expect(values).toContain('Bauschutt');
      expect(nestedFragment?.values).toContain('avv-1');
    });
  });

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
