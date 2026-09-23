import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

export interface EigeneDaten {
  vorname: string;
  nachname: string;
  email: string;
  standortId: string;
}

export interface NeuerNutzer {
  email: string;
  passwortSetzenLink: string;
}

export interface NutzerAnlegenDaten {
  vorname: string;
  nachname: string;
  email: string;
  standortId: string;
}

export interface EigeneDatenUpdate {
  vorname: string;
  nachname: string;
  standortId: string;
}

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
}
