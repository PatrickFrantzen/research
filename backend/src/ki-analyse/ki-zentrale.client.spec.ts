import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GeminiFehler, GeminiKontingentErschoepft } from './gemini.client.js';
import { SYSTEM_PROMPT } from './ki-analyse.js';
import { KiZentraleClient } from './ki-zentrale.client.js';

const FOTOS = [
  { label: 'Fernansicht', daten: Buffer.from('fern'), mimeType: 'image/jpeg' },
  { label: 'Nahansicht', daten: Buffer.from('nah'), mimeType: 'image/png' },
];

const client = () =>
  new KiZentraleClient({ url: 'http://ki-zentrale:8080', token: 'app-token' });

// Die KI-Zentrale ist hier immer gemockt.
describe('KiZentraleClient', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    fetchMock.mockReset();
  });

  it('sendet Prompt, Kontext und beschriftete Fotos über Patricks Abo und liefert das JSON', async () => {
    fetchMock.mockResolvedValue(Response.json({ einschaetzung: 'ok' }));

    const antwort = await client().analysiere(FOTOS, 'AVV 17 01 01');

    expect(antwort).toEqual({ einschaetzung: 'ok' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://ki-zentrale:8080/erzeuge');
    expect((init!.headers as Record<string, string>)['authorization']).toBe(
      'Bearer app-token',
    );
    const body = JSON.parse(init!.body as string);
    expect(body).toMatchObject({
      zugang: 'patrick',
      anweisung: SYSTEM_PROMPT,
      text: 'AVV 17 01 01',
      bilder: [
        { label: 'Fernansicht', typ: 'image/jpeg', daten: 'ZmVybg==' },
        { label: 'Nahansicht', typ: 'image/png', daten: 'bmFo' },
      ],
    });
  });

  it('übersetzt das Gemini-Schema in ein striktes JSON-Schema', async () => {
    fetchMock.mockResolvedValue(Response.json({}));

    await client().analysiere(FOTOS, 'k');

    const { schema } = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
    expect(schema).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['fraktionen', 'einschaetzung', 'avvPruefung'],
      properties: {
        fraktionen: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'anteilProzent'],
            properties: {
              name: { type: 'string' },
              anteilProzent: { type: 'number' },
            },
          },
        },
        einschaetzung: { type: 'string' },
        avvPruefung: {
          type: 'object',
          additionalProperties: false,
          required: ['urteil', 'begruendung', 'vorgeschlagenerCode'],
          properties: {
            urteil: { type: 'string', enum: expect.any(Array) },
            begruendung: { type: 'string' },
            vorgeschlagenerCode: { type: ['string', 'null'] },
          },
        },
      },
    });
  });

  it('Notbremse der Zentrale (429): Kontingent erschöpft', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ meldung: 'Tageslimit' }, { status: 429 }),
    );

    await expect(client().analysiere(FOTOS, 'k')).rejects.toBeInstanceOf(
      GeminiKontingentErschoepft,
    );
  });

  it('andere Fehler, nicht erreichbar oder Antwort null: GeminiFehler', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ meldung: 'ausgelastet' }, { status: 503 }),
    );
    await expect(client().analysiere(FOTOS, 'k')).rejects.toBeInstanceOf(
      GeminiFehler,
    );

    fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await expect(client().analysiere(FOTOS, 'k')).rejects.toBeInstanceOf(
      GeminiFehler,
    );
  });
});
