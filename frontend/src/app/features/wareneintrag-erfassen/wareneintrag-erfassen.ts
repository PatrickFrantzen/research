import { Component, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormField, form, required } from '@angular/forms/signals';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, firstValueFrom, Subject } from 'rxjs';
import { AvvCode, AvvCodeApi } from '../../core/avv-code-api.js';
import { extrahiereFehlermeldung } from '../../core/http-fehler.js';
import { WareneintragApi } from '../../core/wareneintrag-api.js';

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
    FormField,
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
  private readonly avvCodeApi = inject(AvvCodeApi);
  private readonly wareneintragApi = inject(WareneintragApi);

  protected foto: File | null = null;
  protected readonly fotoVorschauUrl = signal<string | null>(null);

  protected readonly wareneintragDaten = signal({ avvSucheAnzeige: '', freitext: '' });
  protected readonly wareneintragForm = form(this.wareneintragDaten, (pfad) => {
    required(pfad.freitext);
  });

  protected ausgewaehlterAvvCode: AvvCode | null = null;
  private readonly avvSucheEingabe = new Subject<string>();
  private readonly suchbegriff = signal('');

  private readonly avvSucheSubscription = this.avvSucheEingabe
    .pipe(debounceTime(SUCHE_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
    .subscribe((wert) => this.suchbegriff.set(wert));

  protected readonly avvTreffer = rxResource({
    params: () => this.suchbegriff(),
    stream: ({ params }) => this.avvCodeApi.suchen(params),
  });

  get avvSucheAnzeige(): string {
    return this.wareneintragDaten().avvSucheAnzeige;
  }

  set avvSucheAnzeige(avvSucheAnzeige: string) {
    this.wareneintragDaten.update((daten) => ({ ...daten, avvSucheAnzeige }));
  }

  get freitext(): string {
    return this.wareneintragDaten().freitext;
  }

  set freitext(freitext: string) {
    this.wareneintragDaten.update((daten) => ({ ...daten, freitext }));
  }

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
    this.avvSucheEingabe.next(wert);
  }

  onAvvCodeAusgewaehlt(event: MatAutocompleteSelectedEvent): void {
    const avvCode = this.avvTreffer.value()?.find((treffer) => treffer.id === event.option.value);
    if (!avvCode) return;
    this.ausgewaehlterAvvCode = avvCode;
    this.avvSucheAnzeige = `${avvCode.code} – ${avvCode.bezeichnung}`;
  }

  protected get kannAbsenden(): boolean {
    return this.foto !== null && this.ausgewaehlterAvvCode !== null && this.freitext.trim().length > 0;
  }

  async submit(): Promise<void> {
    if (!this.foto || !this.ausgewaehlterAvvCode || this.freitext.trim().length === 0) {
      return;
    }
    this.fehler.set(null);
    this.wirdGeladen.set(true);
    try {
      const formData = new FormData();
      formData.append('foto', this.foto);
      formData.append('avvCodeId', this.ausgewaehlterAvvCode.id);
      formData.append('freitext', this.freitext);

      const result = await firstValueFrom(this.wareneintragApi.erstellen(formData));
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
    this.ausgewaehlterAvvCode = null;
    this.wareneintragDaten.set({ avvSucheAnzeige: '', freitext: '' });
    this.avvSucheEingabe.next('');
    this.suchbegriff.set('');
  }
}
