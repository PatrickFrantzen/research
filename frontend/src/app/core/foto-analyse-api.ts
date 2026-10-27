import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { KiAnalyseErgebnis } from './wareneintrag-api.js';

// Foto-Analyse ohne Stoffstrom (Issue #147).
export interface FotoAnalyseErgebnis extends Omit<KiAnalyseErgebnis, 'avvPruefung'> {
  // null, wenn die KI unsicher war oder der Code unbekannt ist.
  avvVorschlag: {
    code: string;
    bezeichnung: string;
    gefaehrlich: boolean;
    begruendung: string;
  } | null;
}

@Injectable({ providedIn: 'root' })
export class FotoAnalyseApi {
  private readonly http = inject(HttpClient);

  analysieren(foto: File) {
    return this.http.post<FotoAnalyseErgebnis>('/api/v1/foto-analyse', mitFoto(foto));
  }

  // Löscht die Vorschau auf dem Server.
  verwerfen() {
    return this.http.delete<void>('/api/v1/foto-analyse');
  }

  // Das Backend nimmt das Ergebnis aus der eigenen Vorschau, nur das Foto kommt mit.
  senden(foto: File) {
    return this.http.post<void>('/api/v1/foto-analyse/mail', mitFoto(foto));
  }
}

function mitFoto(foto: File): FormData {
  const formData = new FormData();
  formData.append('foto', foto);
  return formData;
}
