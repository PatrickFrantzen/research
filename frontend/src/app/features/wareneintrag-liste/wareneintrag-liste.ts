import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormField, form, required } from '@angular/forms/signals';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { debounceTime, distinctUntilChanged, firstValueFrom, Subject } from 'rxjs';
import { AvvCodeApi } from '../../core/avv-code-api.js';
import { Wareneintrag, WareneintragApi } from '../../core/wareneintrag-api.js';

// Verzögerung, bevor Filteränderungen die Liste neu laden – analog zur
// AVV-Suche in wareneintrag-erfassen.
const FILTER_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-wareneintrag-liste',
  imports: [
    DatePipe,
    FormField,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
  ],
  templateUrl: './wareneintrag-liste.html',
  styleUrl: './wareneintrag-liste.scss',
})
export class WareneintragListe {
  private readonly avvCodeApi = inject(AvvCodeApi);
  private readonly wareneintragApi = inject(WareneintragApi);

  readonly avvCodeId = signal<string | null>(null);
  readonly suche = signal('');
  readonly seite = signal(0);
  readonly proSeite = signal(20);

  protected readonly filterDaten = signal({ avvSucheAnzeige: '', suche: '' });
  protected readonly filterForm = form(this.filterDaten);
  private readonly leereBearbeitung = { id: '', avvCodeId: '', freitext: '', foto: null as File | null };
  protected readonly bearbeitungDaten = signal(this.leereBearbeitung);
  protected readonly bearbeitenForm = form(this.bearbeitungDaten, (pfad) => {
    required(pfad.avvCodeId);
    required(pfad.freitext);
  });
  private readonly bearbeitungAktiv = signal(false);
  protected speichernLaeuft = false;
  protected loeschenLaeuft = false;
  private readonly avvSucheEingabe = new Subject<string>();
  private readonly avvSuchbegriff = signal('');
  private readonly sucheEingabe = new Subject<string>();

  private readonly avvSucheSubscription = this.avvSucheEingabe
    .pipe(debounceTime(FILTER_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
    .subscribe((wert) => this.avvSuchbegriff.set(wert));

  private readonly sucheSubscription = this.sucheEingabe
    .pipe(debounceTime(FILTER_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
    .subscribe((wert) => {
      this.seite.set(0);
      this.suche.set(wert);
    });

  protected readonly avvTreffer = rxResource({
    params: () => this.avvSuchbegriff(),
    stream: ({ params }) => this.avvCodeApi.suchen(params),
  });

  protected readonly wareneintraege = rxResource({
    params: () => ({
      avvCodeId: this.avvCodeId(),
      suche: this.suche(),
      seite: this.seite(),
      proSeite: this.proSeite(),
    }),
    stream: ({ params }) => this.wareneintragApi.liste(params),
  });

  protected get avvSucheAnzeige(): string {
    return this.filterDaten().avvSucheAnzeige;
  }

  protected set avvSucheAnzeige(avvSucheAnzeige: string) {
    this.filterDaten.update((daten) => ({ ...daten, avvSucheAnzeige }));
  }

  protected get bearbeitung() {
    return this.bearbeitungAktiv() ? this.bearbeitungDaten() : null;
  }

  onAvvSucheEingabe(wert: string): void {
    this.avvCodeId.set(null);
    this.seite.set(0);
    this.avvSucheEingabe.next(wert);
  }

  onAvvCodeAusgewaehlt(event: MatAutocompleteSelectedEvent): void {
    const avvCode = this.avvTreffer.value()?.find((treffer) => treffer.id === event.option.value);
    if (!avvCode) return;
    this.avvCodeId.set(avvCode.id);
    this.seite.set(0);
    this.avvSucheAnzeige = `${avvCode.code} – ${avvCode.bezeichnung}`;
  }

  onAvvSucheFokus(): void {
    if (!this.avvCodeId()) return;
    this.avvSucheAnzeige = '';
    this.avvSuchbegriff.set('');
    this.avvSucheEingabe.next('');
  }

  onSucheEingabe(wert: string): void {
    this.filterDaten.update((daten) => ({ ...daten, suche: wert }));
    this.sucheEingabe.next(wert);
  }

  onSeitenwechsel(event: PageEvent): void {
    this.seite.set(event.pageIndex);
    this.proSeite.set(event.pageSize);
  }

  bearbeitungOeffnen(wareneintrag: Wareneintrag): void {
    this.bearbeitungDaten.set({
      id: wareneintrag.id,
      avvCodeId: '',
      freitext: wareneintrag.freitext,
      foto: null,
    });
    this.bearbeitungAktiv.set(true);
  }

  fotoErsetzen(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!this.bearbeitungAktiv()) return;
    this.bearbeitungDaten.update((daten) => ({ ...daten, foto: input.files?.item(0) ?? null }));
  }

  async speichern(): Promise<void> {
    const bearbeitung = this.bearbeitungDaten();
    if (!this.bearbeitungAktiv() || !bearbeitung.avvCodeId || !bearbeitung.freitext.trim()) return;
    this.speichernLaeuft = true;
    const formData = new FormData();
    formData.set('avvCodeId', bearbeitung.avvCodeId);
    formData.set('freitext', bearbeitung.freitext.trim());
    if (bearbeitung.foto) formData.set('foto', bearbeitung.foto);

    try {
      await firstValueFrom(this.wareneintragApi.aktualisieren(bearbeitung.id, formData));
      this.bearbeitungAbbrechen();
      this.wareneintraege.reload();
    } finally {
      this.speichernLaeuft = false;
    }
  }

  async loeschen(wareneintrag: Wareneintrag): Promise<void> {
    if (!window.confirm('Wareneintrag wirklich löschen?')) return;
    this.loeschenLaeuft = true;
    try {
      await firstValueFrom(this.wareneintragApi.loeschen(wareneintrag.id));
      if (this.bearbeitung?.id === wareneintrag.id) this.bearbeitungAbbrechen();
      this.wareneintraege.reload();
    } finally {
      this.loeschenLaeuft = false;
    }
  }

  bearbeitungAbbrechen(): void {
    this.bearbeitungAktiv.set(false);
    this.bearbeitungDaten.set(this.leereBearbeitung);
  }
}
