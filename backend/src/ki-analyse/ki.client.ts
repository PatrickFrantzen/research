import type { AnalyseFoto } from './gemini.client.js';

// Was die Analyse von der KI braucht. Gemini (ADR-0008) oder die KI-Zentrale
// auf dem Server (ki-zentrale), je nach Konfiguration (KiAnalyseModule).
export abstract class KiClient {
  // Liefert das geparste JSON der Antwort, ungeprüft (siehe pruefeAntwort).
  // anweisung: Systemprompt, Standard ist die Wareneintrag-Analyse.
  abstract analysiere(
    fotos: AnalyseFoto[],
    kontext: string,
    anweisung?: string,
  ): Promise<unknown>;
}
