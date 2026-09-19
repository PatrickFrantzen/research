import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, resource, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';

interface AvvCode {
  id: string;
  code: string;
  bezeichnung: string;
  gefaehrlich: boolean;
}

interface Wareneintrag {
  id: string;
  fotoUrl: string;
  freitext: string;
  erstelltAm: string;
  avvCode: Pick<AvvCode, 'code'>;
}

// Verzögerung, bevor Filteränderungen die Liste neu laden – analog zur
// AVV-Suche in wareneintrag-erfassen.
const FILTER_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-wareneintrag-liste',
  imports: [DatePipe, FormsModule, MatAutocompleteModule, MatCardModule, MatFormFieldModule, MatInputModule],
  templateUrl: './wareneintrag-liste.html',
  styleUrl: './wareneintrag-liste.scss',
})
export class WareneintragListe {
  private readonly http = inject(HttpClient);

  readonly avvCodeId = signal<string | null>(null);
  readonly suche = signal('');

  protected avvSucheAnzeige = '';
  private readonly avvSuchbegriff = signal('');
  private avvSucheTimeout: ReturnType<typeof setTimeout> | undefined;
  private sucheTimeout: ReturnType<typeof setTimeout> | undefined;

  protected readonly avvTreffer = resource({
    params: () => this.avvSuchbegriff(),
    loader: ({ params }) =>
      firstValueFrom(this.http.get<AvvCode[]>('/api/v1/avv-codes', { params: params ? { suche: params } : {} })),
  });

  protected readonly wareneintraege = resource({
    params: () => ({ avvCodeId: this.avvCodeId(), suche: this.suche() }),
    loader: ({ params }) => {
      const httpParams: Record<string, string> = {};
      if (params.avvCodeId) httpParams['avvCodeId'] = params.avvCodeId;
      if (params.suche) httpParams['suche'] = params.suche;
      return firstValueFrom(this.http.get<Wareneintrag[]>('/api/v1/wareneintraege', { params: httpParams }));
    },
  });

  onAvvSucheEingabe(wert: string): void {
    this.avvCodeId.set(null);
    clearTimeout(this.avvSucheTimeout);
    this.avvSucheTimeout = setTimeout(() => this.avvSuchbegriff.set(wert), FILTER_DEBOUNCE_MS);
  }

  onAvvCodeAusgewaehlt(event: MatAutocompleteSelectedEvent): void {
    const avvCode = event.option.value as AvvCode;
    this.avvCodeId.set(avvCode.id);
    this.avvSucheAnzeige = `${avvCode.code} – ${avvCode.bezeichnung}`;
  }

  onAvvSucheFokus(): void {
    if (!this.avvCodeId()) return;
    this.avvSucheAnzeige = '';
    this.avvSuchbegriff.set('');
  }

  onSucheEingabe(wert: string): void {
    clearTimeout(this.sucheTimeout);
    this.sucheTimeout = setTimeout(() => this.suche.set(wert), FILTER_DEBOUNCE_MS);
  }
}
