import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { AvvCode } from './avv-code-api.js';

// Muss zur Backend-Grenze in CreateWareneintragDto passen (Security-Audit run-1).
export const FREITEXT_MAX_LAENGE = 2000;

export interface Wareneintrag {
  id: string;
  fotoFernUrl: string | null;
  fotoNahUrl: string | null;
  fotoDetailUrl: string | null;
  freitext: string;
  erstelltAm: string;
  avvCode: Pick<AvvCode, 'id' | 'code' | 'bezeichnung'>;
  standort: { id: string; name: string };
  erfasstVon: { id: string; vorname: string; nachname: string };
}

// KI-Analyse (Issue #93): Anteile ganzzahlig, Summe 100, absteigend.
// Der AVV-Vorschlag existiert immer in avv_codes (Issue #95).
export interface KiAnalyseErgebnis {
  fraktionen: { name: string; anteilProzent: number }[];
  einschaetzung: string;
  avvPruefung: {
    urteil: 'passt' | 'passt_eher_nicht' | 'nicht_beurteilbar';
    begruendung: string;
    vorschlag: { code: string; bezeichnung: string } | null;
  };
}

// Gespeicherte KI-Analyse (Issue #94), eine pro Wareneintrag.
export interface GespeicherteKiAnalyse {
  ergebnis: KiAnalyseErgebnis;
  analysiertVon: { vorname: string; nachname: string };
  analysiertAm: string;
}

export interface PaginierteWareneintraege {
  daten: Wareneintrag[];
  gesamt: number;
}

export interface WareneintragFilter {
  avvCodeId: string | null;
  standortId?: string | null;
  suche: string;
  seite: number;
  proSeite: number;
}

@Injectable({ providedIn: 'root' })
export class WareneintragApi {
  private readonly http = inject(HttpClient);

  liste(filter: WareneintragFilter) {
    const params: Record<string, string> = {
      seite: String(filter.seite),
      proSeite: String(filter.proSeite),
    };
    if (filter.avvCodeId) params['avvCodeId'] = filter.avvCodeId;
    if (filter.standortId) params['standortId'] = filter.standortId;
    if (filter.suche) params['suche'] = filter.suche;
    return this.http.get<PaginierteWareneintraege>('/api/v1/wareneintraege', { params });
  }

  erstellen(formData: FormData) {
    return this.http.post<{ id: string }>('/api/v1/wareneintraege', formData);
  }

  aktualisieren(id: string, formData: FormData) {
    return this.http.patch(`/api/v1/wareneintraege/${id}`, formData);
  }

  analysieren(id: string) {
    return this.http.post<KiAnalyseErgebnis>(`/api/v1/wareneintraege/${id}/ki-analyse`, null);
  }

  // null, solange der Eintrag keine gespeicherte Analyse hat.
  gespeicherteAnalyse(id: string) {
    return this.http.get<GespeicherteKiAnalyse | null>(`/api/v1/wareneintraege/${id}/ki-analyse`);
  }

  // Ohne Body: das Backend übernimmt die eigene Vorschau aus Redis.
  analyseSpeichern(id: string) {
    return this.http.put<GespeicherteKiAnalyse>(`/api/v1/wareneintraege/${id}/ki-analyse`, null);
  }

  loeschen(id: string) {
    return this.http.delete(`/api/v1/wareneintraege/${id}`);
  }
}
