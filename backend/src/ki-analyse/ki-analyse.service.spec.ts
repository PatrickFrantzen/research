import { describe, expect, it, vi } from 'vitest';
import { GeminiFehler, GeminiKontingentErschoepft, GeminiNichtEingerichtet } from './gemini.client.js';
import { KiAnalyseService, MAX_FOTOS_BYTES, vorschauSchluessel } from './ki-analyse.service.js';

const WARENEINTRAG = {
  id: 'wareneintrag-1',
  fotoFernUrl: 'wareneintraege/fern',
  fotoNahUrl: null,
  fotoDetailUrl: 'wareneintraege/detail',
  freitext: 'Bauschutt am Eingang',
  avvCode: { code: '17 01 01', bezeichnung: 'Beton' },
};

const ANTWORT = {
  fraktionen: [
    { name: 'Holz', anteilProzent: 33.3 },
    { name: 'Beton', anteilProzent: 66.7 },
  ],
  einschaetzung: 'Überwiegend Beton.',
};

// Minimaler Redis-Ersatz: genau die Befehle, die der Service nutzt.
function fakeRedis() {
  const werte = new Map<string, string>();
  return {
    werte,
    incr: vi.fn(async (key: string) => {
      const neu = Number(werte.get(key) ?? 0) + 1;
      werte.set(key, String(neu));
      return neu;
    }),
    expire: vi.fn(async () => 1),
    set: vi.fn(async (key: string, wert: string) => {
      werte.set(key, wert);
      return 'OK';
    }),
  };
}

function erstelle(optionen: { wareneintrag?: unknown; gemini?: () => Promise<unknown>; fotoBytes?: number } = {}) {
  const redis = fakeRedis();
  const gemini = { analysiere: vi.fn(optionen.gemini ?? (async () => ANTWORT)) };
  const objectStorage = {
    ladeFoto: vi.fn(async () => ({ daten: Buffer.alloc(optionen.fotoBytes ?? 10), mimeType: 'image/jpeg' })),
  };
  const prisma = {
    wareneintrag: { findUnique: vi.fn(async () => ('wareneintrag' in optionen ? optionen.wareneintrag : WARENEINTRAG)) },
  };
  const service = new KiAnalyseService(prisma as never, objectStorage as never, gemini as never, redis as never);
  return { service, redis, gemini, objectStorage };
}

describe('KiAnalyseService', () => {
  it('sends all existing fotos with context in one request and returns the rounded result', async () => {
    const { service, gemini } = erstelle();

    const ergebnis = await service.analysiere('wareneintrag-1', 'nutzer-1');

    expect(gemini.analysiere).toHaveBeenCalledOnce();
    const [fotos, kontext] = gemini.analysiere.mock.calls[0] as unknown as [{ label: string }[], string];
    expect(fotos.map((foto) => foto.label)).toEqual(['Fernansicht', 'Detailansicht']);
    expect(kontext).toContain('17 01 01 Beton');
    expect(kontext).toContain('Bauschutt am Eingang');
    expect(ergebnis).toEqual({
      fraktionen: [
        { name: 'Beton', anteilProzent: 67 },
        { name: 'Holz', anteilProzent: 33 },
      ],
      einschaetzung: 'Überwiegend Beton.',
    });
  });

  it('stores the preview in Redis per Wareneintrag and Nutzer with a 1 h TTL', async () => {
    const { service, redis } = erstelle();

    const ergebnis = await service.analysiere('wareneintrag-1', 'nutzer-1');

    expect(redis.set).toHaveBeenCalledWith(vorschauSchluessel('wareneintrag-1', 'nutzer-1'), JSON.stringify(ergebnis), 'EX', 3600);
  });

  it('allows 5 analyses per minute per Nutzer, then answers 429', async () => {
    const { service, gemini } = erstelle();
    for (let i = 0; i < 5; i++) await service.analysiere('wareneintrag-1', 'nutzer-1');

    await expect(service.analysiere('wareneintrag-1', 'nutzer-1')).rejects.toMatchObject({ status: 429 });
    await expect(service.analysiere('wareneintrag-1', 'nutzer-2')).resolves.toBeDefined();
    expect(gemini.analysiere).toHaveBeenCalledTimes(6);
  });

  it('rejects a Wareneintrag without fotos before calling Gemini', async () => {
    const { service, gemini } = erstelle({ wareneintrag: { ...WARENEINTRAG, fotoFernUrl: null, fotoDetailUrl: null } });
    await expect(service.analysiere('wareneintrag-1', 'nutzer-1')).rejects.toMatchObject({ status: 400 });
    expect(gemini.analysiere).not.toHaveBeenCalled();
  });

  it('answers 404 for an unknown Wareneintrag', async () => {
    const { service } = erstelle({ wareneintrag: null });
    await expect(service.analysiere('gibt-es-nicht', 'nutzer-1')).rejects.toMatchObject({ status: 404 });
  });

  it('rejects old fotos that are too large for one request with a clear message', async () => {
    const { service, gemini } = erstelle({ fotoBytes: MAX_FOTOS_BYTES / 2 + 1 });
    await expect(service.analysiere('wareneintrag-1', 'nutzer-1')).rejects.toMatchObject({
      status: 422,
      message: expect.stringContaining('zu groß'),
    });
    expect(gemini.analysiere).not.toHaveBeenCalled();
  });

  it('maps an exhausted Gemini quota to the daily quota message', async () => {
    const { service } = erstelle({ gemini: async () => Promise.reject(new GeminiKontingentErschoepft()) });
    await expect(service.analysiere('wareneintrag-1', 'nutzer-1')).rejects.toMatchObject({
      status: 429,
      message: 'Tageskontingent der KI-Analyse erschöpft, bitte morgen erneut versuchen.',
    });
  });

  it.each([
    ['timeout or network error', async () => Promise.reject(new GeminiFehler())],
    ['answer not matching the schema', async () => ({ fraktionen: 'Holz' })],
  ])('answers with a general error and stores nothing on %s', async (_, gemini) => {
    const { service, redis } = erstelle({ gemini });
    await expect(service.analysiere('wareneintrag-1', 'nutzer-1')).rejects.toMatchObject({
      status: 502,
      message: 'Die KI-Analyse ist fehlgeschlagen. Bitte später erneut versuchen.',
    });
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('answers 503 when no API key is configured', async () => {
    const { service } = erstelle({ gemini: async () => Promise.reject(new GeminiNichtEingerichtet()) });
    await expect(service.analysiere('wareneintrag-1', 'nutzer-1')).rejects.toMatchObject({ status: 503 });
  });
});
