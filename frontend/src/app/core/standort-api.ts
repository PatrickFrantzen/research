import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

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
