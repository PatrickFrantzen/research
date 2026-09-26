import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

// Auswahlwert für "Anderer Standort …": dann gilt der Freitext.
export const ANDERER_STANDORT = 'anderer';

export type StandortAuswahl = { standortId: string } | { neuerStandort: string };

export function standortAuswahl(standortId: string, neuerStandort: string): StandortAuswahl {
  return standortId === ANDERER_STANDORT ? { neuerStandort: neuerStandort.trim() } : { standortId };
}

export interface Standort {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class StandortApi {
  private readonly http = inject(HttpClient);

  liste() {
    return this.http.get<Standort[]>('/api/v1/standorte');
  }
}
