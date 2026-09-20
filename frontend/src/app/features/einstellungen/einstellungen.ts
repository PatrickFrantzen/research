import { Component, effect, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormField, form, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { extrahiereFehlermeldung } from '../../core/http-fehler.js';
import { NutzerApi } from '../../core/nutzer-api.js';
import { StandortApi } from '../../core/standort-api.js';

@Component({
  selector: 'app-einstellungen',
  imports: [FormField, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './einstellungen.html',
  styleUrl: './einstellungen.scss',
})
export class Einstellungen {
  private readonly nutzerApi = inject(NutzerApi);
  private readonly standortApi = inject(StandortApi);

  protected readonly standorte = rxResource({
    stream: () => this.standortApi.liste(),
  });

  protected readonly eigeneDaten = rxResource({
    stream: () => this.nutzerApi.eigeneDaten(),
  });

  protected readonly einstellungenDaten = signal({ vorname: '', nachname: '', standortId: '' });
  protected readonly einstellungenForm = form(this.einstellungenDaten, (pfad) => {
    required(pfad.vorname);
    required(pfad.nachname);
    required(pfad.standortId);
  });

  protected readonly gespeichert = signal(false);
  protected readonly fehler = signal<string | null>(null);
  protected readonly wirdGeladen = signal(false);

  constructor() {
    effect(() => {
      const daten = this.eigeneDaten.value();
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
    if (!this.einstellungenForm().valid()) return;
    this.fehler.set(null);
    this.gespeichert.set(false);
    this.wirdGeladen.set(true);
    try {
      await firstValueFrom(
        this.nutzerApi.aktualisiereEigeneDaten({
          vorname: this.vorname,
          nachname: this.nachname,
          standortId: this.standortId,
        }),
      );
      this.gespeichert.set(true);
    } catch (error) {
      this.fehler.set(extrahiereFehlermeldung(error, 'Änderungen konnten nicht gespeichert werden.'));
    } finally {
      this.wirdGeladen.set(false);
    }
  }
}
