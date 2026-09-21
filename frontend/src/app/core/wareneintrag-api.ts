import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { AvvCode } from './avv-code-api.js';

export interface Wareneintrag {
  id: string;
  fotoUrl: string;
  freitext: string;
  erstelltAm: string;
  avvCode: Pick<AvvCode, 'id' | 'code' | 'bezeichnung'>;
}

export interface PaginierteWareneintraege {
  daten: Wareneintrag[];
  gesamt: number;
}

export interface WareneintragFilter {
  avvCodeId: string | null;
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
    if (filter.suche) params['suche'] = filter.suche;
    return this.http.get<PaginierteWareneintraege>('/api/v1/wareneintraege', { params });
  }

  erstellen(formData: FormData) {
    return this.http.post<{ id: string }>('/api/v1/wareneintraege', formData);
  }

  aktualisieren(id: string, formData: FormData) {
    return this.http.patch(`/api/v1/wareneintraege/${id}`, formData);
  }

  loeschen(id: string) {
    return this.http.delete(`/api/v1/wareneintraege/${id}`);
  }
}
