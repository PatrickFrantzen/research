import { Logger } from '@nestjs/common';
import {
  type AnalyseFoto,
  GeminiFehler,
  GeminiKontingentErschoepft,
} from './gemini.client.js';
import { ANTWORT_SCHEMA, SYSTEM_PROMPT } from './ki-analyse.js';
import { KiClient } from './ki.client.js';

const TIMEOUT_MS = 180_000;

type GeminiSchema = {
  type: string;
  properties?: Record<string, GeminiSchema>;
  items?: GeminiSchema;
  required?: string[];
  enum?: string[];
  nullable?: boolean;
};

// Codex verlangt striktes JSON-Schema: kleine Typnamen, keine Zusatzfelder,
// null als eigener Typ. maxItems fällt weg, pruefeAntwort prüft die Anzahl.
function alsJsonSchema(s: GeminiSchema): object {
  const typ = s.type.toLowerCase();
  return {
    type: s.nullable ? [typ, 'null'] : typ,
    ...(s.enum && { enum: s.enum }),
    ...(s.properties && {
      additionalProperties: false,
      required: s.required ?? [],
      properties: Object.fromEntries(
        Object.entries(s.properties).map(([k, v]) => [k, alsJsonSchema(v)]),
      ),
    }),
    ...(s.items && { items: alsJsonSchema(s.items) }),
  };
}

const SCHEMA = alsJsonSchema(ANTWORT_SCHEMA);

// Die KI über den zentralen Dienst ki-zentrale im Docker-Netz "ki", immer mit
// Patricks Abo (alle Nutzer wie zuvor mit dem einen Gemini-Key).
export class KiZentraleClient extends KiClient {
  private readonly logger = new Logger(KiZentraleClient.name);

  constructor(private readonly config: { url: string; token: string }) {
    super();
  }

  async analysiere(
    fotos: AnalyseFoto[],
    kontext: string,
    anweisung = SYSTEM_PROMPT,
  ): Promise<unknown> {
    const antwort = await fetch(`${this.config.url}/erzeuge`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.config.token}`,
      },
      body: JSON.stringify({
        zugang: 'patrick',
        anweisung,
        schema: SCHEMA,
        text: kontext,
        bilder: fotos.map((foto) => ({
          label: foto.label,
          typ: foto.mimeType,
          daten: foto.daten.toString('base64'),
        })),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }).catch((error: Error) => {
      this.logger.warn(`KI-Zentrale nicht erreichbar: ${error.name}`);
      throw new GeminiFehler();
    });
    const body = (await antwort.json().catch(() => null)) as unknown;
    if (antwort.status === 429) throw new GeminiKontingentErschoepft();
    if (!antwort.ok) {
      const meldung = (body as { meldung?: string } | null)?.meldung ?? '';
      this.logger.warn(`KI-Zentrale ${antwort.status} ${meldung}`);
      throw new GeminiFehler();
    }
    return body;
  }
}
