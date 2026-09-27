import { ExecutionContext, INestApplication } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard.js';
import { GeminiClient } from '../src/ki-analyse/gemini.client.js';
import { KiAnalyseController } from '../src/ki-analyse/ki-analyse.controller.js';
import { KI_REDIS, KiAnalyseService } from '../src/ki-analyse/ki-analyse.service.js';
import { ObjectStorageService } from '../src/object-storage/object-storage.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { Protokoll } from '../src/protokoll/protokoll.js';
import { ProtokollInterceptor } from '../src/protokoll/protokoll.interceptor.js';

const API_KEY = 'geheimer-gemini-key';

// Nutzer kommt aus dem Header, damit das Limit pro Nutzer prüfbar ist.
class AlsNutzerAngemeldet {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const id = req.headers['x-test-nutzer'] ?? 'nutzer-1';
    req.user = { id, email: `${id}@research.local` };
    return true;
  }
}

// Endpunkt über HTTP mit echtem GeminiClient, nur fetch ist gemockt: kein
// echter API-Call, aber der Key-Pfad wird wirklich durchlaufen (Issue #93).
describe('KI-Analyse-Endpunkt', () => {
  let app: INestApplication;
  const protokoll = { aktivitaet: vi.fn() };
  const werte = new Map<string, number>();
  const vorschauen = new Map<string, string>();
  const upsert = vi.fn(async (args: { create: object }) => ({ ...args.create, analysiertVon: { vorname: 'Erika', nachname: 'Musterfrau' } }));
  const fetchMock = vi.fn<typeof fetch>();

  beforeAll(async () => {
    vi.stubGlobal('fetch', fetchMock);
    const moduleRef = await Test.createTestingModule({
      controllers: [KiAnalyseController],
      providers: [
        KiAnalyseService,
        {
          provide: GeminiClient,
          useValue: new GeminiClient({ apiKey: API_KEY, model: 'gemini-test-flash', apiUrl: 'https://generativelanguage.googleapis.com/v1beta' }),
        },
        {
          provide: KI_REDIS,
          useValue: {
            incr: async (key: string) => {
              werte.set(key, (werte.get(key) ?? 0) + 1);
              return werte.get(key);
            },
            expire: async () => 1,
            set: async (key: string, wert: string) => vorschauen.set(key, wert) && 'OK',
            get: async (key: string) => vorschauen.get(key) ?? null,
            del: async (key: string) => Number(vorschauen.delete(key)),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            wareneintrag: {
              findUnique: async () => ({
                fotoFernUrl: 'wareneintraege/fern',
                fotoNahUrl: null,
                fotoDetailUrl: null,
                freitext: 'Text',
                avvCode: { code: '17 01 01', bezeichnung: 'Beton' },
              }),
            },
            wareneintragAnalyse: { upsert },
          },
        },
        { provide: ObjectStorageService, useValue: { ladeFoto: async () => ({ daten: Buffer.from('bild'), mimeType: 'image/jpeg' }) } },
        { provide: Protokoll, useValue: protokoll },
        { provide: APP_INTERCEPTOR, useClass: ProtokollInterceptor },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(AlsNutzerAngemeldet)
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    await app.close();
  });

  const antwort = (text: string, status = 200) =>
    new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status });

  it('returns the preview and logs the analysis without leaking the key', async () => {
    fetchMock.mockResolvedValueOnce(antwort('{"fraktionen":[{"name":"Beton","anteilProzent":100}],"einschaetzung":"Beton.","avvPruefung":{"urteil":"passt","begruendung":"Passt.","vorgeschlagenerCode":null}}'));

    const response = await request(app.getHttpServer()).post('/api/v1/wareneintraege/wareneintrag-1/ki-analyse');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      fraktionen: [{ name: 'Beton', anteilProzent: 100 }],
      einschaetzung: 'Beton.',
      avvPruefung: { urteil: 'passt', begruendung: 'Passt.', vorschlag: null },
    });
    expect(response.text).not.toContain(API_KEY);
    expect(protokoll.aktivitaet).toHaveBeenCalledWith(['nutzer-1@research.local', 'KI-Analyse', 'wareneintrag-1']);
  });

  it.each([
    [429, 'Tageskontingent der KI-Analyse erschöpft, bitte morgen erneut versuchen.'],
    [500, 'Die KI-Analyse ist fehlgeschlagen. Bitte später erneut versuchen.'],
  ])('answers a Gemini status %i with its message and without the key', async (status, meldung) => {
    fetchMock.mockResolvedValueOnce(new Response(`{"error":"${API_KEY}"}`, { status }));

    const response = await request(app.getHttpServer())
      .post('/api/v1/wareneintraege/wareneintrag-1/ki-analyse')
      .set('x-test-nutzer', `nutzer-status-${status}`);

    expect(response.body.message).toBe(meldung);
    expect(response.text).not.toContain(API_KEY);
  });

  it('throttles to 5 analyses per minute per Nutzer', async () => {
    fetchMock.mockImplementation(async () => antwort('{"fraktionen":[],"einschaetzung":"Leer.","avvPruefung":{"urteil":"passt","begruendung":"Passt.","vorgeschlagenerCode":null}}'));
    const analysiere = (nutzer: string) =>
      request(app.getHttpServer()).post('/api/v1/wareneintraege/wareneintrag-1/ki-analyse').set('x-test-nutzer', nutzer);

    for (let i = 0; i < 5; i++) expect((await analysiere('vielnutzer')).status).toBe(200);
    expect((await analysiere('vielnutzer')).status).toBe(429);
    expect((await analysiere('andere-nutzerin')).status).toBe(200);
  });

  it('saves only the server-side preview, ignoring manipulated values in the request body', async () => {
    fetchMock.mockResolvedValueOnce(antwort('{"fraktionen":[{"name":"Holz","anteilProzent":100}],"einschaetzung":"Holz.","avvPruefung":{"urteil":"passt","begruendung":"Passt.","vorgeschlagenerCode":null}}'));
    const server = app.getHttpServer();
    await request(server).post('/api/v1/wareneintraege/wareneintrag-1/ki-analyse').set('x-test-nutzer', 'speichernde');

    const response = await request(server)
      .put('/api/v1/wareneintraege/wareneintrag-1/ki-analyse')
      .set('x-test-nutzer', 'speichernde')
      .send({ ergebnis: { fraktionen: [{ name: 'Gold', anteilProzent: 100 }], einschaetzung: 'Wertvoll.' }, analysiertVonId: 'jemand-anders' });

    expect(response.status).toBe(200);
    expect(upsert).toHaveBeenCalledOnce();
    const { create } = upsert.mock.calls[0][0] as unknown as { create: { ergebnis: unknown; analysiertVonId: string } };
    expect(create.ergebnis).toMatchObject({ fraktionen: [{ name: 'Holz', anteilProzent: 100 }], einschaetzung: 'Holz.' });
    expect(create.analysiertVonId).toBe('speichernde');
    expect(protokoll.aktivitaet).toHaveBeenCalledWith(['speichernde@research.local', 'KI-Analyse gespeichert', 'wareneintrag-1']);

    // Die Vorschau ist verbraucht: ein zweites Speichern ohne neue Analyse scheitert.
    const nochmal = await request(server).put('/api/v1/wareneintraege/wareneintrag-1/ki-analyse').set('x-test-nutzer', 'speichernde');
    expect(nochmal.status).toBe(400);
  });
});
