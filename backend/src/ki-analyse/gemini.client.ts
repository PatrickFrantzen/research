import { Logger } from '@nestjs/common';
import type { EnvConfig } from '../config/env.js';
import { ANTWORT_SCHEMA, SYSTEM_PROMPT } from './ki-analyse.js';

const TIMEOUT_MS = 60_000;
// Überlastet (503) oder interner Fehler (500): Google empfiehlt Wiederholen.
// Im Free Tier kommt 503 "model overloaded" regelmäßig vor.
const VORUEBERGEHENDE_FEHLER = new Set([500, 503]);
const MAX_VERSUCHE = 2;

export interface AnalyseFoto {
  label: string;
  daten: Buffer;
  mimeType: string;
}

export class GeminiNichtEingerichtet extends Error {}
export class GeminiKontingentErschoepft extends Error {}
export class GeminiFehler extends Error {}

// Direkter REST-Aufruf statt SDK (ADR-0008). Der Key geht per Header, nicht
// in der URL, damit er in keinem Fehler-Log und keiner Response auftaucht.
// Ohne Config (kein GEMINI_API_KEY) ist die KI-Analyse abgeschaltet.
export class GeminiClient {
  private readonly logger = new Logger(GeminiClient.name);

  constructor(
    private readonly config: EnvConfig['gemini'],
    private readonly wartezeitMs = 2_000,
  ) {}

  // Liefert das von Gemini geparste JSON, ungeprüft (siehe pruefeAntwort).
  async analysiere(fotos: AnalyseFoto[], kontext: string): Promise<unknown> {
    if (!this.config) throw new GeminiNichtEingerichtet();
    const anfrage = JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [
        {
          role: 'user',
          parts: [
            { text: kontext },
            ...fotos.flatMap((foto) => [
              { text: `${foto.label}:` },
              { inlineData: { mimeType: foto.mimeType, data: foto.daten.toString('base64') } },
            ]),
          ],
        },
      ],
      generationConfig: { responseMimeType: 'application/json', responseSchema: ANTWORT_SCHEMA },
    });

    let antwort = await this.sende(this.config, anfrage);
    for (let versuch = 2; VORUEBERGEHENDE_FEHLER.has(antwort.status) && versuch <= MAX_VERSUCHE; versuch++) {
      this.logger.warn(`Gemini ${await fehlertext(antwort)}, Versuch ${versuch} in ${this.wartezeitMs} ms`);
      await new Promise((resolve) => setTimeout(resolve, this.wartezeitMs));
      antwort = await this.sende(this.config, anfrage);
    }
    if (antwort.status === 429) throw new GeminiKontingentErschoepft();
    if (!antwort.ok) {
      this.logger.warn(`Gemini ${await fehlertext(antwort)}`);
      throw new GeminiFehler();
    }
    try {
      const body = (await antwort.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      return JSON.parse(body.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
    } catch {
      this.logger.warn('Gemini-Antwort ist kein gültiges JSON');
      throw new GeminiFehler();
    }
  }

  private async sende(config: NonNullable<EnvConfig['gemini']>, anfrage: string): Promise<Response> {
    try {
      return await fetch(`${config.apiUrl}/models/${config.model}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': config.apiKey },
        body: anfrage,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.warn(`Gemini nicht erreichbar: ${(error as Error).name}`);
      throw new GeminiFehler();
    }
  }
}

// Status plus Googles Fehlertext fürs Log, z.B. "503 UNAVAILABLE: The model
// is overloaded". Enthält den Key nicht (der steht nur im Request-Header).
async function fehlertext(antwort: Response): Promise<string> {
  const body = (await antwort.json().catch(() => ({}))) as { error?: { status?: string; message?: string } };
  const grund = [body.error?.status, body.error?.message?.replace(/\s+/g, ' ').slice(0, 200)].filter(Boolean).join(': ');
  return `${antwort.status}${grund ? ` ${grund}` : ''}`;
}
