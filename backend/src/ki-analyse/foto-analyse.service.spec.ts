import { describe, expect, it, vi } from 'vitest';
import { GeminiFehler } from './gemini.client.js';
import {
  FotoAnalyseService,
  fotoVorschauSchluessel,
} from './foto-analyse.service.js';
import { FOTO_SYSTEM_PROMPT } from './ki-analyse.js';

const FOTO = { daten: Buffer.from('jpeg'), mimeType: 'image/jpeg' };

const ANTWORT = {
  fraktionen: [{ name: 'Holz', anteilProzent: 100 }],
  einschaetzung: 'Nur Holz.',
  avvPruefung: {
    urteil: 'passt',
    begruendung: 'Unbehandeltes Holz.',
    vorgeschlagenerCode: '170201',
  },
};

function erstelle(ki: () => Promise<unknown> = async () => ANTWORT) {
  const werte = new Map<string, string>();
  const redis = {
    werte,
    incr: vi.fn(async () => 1),
    expire: vi.fn(async () => 1),
    set: vi.fn(async (key: string, wert: string) => {
      werte.set(key, wert);
      return 'OK';
    }),
    get: vi.fn(async (key: string) => werte.get(key) ?? null),
    del: vi.fn(async (key: string) => Number(werte.delete(key))),
  };
  const prisma = {
    avvCode: {
      findUnique: vi.fn(async ({ where }: { where: { code: string } }) =>
        where.code === '17 02 01'
          ? { code: '17 02 01', bezeichnung: 'Holz', gefaehrlich: false }
          : null,
      ),
    },
    nutzer: {
      findUniqueOrThrow: vi.fn(async () => ({
        vorname: 'Max',
        email: 'max@research.local',
      })),
    },
  };
  const kiClient = { analysiere: vi.fn(ki) };
  const mailer = { sendFotoAnalyse: vi.fn(async () => undefined) };
  const service = new FotoAnalyseService(
    prisma as never,
    kiClient as never,
    redis as never,
    mailer as never,
  );
  return { service, redis, prisma, kiClient, mailer };
}

describe('FotoAnalyseService', () => {
  it('analysiert das Foto mit dem Foto-Prompt und liefert den geprüften AVV-Vorschlag', async () => {
    const { service, kiClient, redis } = erstelle();

    const ergebnis = await service.analysiere(FOTO, 'nutzer-1');

    expect(kiClient.analysiere).toHaveBeenCalledWith(
      [{ label: 'Foto', ...FOTO }],
      expect.any(String),
      FOTO_SYSTEM_PROMPT,
    );
    expect(ergebnis).toEqual({
      fraktionen: [{ name: 'Holz', anteilProzent: 100 }],
      einschaetzung: 'Nur Holz.',
      avvVorschlag: {
        code: '17 02 01',
        bezeichnung: 'Holz',
        gefaehrlich: false,
        begruendung: 'Unbehandeltes Holz.',
      },
    });
    expect(
      JSON.parse(redis.werte.get(fotoVorschauSchluessel('nutzer-1'))!),
    ).toEqual(ergebnis);
  });

  it('verwirft Codes, die es in avv_codes nicht gibt', async () => {
    const { service } = erstelle(async () => ({
      ...ANTWORT,
      avvPruefung: { ...ANTWORT.avvPruefung, vorgeschlagenerCode: '999999' },
    }));

    expect((await service.analysiere(FOTO, 'nutzer-1')).avvVorschlag).toBe(
      null,
    );
  });

  it('zählt auf das gemeinsame KI-Limit', async () => {
    const { service, redis } = erstelle();
    redis.incr.mockResolvedValue(6);

    await expect(service.analysiere(FOTO, 'nutzer-1')).rejects.toMatchObject({
      status: 429,
    });
  });

  it('meldet einen KI-Fehler als 502', async () => {
    const { service } = erstelle(async () => {
      throw new GeminiFehler();
    });

    await expect(service.analysiere(FOTO, 'nutzer-1')).rejects.toMatchObject({
      status: 502,
    });
  });

  it('schickt die Analyse aus Redis an die eigene Adresse und räumt danach auf', async () => {
    const { service, mailer, redis } = erstelle();
    await service.analysiere(FOTO, 'nutzer-1');

    await service.sende(FOTO, 'nutzer-1');

    expect(mailer.sendFotoAnalyse).toHaveBeenCalledWith(
      'max@research.local',
      expect.stringContaining('AVV-Vorschlag: 17 02 01 – Holz'),
      FOTO,
    );
    expect(redis.werte.has(fotoVorschauSchluessel('nutzer-1'))).toBe(false);
  });

  it('löscht die Vorschau beim Verwerfen', async () => {
    const { service, redis } = erstelle();
    await service.analysiere(FOTO, 'nutzer-1');

    await service.verwerfe('nutzer-1');

    expect(redis.werte.has(fotoVorschauSchluessel('nutzer-1'))).toBe(false);
  });

  it('lehnt das Senden ohne aktuelle Analyse ab', async () => {
    const { service, mailer } = erstelle();

    await expect(service.sende(FOTO, 'nutzer-1')).rejects.toMatchObject({
      status: 400,
    });
    expect(mailer.sendFotoAnalyse).not.toHaveBeenCalled();
  });
});
