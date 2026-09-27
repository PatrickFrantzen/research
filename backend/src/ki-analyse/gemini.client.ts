import { Logger } from '@nestjs/common';
import type { EnvConfig } from '../config/env.js';
import { ANTWORT_SCHEMA, SYSTEM_PROMPT } from './ki-analyse.js';

const TIMEOUT_MS = 60_000;

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

  constructor(private readonly config: EnvConfig['gemini']) {}

  // Liefert das von Gemini geparste JSON, ungeprüft (siehe pruefeAntwort).
  async analysiere(fotos: AnalyseFoto[], kontext: string): Promise<unknown> {
    if (!this.config) throw new GeminiNichtEingerichtet();
    let antwort: Response;
    try {
      antwort = await fetch(`${this.config.apiUrl}/models/${this.config.model}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': this.config.apiKey },
        body: JSON.stringify({
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
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.warn(`Gemini nicht erreichbar: ${(error as Error).name}`);
      throw new GeminiFehler();
    }
    if (antwort.status === 429) throw new GeminiKontingentErschoepft();
    if (!antwort.ok) {
      this.logger.warn(`Gemini antwortet mit Status ${antwort.status}`);
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
}
