import { HttpClient } from '@angular/common/http';
import { Component, inject, resource, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { extrahiereFehlermeldung } from '../../core/http-fehler.js';

interface AvvCode {
  id: string;
  code: string;
  bezeichnung: string;
  gefaehrlich: boolean;
}

interface Wareneintrag {
  id: string;
}

// Verzögerung, bevor die AVV-Suche pro Tastenanschlag ausgelöst wird – die
// Liste hat 834 Einträge (Spezifikation Abschnitt 3.1), Anfragen bei jedem
// Zeichen wären unnötig.
const SUCHE_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-wareneintrag-erfassen',
  imports: [
    FormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    RouterLink,
  ],
  templateUrl: './wareneintrag-erfassen.html',
  styleUrl: './wareneintrag-erfassen.scss',
})
export class WareneintragErfassen {
  private readonly http = inject(HttpClient);

  protected foto: File | null = null;
  protected readonly fotoVorschauUrl = signal<string | null>(null);

  protected avvSucheAnzeige = '';
  protected ausgewaehlterAvvCode: AvvCode | null = null;
  private readonly suchbegriff = signal('');
  private sucheTimeout: ReturnType<typeof setTimeout> | undefined;

  protected readonly avvTreffer = resource({
    params: () => this.suchbegriff(),
    loader: ({ params }) =>
      firstValueFrom(this.http.get<AvvCode[]>('/api/v1/avv-codes', { params: params ? { suche: params } : {} })),
  });

  freitext = '';

  protected readonly angelegt = signal<Wareneintrag | null>(null);
  protected readonly fehler = signal<string | null>(null);
  protected readonly wirdGeladen = signal(false);

  onFotoAusgewaehlt(event: Event): void {
    const input = event.target as HTMLInputElement;
    const datei = input.files?.[0] ?? null;
    this.foto = datei;
    this.fotoVorschauUrl.set(datei ? URL.createObjectURL(datei) : null);
  }

  onAvvSucheEingabe(wert: string): void {
    this.ausgewaehlterAvvCode = null;
    clearTimeout(this.sucheTimeout);
    this.sucheTimeout = setTimeout(() => this.suchbegriff.set(wert), SUCHE_DEBOUNCE_MS);
  }

  onAvvCodeAusgewaehlt(event: MatAutocompleteSelectedEvent): void {
    const avvCode = event.option.value as AvvCode;
    this.ausgewaehlterAvvCode = avvCode;
    this.avvSucheAnzeige = `${avvCode.code} – ${avvCode.bezeichnung}`;
  }

  protected get kannAbsenden(): boolean {
    return this.foto !== null && this.ausgewaehlterAvvCode !== null && this.freitext.trim().length > 0;
  }

  async submit(): Promise<void> {
    if (!this.foto || !this.ausgewaehlterAvvCode) {
      return;
    }
    this.fehler.set(null);
    this.wirdGeladen.set(true);
    try {
      const formData = new FormData();
      formData.append('foto', this.foto);
      formData.append('avvCodeId', this.ausgewaehlterAvvCode.id);
      formData.append('freitext', this.freitext);

      const result = await firstValueFrom(this.http.post<Wareneintrag>('/api/v1/wareneintraege', formData));
      this.angelegt.set(result);
    } catch (error) {
      this.fehler.set(extrahiereFehlermeldung(error, 'Wareneintrag konnte nicht angelegt werden.'));
    } finally {
      this.wirdGeladen.set(false);
    }
  }

  weitererEintrag(): void {
    this.angelegt.set(null);
    this.foto = null;
    this.fotoVorschauUrl.set(null);
    this.avvSucheAnzeige = '';
    this.ausgewaehlterAvvCode = null;
    this.freitext = '';
    this.suchbegriff.set('');
  }
}
