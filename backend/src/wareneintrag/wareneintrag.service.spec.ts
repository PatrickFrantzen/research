import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '../generated/prisma/client.js';
import { WareneintragService } from './wareneintrag.service.js';

describe('WareneintragService', () => {
  describe('findAll', () => {
    it('returns a page of Wareneintraege and the total number of matching entries', async () => {
      const prisma = {
        wareneintrag: {
          findMany: vi.fn().mockResolvedValue([
            { id: 'wareneintrag-21', fotoFernUrl: 'wareneintraege/foto-21', fotoNahUrl: null, fotoDetailUrl: null },
          ]),
          count: vi.fn().mockResolvedValue(41),
        },
      };
      const objectStorage = { getSignedUrl: vi.fn().mockResolvedValue('https://minio.local/foto-21') };
      const service = new WareneintragService(prisma as never, objectStorage as never);

      const ergebnis = await service.findAll({ seite: 1, proSeite: 20 });

      expect(prisma.wareneintrag.findMany).toHaveBeenCalledWith({
        where: undefined,
        include: {
          avvCode: { select: { id: true, code: true, bezeichnung: true } },
          standort: { select: { id: true, name: true } },
          erfasstVon: { select: { id: true, vorname: true, nachname: true } },
        },
        orderBy: [{ erstelltAm: 'desc' }, { id: 'desc' }],
        skip: 20,
        take: 20,
      });
      expect(prisma.wareneintrag.count).toHaveBeenCalledWith({ where: undefined });
      expect(ergebnis).toEqual({
        daten: [
          {
            id: 'wareneintrag-21',
            fotoFernUrl: 'https://minio.local/foto-21',
            fotoNahUrl: null,
            fotoDetailUrl: null,
          },
        ],
        gesamt: 41,
      });
    });

    it('lists all Wareneintraege when no filter is given', async () => {
      const prisma = { wareneintrag: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) } };
      const service = new WareneintragService(prisma as never, {} as never);

      await service.findAll({});

      expect(prisma.wareneintrag.findMany).toHaveBeenCalledWith({
        where: undefined,
        include: {
          avvCode: { select: { id: true, code: true, bezeichnung: true } },
          standort: { select: { id: true, name: true } },
          erfasstVon: { select: { id: true, vorname: true, nachname: true } },
        },
        orderBy: [{ erstelltAm: 'desc' }, { id: 'desc' }],
        skip: 0,
        take: 20,
      });
    });

    it('leaves photo fields null when no photo was uploaded for that view, instead of signing a URL', async () => {
      const prisma = {
        wareneintrag: {
          findMany: vi
            .fn()
            .mockResolvedValue([{ id: 'wareneintrag-1', fotoFernUrl: null, fotoNahUrl: null, fotoDetailUrl: null }]),
          count: vi.fn().mockResolvedValue(1),
        },
      };
      const objectStorage = { getSignedUrl: vi.fn() };
      const service = new WareneintragService(prisma as never, objectStorage as never);

      const ergebnis = await service.findAll({});

      expect(objectStorage.getSignedUrl).not.toHaveBeenCalled();
      expect(ergebnis.daten[0]).toEqual({
        id: 'wareneintrag-1',
        fotoFernUrl: null,
        fotoNahUrl: null,
        fotoDetailUrl: null,
      });
    });

    it('returns the assigned AVV-Code (including id, for pre-selecting it when editing) for every listed Wareneintrag', async () => {
      const prisma = {
        wareneintrag: {
          findMany: vi.fn().mockImplementation((args: { include?: unknown }) =>
            Promise.resolve([
              {
                id: 'wareneintrag-1',
                fotoFernUrl: 'wareneintraege/foto-1',
                fotoNahUrl: null,
                fotoDetailUrl: null,
                ...(args.include ? { avvCode: { id: 'avv-1', code: '17 01 01', bezeichnung: 'Beton' } } : {}),
              },
            ]),
          ),
          count: vi.fn().mockResolvedValue(1),
        },
      };
      const objectStorage = { getSignedUrl: vi.fn().mockResolvedValue('https://minio.local/foto-1') };
      const service = new WareneintragService(prisma as never, objectStorage as never);

      const ergebnis = await service.findAll({});

      expect(ergebnis.daten[0]).toMatchObject({ avvCode: { id: 'avv-1', code: '17 01 01', bezeichnung: 'Beton' } });
    });

    it('replaces the stored object-storage key with a time-limited, retrievable URL – Issue #45', async () => {
      const prisma = {
        wareneintrag: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: 'wareneintrag-1',
              fotoFernUrl: 'wareneintraege/foto-1',
              fotoNahUrl: null,
              fotoDetailUrl: null,
              freitext: 'x',
            },
          ]),
          count: vi.fn().mockResolvedValue(1),
        },
      };
      const objectStorage = { getSignedUrl: vi.fn().mockResolvedValue('https://minio.local/signed-foto-1') };
      const service = new WareneintragService(prisma as never, objectStorage as never);

      const ergebnis = await service.findAll({});

      expect(objectStorage.getSignedUrl).toHaveBeenCalledWith('wareneintraege/foto-1');
      expect(ergebnis).toEqual({
        daten: [
          {
            id: 'wareneintrag-1',
            fotoFernUrl: 'https://minio.local/signed-foto-1',
            fotoNahUrl: null,
            fotoDetailUrl: null,
            freitext: 'x',
          },
        ],
        gesamt: 1,
      });
    });

    it('filters by avvCodeId when given', async () => {
      const prisma = { wareneintrag: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) } };
      const service = new WareneintragService(prisma as never, {} as never);

      await service.findAll({ avvCodeId: 'avv-1' });

      expect(prisma.wareneintrag.findMany).toHaveBeenCalledWith({
        where: { avvCodeId: 'avv-1' },
        include: {
          avvCode: { select: { id: true, code: true, bezeichnung: true } },
          standort: { select: { id: true, name: true } },
          erfasstVon: { select: { id: true, vorname: true, nachname: true } },
        },
        orderBy: [{ erstelltAm: 'desc' }, { id: 'desc' }],
        skip: 0,
        take: 20,
      });
    });

    it('filters by standortId when given, combined with avvCodeId', async () => {
      const prisma = { wareneintrag: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) } };
      const service = new WareneintragService(prisma as never, {} as never);

      await service.findAll({ avvCodeId: 'avv-1', standortId: 'standort-2' });

      expect(prisma.wareneintrag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { avvCodeId: 'avv-1', standortId: 'standort-2' } }),
      );
      expect(prisma.wareneintrag.count).toHaveBeenCalledWith({ where: { avvCodeId: 'avv-1', standortId: 'standort-2' } });
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
      expect(sql).toContain('"fotoFernUrl"');
      expect(sql).toContain('"avvCodeId"');
      expect(sql).toContain('"erstelltAm"');
      expect(sql).toContain('"standort"');
      expect(sql).toContain('"erfasstVon"');
    });

    it('finds a Wareneintrag when the search term is only the beginning of a word', async () => {
      const prisma = {
        $queryRaw: vi.fn().mockImplementation((strings: TemplateStringsArray, ...values: unknown[]) => {
          const sql = strings.join('?');
          const usesPrefixSearch = sql.includes("to_tsquery('german'") && values.includes('tes:*');
          return usesPrefixSearch
            ? [
                {
                  id: 'wareneintrag-1',
                  fotoFernUrl: 'wareneintraege/foto-1',
                  fotoNahUrl: null,
                  fotoDetailUrl: null,
                  freitext: 'test',
                  gesamt: 1n,
                },
              ]
            : [];
        }),
      };
      const objectStorage = { getSignedUrl: vi.fn().mockResolvedValue('https://minio.local/foto-1') };
      const service = new WareneintragService(prisma as never, objectStorage as never);

      const ergebnis = await service.findAll({ suche: 'tes' });

      expect(ergebnis).toEqual({
        daten: [
          {
            id: 'wareneintrag-1',
            fotoFernUrl: 'https://minio.local/foto-1',
            fotoNahUrl: null,
            fotoDetailUrl: null,
            freitext: 'test',
          },
        ],
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

    it('combines the standortId filter with the full-text search', async () => {
      const prisma = { $queryRaw: vi.fn().mockResolvedValue([]) };
      const service = new WareneintragService(prisma as never, {} as never);

      await service.findAll({ standortId: 'standort-2', suche: 'Bauschutt' });

      const [, ...values] = prisma.$queryRaw.mock.calls[0];
      const fragmente = values.filter((value: unknown) => value instanceof Prisma.Sql) as InstanceType<typeof Prisma.Sql>[];
      const standortFragment = fragmente.find((fragment) => fragment.sql.includes('standort_id'));
      expect(standortFragment?.values).toEqual(['standort-2']);
      expect(values).toContain('Bauschutt');
    });
  });

  // Minimaler gültiger PNG-Header, den `file-type` als image/png erkennt.
  const PNG_BYTES = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
  ]);

  describe('create', () => {
    it('creates a Wareneintrag with all three fotos and the current Nutzer-Standort as snapshot', async () => {
      const prisma = {
        nutzer: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'nutzer-1', standortId: 'standort-1' }) },
        wareneintrag: { create: vi.fn().mockResolvedValue({ id: 'wareneintrag-1' }) },
      };
      const objectStorage = {
        uploadFoto: vi
          .fn()
          .mockResolvedValueOnce('wareneintraege/fern')
          .mockResolvedValueOnce('wareneintraege/nah')
          .mockResolvedValueOnce('wareneintraege/detail'),
      };
      const service = new WareneintragService(prisma as never, objectStorage as never);

      const fotoFern = { buffer: Buffer.from('fern'), mimetype: 'image/jpeg' } as Express.Multer.File;
      const fotoNah = { buffer: Buffer.from('nah'), mimetype: 'image/jpeg' } as Express.Multer.File;
      const fotoDetail = { buffer: Buffer.from('detail'), mimetype: 'image/jpeg' } as Express.Multer.File;
      await service.create('nutzer-1', { avvCodeId: 'avv-1', freitext: 'Bauschutt am Eingang' }, {
        fotoFern,
        fotoNah,
        fotoDetail,
      });

      expect(objectStorage.uploadFoto).toHaveBeenCalledTimes(3);
      expect(prisma.wareneintrag.create).toHaveBeenCalledWith({
        data: {
          fotoFernUrl: 'wareneintraege/fern',
          fotoNahUrl: 'wareneintraege/nah',
          fotoDetailUrl: 'wareneintraege/detail',
          avvCodeId: 'avv-1',
          freitext: 'Bauschutt am Eingang',
          erfasstVonId: 'nutzer-1',
          standortId: 'standort-1',
        },
      });
    });

    it('creates a Wareneintrag with no fotos at all, since photos are optional', async () => {
      const prisma = {
        nutzer: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'nutzer-1', standortId: 'standort-1' }) },
        wareneintrag: { create: vi.fn().mockResolvedValue({ id: 'wareneintrag-1' }) },
      };
      const objectStorage = { uploadFoto: vi.fn() };
      const service = new WareneintragService(prisma as never, objectStorage as never);

      await service.create('nutzer-1', { avvCodeId: 'avv-1', freitext: 'Bauschutt am Eingang' }, {});

      expect(objectStorage.uploadFoto).not.toHaveBeenCalled();
      expect(prisma.wareneintrag.create).toHaveBeenCalledWith({
        data: {
          fotoFernUrl: undefined,
          fotoNahUrl: undefined,
          fotoDetailUrl: undefined,
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
      const fotoFern = { buffer: PNG_BYTES, mimetype: 'text/html' } as Express.Multer.File;
      await service.create('nutzer-1', { avvCodeId: 'avv-1', freitext: 'Bauschutt am Eingang' }, { fotoFern });

      expect(objectStorage.uploadFoto).toHaveBeenCalledWith(fotoFern.buffer, 'image/png');
    });
  });

  describe('update', () => {
    it('updates avvCodeId and freitext without touching photos when no new foto is given', async () => {
      const prisma = {
        wareneintrag: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({
            id: 'wareneintrag-1',
            erfasstVonId: 'nutzer-1',
            fotoFernUrl: 'wareneintraege/fern',
            fotoNahUrl: null,
            fotoDetailUrl: null,
          }),
          update: vi.fn().mockResolvedValue({ id: 'wareneintrag-1' }),
        },
      };
      const objectStorage = { uploadFoto: vi.fn(), deleteFoto: vi.fn() };
      const service = new WareneintragService(prisma as never, objectStorage as never);

      await service.update('wareneintrag-1', 'nutzer-1', { avvCodeId: 'avv-2', freitext: 'Aktualisierter Text' }, {});

      expect(objectStorage.uploadFoto).not.toHaveBeenCalled();
      expect(objectStorage.deleteFoto).not.toHaveBeenCalled();
      expect(prisma.wareneintrag.update).toHaveBeenCalledWith({
        where: { id: 'wareneintrag-1' },
        data: {
          avvCodeId: 'avv-2',
          freitext: 'Aktualisierter Text',
          fotoFernUrl: 'wareneintraege/fern',
          fotoNahUrl: null,
          fotoDetailUrl: null,
        },
      });
    });

    it('replaces only the given photo, deleting the old one, and leaves the others untouched', async () => {
      const prisma = {
        wareneintrag: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({
            id: 'wareneintrag-1',
            erfasstVonId: 'nutzer-1',
            fotoFernUrl: 'wareneintraege/alt',
            fotoNahUrl: null,
            fotoDetailUrl: null,
          }),
          update: vi.fn().mockResolvedValue({ id: 'wareneintrag-1' }),
        },
      };
      const objectStorage = {
        uploadFoto: vi.fn().mockResolvedValue('wareneintraege/neu'),
        deleteFoto: vi.fn().mockResolvedValue(undefined),
      };
      const service = new WareneintragService(prisma as never, objectStorage as never);
      const fotoFern = { buffer: Buffer.from('neu'), mimetype: 'image/png' } as Express.Multer.File;

      await service.update(
        'wareneintrag-1',
        'nutzer-1',
        { avvCodeId: 'avv-2', freitext: 'Aktualisierter Text' },
        { fotoFern },
      );

      expect(objectStorage.deleteFoto).toHaveBeenCalledOnce();
      expect(objectStorage.deleteFoto).toHaveBeenCalledWith('wareneintraege/alt');
      expect(objectStorage.uploadFoto).toHaveBeenCalledOnce();
      expect(objectStorage.uploadFoto).toHaveBeenCalledWith(fotoFern.buffer, 'image/png');
      expect(prisma.wareneintrag.update).toHaveBeenCalledWith({
        where: { id: 'wareneintrag-1' },
        data: {
          avvCodeId: 'avv-2',
          freitext: 'Aktualisierter Text',
          fotoFernUrl: 'wareneintraege/neu',
          fotoNahUrl: null,
          fotoDetailUrl: null,
        },
      });
    });

    it('rejects when the acting user did not create the Wareneintrag', async () => {
      const prisma = {
        wareneintrag: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'wareneintrag-1', erfasstVonId: 'nutzer-1' }),
        },
      };
      const service = new WareneintragService(prisma as never, {} as never);

      await expect(
        service.update('wareneintrag-1', 'anderer-nutzer', { avvCodeId: 'avv-2', freitext: 'x' }, {}),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('deletes the Wareneintrag and all of its uploaded photos from the object storage', async () => {
      const prisma = {
        wareneintrag: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({
            id: 'wareneintrag-1',
            erfasstVonId: 'nutzer-1',
            fotoFernUrl: 'wareneintraege/fern',
            fotoNahUrl: 'wareneintraege/nah',
            fotoDetailUrl: null,
          }),
          delete: vi.fn().mockResolvedValue({ id: 'wareneintrag-1' }),
        },
      };
      const objectStorage = { deleteFoto: vi.fn().mockResolvedValue(undefined) };
      const service = new WareneintragService(prisma as never, objectStorage as never);

      await service.remove('wareneintrag-1', 'nutzer-1');

      expect(objectStorage.deleteFoto).toHaveBeenCalledWith('wareneintraege/fern');
      expect(objectStorage.deleteFoto).toHaveBeenCalledWith('wareneintraege/nah');
      expect(objectStorage.deleteFoto).toHaveBeenCalledTimes(2);
      expect(prisma.wareneintrag.delete).toHaveBeenCalledWith({ where: { id: 'wareneintrag-1' } });
    });

    it('rejects when the acting user did not create the Wareneintrag', async () => {
      const prisma = {
        wareneintrag: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'wareneintrag-1', erfasstVonId: 'nutzer-1' }),
        },
      };
      const service = new WareneintragService(prisma as never, {} as never);

      await expect(service.remove('wareneintrag-1', 'anderer-nutzer')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
