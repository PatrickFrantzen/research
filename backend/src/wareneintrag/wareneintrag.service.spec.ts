import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '../generated/prisma/client.js';
import { WareneintragService } from './wareneintrag.service.js';

describe('WareneintragService', () => {
  describe('findAll', () => {
    it('returns a page of Wareneintraege and the total number of matching entries', async () => {
      const prisma = {
        wareneintrag: {
          findMany: vi.fn().mockResolvedValue([{ id: 'wareneintrag-21', fotoUrl: 'wareneintraege/foto-21' }]),
          count: vi.fn().mockResolvedValue(41),
        },
      };
      const objectStorage = { getSignedUrl: vi.fn().mockResolvedValue('https://minio.local/foto-21') };
      const service = new WareneintragService(prisma as never, objectStorage as never);

      const ergebnis = await service.findAll({ seite: 1, proSeite: 20 });

      expect(prisma.wareneintrag.findMany).toHaveBeenCalledWith({
        where: undefined,
        include: { avvCode: { select: { code: true } } },
        orderBy: [{ erstelltAm: 'desc' }, { id: 'desc' }],
        skip: 20,
        take: 20,
      });
      expect(prisma.wareneintrag.count).toHaveBeenCalledWith({ where: undefined });
      expect(ergebnis).toEqual({
        daten: [{ id: 'wareneintrag-21', fotoUrl: 'https://minio.local/foto-21' }],
        gesamt: 41,
      });
    });

    it('lists all Wareneintraege when no filter is given', async () => {
      const prisma = { wareneintrag: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) } };
      const service = new WareneintragService(prisma as never, {} as never);

      await service.findAll({});

      expect(prisma.wareneintrag.findMany).toHaveBeenCalledWith({
        where: undefined,
        include: { avvCode: { select: { code: true } } },
        orderBy: [{ erstelltAm: 'desc' }, { id: 'desc' }],
        skip: 0,
        take: 20,
      });
    });

    it('returns the assigned AVV-Code for every listed Wareneintrag', async () => {
      const prisma = {
        wareneintrag: {
          findMany: vi.fn().mockImplementation((args: { include?: unknown }) =>
            Promise.resolve([
              {
                id: 'wareneintrag-1',
                fotoUrl: 'wareneintraege/foto-1',
                ...(args.include ? { avvCode: { code: '17 01 01' } } : {}),
              },
            ]),
          ),
          count: vi.fn().mockResolvedValue(1),
        },
      };
      const objectStorage = { getSignedUrl: vi.fn().mockResolvedValue('https://minio.local/foto-1') };
      const service = new WareneintragService(prisma as never, objectStorage as never);

      const ergebnis = await service.findAll({});

      expect(ergebnis.daten[0]).toMatchObject({ avvCode: { code: '17 01 01' } });
    });

    it('replaces the stored object-storage key with a time-limited, retrievable URL – Issue #45', async () => {
      const prisma = {
        wareneintrag: {
          findMany: vi
            .fn()
            .mockResolvedValue([{ id: 'wareneintrag-1', fotoUrl: 'wareneintraege/foto-1', freitext: 'x' }]),
          count: vi.fn().mockResolvedValue(1),
        },
      };
      const objectStorage = { getSignedUrl: vi.fn().mockResolvedValue('https://minio.local/signed-foto-1') };
      const service = new WareneintragService(prisma as never, objectStorage as never);

      const ergebnis = await service.findAll({});

      expect(objectStorage.getSignedUrl).toHaveBeenCalledWith('wareneintraege/foto-1');
      expect(ergebnis).toEqual({
        daten: [{ id: 'wareneintrag-1', fotoUrl: 'https://minio.local/signed-foto-1', freitext: 'x' }],
        gesamt: 1,
      });
    });

    it('filters by avvCodeId when given', async () => {
      const prisma = { wareneintrag: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) } };
      const service = new WareneintragService(prisma as never, {} as never);

      await service.findAll({ avvCodeId: 'avv-1' });

      expect(prisma.wareneintrag.findMany).toHaveBeenCalledWith({
        where: { avvCodeId: 'avv-1' },
        include: { avvCode: { select: { code: true } } },
        orderBy: [{ erstelltAm: 'desc' }, { id: 'desc' }],
        skip: 0,
        take: 20,
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

    it('finds a Wareneintrag when the search term is only the beginning of a word', async () => {
      const prisma = {
        $queryRaw: vi.fn().mockImplementation((strings: TemplateStringsArray, ...values: unknown[]) => {
          const sql = strings.join('?');
          const usesPrefixSearch = sql.includes("to_tsquery('german'") && values.includes('tes:*');
          return usesPrefixSearch
            ? [{ id: 'wareneintrag-1', fotoUrl: 'wareneintraege/foto-1', freitext: 'test', gesamt: 1n }]
            : [];
        }),
      };
      const objectStorage = { getSignedUrl: vi.fn().mockResolvedValue('https://minio.local/foto-1') };
      const service = new WareneintragService(prisma as never, objectStorage as never);

      const ergebnis = await service.findAll({ suche: 'tes' });

      expect(ergebnis).toEqual({
        daten: [{ id: 'wareneintrag-1', fotoUrl: 'https://minio.local/foto-1', freitext: 'test' }],
        gesamt: 1,
      });
    });

    it('returns the assigned AVV-Code for filtered search results too', async () => {
      const prisma = {
        $queryRaw: vi.fn().mockImplementation((strings: TemplateStringsArray) => {
          const sql = strings.join('?');
          const selectsAvvCode = sql.includes('JOIN avv_codes') && sql.includes('json_build_object');
          return Promise.resolve([
            {
              id: 'wareneintrag-1',
              fotoUrl: 'wareneintraege/foto-1',
              gesamt: 1n,
              ...(selectsAvvCode ? { avvCode: { code: '17 01 01' } } : {}),
            },
          ]);
        }),
      };
      const objectStorage = { getSignedUrl: vi.fn().mockResolvedValue('https://minio.local/foto-1') };
      const service = new WareneintragService(prisma as never, objectStorage as never);

      const ergebnis = await service.findAll({ suche: 'tes' });

      expect(ergebnis.daten[0]).toMatchObject({ avvCode: { code: '17 01 01' } });
    });

    it('replaces the stored object-storage key with a signed URL for full-text search results too – Issue #45', async () => {
      const prisma = {
        $queryRaw: vi.fn().mockResolvedValue([{ id: 'wareneintrag-1', fotoUrl: 'wareneintraege/foto-1', gesamt: 1n }]),
      };
      const objectStorage = { getSignedUrl: vi.fn().mockResolvedValue('https://minio.local/signed-foto-1') };
      const service = new WareneintragService(prisma as never, objectStorage as never);

      const ergebnis = await service.findAll({ suche: 'Bauschutt' });

      expect(objectStorage.getSignedUrl).toHaveBeenCalledWith('wareneintraege/foto-1');
      expect(ergebnis).toEqual({
        daten: [{ id: 'wareneintrag-1', fotoUrl: 'https://minio.local/signed-foto-1' }],
        gesamt: 1,
      });
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

  // Minimaler gültiger PNG-Header, den `file-type` als image/png erkennt.
  const PNG_BYTES = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
  ]);

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

  it('uploads with the actually detected image type, not the client-declared (possibly spoofed) mimetype', async () => {
    const prisma = {
      nutzer: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'nutzer-1', standortId: 'standort-1' }) },
      wareneintrag: { create: vi.fn().mockResolvedValue({ id: 'wareneintrag-1' }) },
    };
    const objectStorage = { uploadFoto: vi.fn().mockResolvedValue('wareneintraege/foto-1') };
    const service = new WareneintragService(prisma as never, objectStorage as never);

    // Client behauptet text/html, die Bytes sind aber ein echtes PNG.
    const foto = { buffer: PNG_BYTES, mimetype: 'text/html' } as Express.Multer.File;
    await service.create('nutzer-1', foto, { avvCodeId: 'avv-1', freitext: 'Bauschutt am Eingang' });

    expect(objectStorage.uploadFoto).toHaveBeenCalledWith(foto.buffer, 'image/png');
  });

  describe('update', () => {
    it('updates avvCodeId and freitext without touching the photo when no new foto is given', async () => {
      const prisma = {
        wareneintrag: { update: vi.fn().mockResolvedValue({ id: 'wareneintrag-1' }) },
      };
      const objectStorage = { uploadFoto: vi.fn(), deleteFoto: vi.fn() };
      const service = new WareneintragService(prisma as never, objectStorage as never);

      await service.update('wareneintrag-1', { avvCodeId: 'avv-2', freitext: 'Aktualisierter Text' });

      expect(objectStorage.uploadFoto).not.toHaveBeenCalled();
      expect(objectStorage.deleteFoto).not.toHaveBeenCalled();
      expect(prisma.wareneintrag.update).toHaveBeenCalledWith({
        where: { id: 'wareneintrag-1' },
        data: { avvCodeId: 'avv-2', freitext: 'Aktualisierter Text' },
      });
    });

    it('replaces the photo when a new foto is given, deleting the old one', async () => {
      const prisma = {
        wareneintrag: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'wareneintrag-1', fotoUrl: 'wareneintraege/alt' }),
          update: vi.fn().mockResolvedValue({ id: 'wareneintrag-1' }),
        },
      };
      const objectStorage = {
        uploadFoto: vi.fn().mockResolvedValue('wareneintraege/neu'),
        deleteFoto: vi.fn().mockResolvedValue(undefined),
      };
      const service = new WareneintragService(prisma as never, objectStorage as never);
      const foto = { buffer: Buffer.from('neu'), mimetype: 'image/png' } as Express.Multer.File;

      await service.update('wareneintrag-1', { avvCodeId: 'avv-2', freitext: 'Aktualisierter Text' }, foto);

      expect(prisma.wareneintrag.findUniqueOrThrow).toHaveBeenCalledWith({ where: { id: 'wareneintrag-1' } });
      expect(objectStorage.deleteFoto).toHaveBeenCalledWith('wareneintraege/alt');
      expect(objectStorage.uploadFoto).toHaveBeenCalledWith(foto.buffer, 'image/png');
      expect(prisma.wareneintrag.update).toHaveBeenCalledWith({
        where: { id: 'wareneintrag-1' },
        data: { avvCodeId: 'avv-2', freitext: 'Aktualisierter Text', fotoUrl: 'wareneintraege/neu' },
      });
    });

    it('uploads the replacement photo with the actually detected type, not the declared mimetype', async () => {
      const prisma = {
        wareneintrag: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'wareneintrag-1', fotoUrl: 'wareneintraege/alt' }),
          update: vi.fn().mockResolvedValue({ id: 'wareneintrag-1' }),
        },
      };
      const objectStorage = {
        uploadFoto: vi.fn().mockResolvedValue('wareneintraege/neu'),
        deleteFoto: vi.fn().mockResolvedValue(undefined),
      };
      const service = new WareneintragService(prisma as never, objectStorage as never);
      const foto = { buffer: PNG_BYTES, mimetype: 'application/octet-stream' } as Express.Multer.File;

      await service.update('wareneintrag-1', { avvCodeId: 'avv-2', freitext: 'Aktualisierter Text' }, foto);

      expect(objectStorage.uploadFoto).toHaveBeenCalledWith(foto.buffer, 'image/png');
    });
  });

  describe('remove', () => {
    it('deletes the Wareneintrag and its photo from the object storage', async () => {
      const prisma = {
        wareneintrag: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'wareneintrag-1', fotoUrl: 'wareneintraege/foto-1' }),
          delete: vi.fn().mockResolvedValue({ id: 'wareneintrag-1' }),
        },
      };
      const objectStorage = { deleteFoto: vi.fn().mockResolvedValue(undefined) };
      const service = new WareneintragService(prisma as never, objectStorage as never);

      await service.remove('wareneintrag-1');

      expect(prisma.wareneintrag.findUniqueOrThrow).toHaveBeenCalledWith({ where: { id: 'wareneintrag-1' } });
      expect(objectStorage.deleteFoto).toHaveBeenCalledWith('wareneintraege/foto-1');
      expect(prisma.wareneintrag.delete).toHaveBeenCalledWith({ where: { id: 'wareneintrag-1' } });
    });
  });
});
