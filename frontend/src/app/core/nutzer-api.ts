import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { StandortAuswahl } from './standort-api.js';

export interface EigeneDaten {
  vorname: string;
  nachname: string;
  email: string;
  standortId: string;
}

export interface NeuerNutzer {
  email: string;
  passwortSetzenLink: string;
  mailVersendet: boolean;
}

export interface NutzerUebersicht {
  id: string;
  vorname: string;
  nachname: string;
  email: string;
  standort: string;
  istAdmin: boolean;
  einladungOffen: boolean;
  erstelltAm: string;
}

export type NutzerAnlegenDaten = { vorname: string; nachname: string; email: string } & StandortAuswahl;

export type EigeneDatenUpdate = { vorname: string; nachname: string } & StandortAuswahl;

@Injectable({ providedIn: 'root' })
export class NutzerApi {
  private readonly http = inject(HttpClient);

  eigeneDaten() {
    return this.http.get<EigeneDaten>('/api/v1/nutzer/me');
  }

  aktualisiereEigeneDaten(daten: EigeneDatenUpdate) {
    return this.http.patch<EigeneDaten>('/api/v1/nutzer/me', daten);
  }

  legeNutzerAn(daten: NutzerAnlegenDaten) {
    return this.http.post<NeuerNutzer>('/api/v1/nutzer', daten);
  }

  liste() {
    return this.http.get<NutzerUebersicht[]>('/api/v1/nutzer');
  }

  sendePasswortLink(id: string) {
    return this.http.post<void>(`/api/v1/nutzer/${id}/passwort-link`, {});
  }
}
