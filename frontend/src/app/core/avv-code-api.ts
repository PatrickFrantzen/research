import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

export interface AvvCode {
  id: string;
  code: string;
  bezeichnung: string;
  gefaehrlich: boolean;
}

@Injectable({ providedIn: 'root' })
export class AvvCodeApi {
  private readonly http = inject(HttpClient);

  suchen(suche: string) {
    return this.http.get<AvvCode[]>('/api/v1/avv-codes', { params: suche ? { suche } : {} });
  }
}
