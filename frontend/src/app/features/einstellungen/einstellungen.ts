import { Component, computed, effect, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormField, disabled, form, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { appVersion } from '../../core/app-version.js';
import { extrahiereFehlermeldung } from '../../core/http-fehler.js';
import { LadeZustand } from '../../core/lade-zustand/lade-zustand.js';
import { NutzerApi } from '../../core/nutzer-api.js';
import { StandortApi } from '../../core/standort-api.js';
import { FokusBeiAnzeige } from '../../core/fokus-bei-anzeige.js';

@Component({
  selector: 'app-einstellungen',
  imports: [
    FokusBeiAnzeige,
    FormField,
    LadeZustand,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    RouterLink,
  ],
  templateUrl: './einstellungen.html',
})
export class Einstellungen {
  private readonly nutzerApi = inject(NutzerApi);
  private readonly standortApi = inject(StandortApi);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly standorte = rxResource({
    stream: () => this.standortApi.liste(),
  });

  protected readonly eigeneDaten = rxResource({
    stream: () => this.nutzerApi.eigeneDaten(),
  });

  // Bis die eigenen Daten und die Standorte da sind, ist das Formular
  // gesperrt – sonst ließen sich leere Felder speichern (Issue #53).
  protected readonly geladen = computed(() => this.eigeneDaten.hasValue() && this.standorte.hasValue());
  protected readonly standortListe = computed(() => (this.standorte.hasValue() ? this.standorte.value() : []));

  protected readonly einstellungenDaten = signal({ vorname: '', nachname: '', standortId: '' });
  protected readonly einstellungenForm = form(this.einstellungenDaten, (pfad) => {
    disabled(pfad, { when: () => !this.geladen() });
    required(pfad.vorname);
    required(pfad.nachname);
    required(pfad.standortId);
  });

  protected readonly fehler = signal<string | null>(null);
  protected readonly wirdGeladen = signal(false);
  protected readonly version = appVersion;

  constructor() {
    effect(() => {
      const daten = this.eigeneDaten.hasValue() ? this.eigeneDaten.value() : undefined;
      if (daten) {
        this.einstellungenDaten.set({
          vorname: daten.vorname,
          nachname: daten.nachname,
          standortId: daten.standortId,
        });
      }
    });
  }

  get vorname(): string {
    return this.einstellungenDaten().vorname;
  }

  set vorname(vorname: string) {
    this.einstellungenDaten.update((daten) => ({ ...daten, vorname }));
  }

  get nachname(): string {
    return this.einstellungenDaten().nachname;
  }

  set nachname(nachname: string) {
    this.einstellungenDaten.update((daten) => ({ ...daten, nachname }));
  }

  get standortId(): string {
    return this.einstellungenDaten().standortId;
  }

  set standortId(standortId: string) {
    this.einstellungenDaten.update((daten) => ({ ...daten, standortId }));
  }

  async submit(): Promise<void> {
    if (!this.geladen() || !this.einstellungenForm().valid()) return;
    this.fehler.set(null);
    this.wirdGeladen.set(true);
    try {
      await firstValueFrom(
        this.nutzerApi.aktualisiereEigeneDaten({
          vorname: this.vorname,
          nachname: this.nachname,
          standortId: this.standortId,
        }),
      );
      this.snackBar.open('Änderungen gespeichert.', undefined, { duration: 3000 });
    } catch (error) {
      this.fehler.set(extrahiereFehlermeldung(error, 'Änderungen konnten nicht gespeichert werden.'));
    } finally {
      this.wirdGeladen.set(false);
    }
  }
}
