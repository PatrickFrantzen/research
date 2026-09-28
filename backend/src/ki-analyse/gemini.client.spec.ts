import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GeminiClient,
  GeminiFehler,
  GeminiKontingentErschoepft,
  GeminiNichtEingerichtet,
} from './gemini.client.js';

const FOTO = {
  label: 'Fernansicht',
  daten: Buffer.from('bild'),
  mimeType: 'image/jpeg',
};

function geminiAntwort(text: string, status = 200) {
  return new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }),
    { status },
  );
}

const client = () =>
  new GeminiClient(
    {
      apiKey: 'geheimer-key',
      model: 'gemini-test-flash',
      apiUrl: 'https://generativelanguage.googleapis.com/v1beta',
    },
    0,
  );

const ueberlastet = () =>
  new Response(
    JSON.stringify({
      error: {
        code: 503,
        status: 'UNAVAILABLE',
        message: 'The model is overloaded.',
      },
    }),
    { status: 503 },
  );

// Gemini ist hier immer gemockt: kein echter API-Call in CI (Issue #93).
describe('GeminiClient', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    fetchMock.mockReset();
  });

  it('sends prompt, schema and fotos in one request with the key only in the header', async () => {
    fetchMock.mockResolvedValue(
      geminiAntwort('{"fraktionen":[],"einschaetzung":"leer"}'),
    );

    const ergebnis = await client().analysiere([FOTO], 'Kontext');

    expect(ergebnis).toEqual({ fraktionen: [], einschaetzung: 'leer' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-test-flash:generateContent',
    );
    expect(String(url)).not.toContain('geheimer-key');
    expect((init!.headers as Record<string, string>)['x-goog-api-key']).toBe(
      'geheimer-key',
    );
    const body = JSON.parse(String(init?.body));
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.generationConfig.responseSchema.required).toEqual([
      'fraktionen',
      'einschaetzung',
      'avvPruefung',
    ]);
    expect(body.contents[0].parts).toContainEqual({
      inlineData: {
        mimeType: 'image/jpeg',
        data: FOTO.daten.toString('base64'),
      },
    });
  });

  it('maps 429 to an exhausted quota', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 429 }));
    await expect(client().analysiere([FOTO], 'x')).rejects.toBeInstanceOf(
      GeminiKontingentErschoepft,
    );
  });

  it('maps timeouts and network errors to a general error', async () => {
    fetchMock.mockRejectedValue(
      new DOMException('Zeit abgelaufen', 'TimeoutError'),
    );
    await expect(client().analysiere([FOTO], 'x')).rejects.toBeInstanceOf(
      GeminiFehler,
    );
  });

  it('retries once on 503 (model overloaded) and returns the second answer', async () => {
    const warn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    fetchMock
      .mockResolvedValueOnce(ueberlastet())
      .mockResolvedValueOnce(
        geminiAntwort('{"fraktionen":[],"einschaetzung":"ok"}'),
      );

    await expect(client().analysiere([FOTO], 'x')).resolves.toEqual({
      fraktionen: [],
      einschaetzung: 'ok',
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1]?.body).toBe(
      fetchMock.mock.calls[0][1]?.body,
    );
    expect(warn).toHaveBeenCalledWith(
      'Gemini 503 UNAVAILABLE: The model is overloaded., Versuch 2 in 0 ms',
    );
  });

  it("gives up after the second 503 and logs Google's reason without the key", async () => {
    const warn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    fetchMock.mockImplementation(async () => ueberlastet());

    await expect(client().analysiere([FOTO], 'x')).rejects.toBeInstanceOf(
      GeminiFehler,
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenLastCalledWith(
      'Gemini 503 UNAVAILABLE: The model is overloaded.',
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain('geheimer-key');
  });

  it('does not retry on 429 or 400', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 429 }));
    await expect(client().analysiere([FOTO], 'x')).rejects.toBeInstanceOf(
      GeminiKontingentErschoepft,
    );
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 400 }));
    await expect(client().analysiere([FOTO], 'x')).rejects.toBeInstanceOf(
      GeminiFehler,
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('maps other error statuses and non-JSON answers to a general error', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 502 }));
    await expect(client().analysiere([FOTO], 'x')).rejects.toBeInstanceOf(
      GeminiFehler,
    );
    fetchMock.mockResolvedValueOnce(geminiAntwort('kein json'));
    await expect(client().analysiere([FOTO], 'x')).rejects.toBeInstanceOf(
      GeminiFehler,
    );
  });

  it('refuses without an API key and never calls Gemini', async () => {
    await expect(
      new GeminiClient(undefined).analysiere([FOTO], 'x'),
    ).rejects.toBeInstanceOf(GeminiNichtEingerichtet);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
