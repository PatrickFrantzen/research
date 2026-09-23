import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormField, disabled, email as emailValidator, form, maxLength, minLength, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { extrahiereFehlermeldung } from '../../core/http-fehler.js';
import { LadeZustand } from '../../core/lade-zustand/lade-zustand.js';
import { NeuerNutzer, NutzerApi } from '../../core/nutzer-api.js';
import { StandortApi } from '../../core/standort-api.js';
import { FokusBeiAnzeige } from '../../core/fokus-bei-anzeige.js';

const LEERES_FORMULAR = { vorname: '', nachname: '', email: '', standortId: '', passwort: '' };

// Kein Mailversand (#63 zurückgestellt): Der anlegende Nutzer vergibt ein
// Initialpasswort und übergibt die Zugangsdaten persönlich. Beim ersten Login
// muss der neue Kollege es ändern (Issue #76).
@Component({
  selector: 'app-nutzer-anlegen',
  imports: [
    FokusBeiAnzeige,
    FormField,
    LadeZustand,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    RouterLink,
  ],
  templateUrl: './nutzer-anlegen.html',
})
export class NutzerAnlegen {
  private readonly nutzerApi = inject(NutzerApi);
  private readonly standortApi = inject(StandortApi);

  protected readonly standorte = rxResource({
    stream: () => this.standortApi.liste(),
  });

  // Ohne geladene Standorte ist kein gültiger Account möglich (Issue #60).
  protected readonly standortListe = computed(() => (this.standorte.hasValue() ? this.standorte.value() : []));

  protected readonly nutzerDaten = signal(LEERES_FORMULAR);
  protected readonly nutzerForm = form(this.nutzerDaten, (pfad) => {
    required(pfad.vorname);
    required(pfad.nachname);
    required(pfad.email);
    emailValidator(pfad.email);
    required(pfad.standortId);
    disabled(pfad.standortId, { when: () => !this.standorte.hasValue() });
    // Regeln wie beim Passwort-Setzen im Backend (CreateNutzerDto).
    required(pfad.passwort);
    minLength(pfad.passwort, 12);
    maxLength(pfad.passwort, 128);
  });
  protected readonly passwortSichtbar = signal(false);

  protected readonly angelegt = signal<NeuerNutzer | null>(null);
  protected readonly fehler = signal<string | null>(null);
  protected readonly wirdGeladen = signal(false);

  get vorname(): string {
    return this.nutzerDaten().vorname;
  }

  set vorname(vorname: string) {
    this.nutzerDaten.update((daten) => ({ ...daten, vorname }));
  }

  get nachname(): string {
    return this.nutzerDaten().nachname;
  }

  set nachname(nachname: string) {
    this.nutzerDaten.update((daten) => ({ ...daten, nachname }));
  }

  get email(): string {
    return this.nutzerDaten().email;
  }

  set email(email: string) {
    this.nutzerDaten.update((daten) => ({ ...daten, email }));
  }

  get standortId(): string {
    return this.nutzerDaten().standortId;
  }

  set standortId(standortId: string) {
    this.nutzerDaten.update((daten) => ({ ...daten, standortId }));
  }

  get passwort(): string {
    return this.nutzerDaten().passwort;
  }

  set passwort(passwort: string) {
    this.nutzerDaten.update((daten) => ({ ...daten, passwort }));
  }

  protected passwortSichtbarkeitUmschalten(): void {
    this.passwortSichtbar.update((sichtbar) => !sichtbar);
  }

  async submit(): Promise<void> {
    if (!this.standorte.hasValue() || !this.nutzerForm().valid()) return;
    this.fehler.set(null);
    this.wirdGeladen.set(true);
    try {
      const result = await firstValueFrom(
        this.nutzerApi.legeNutzerAn({
          vorname: this.vorname,
          nachname: this.nachname,
          email: this.email,
          standortId: this.standortId,
          passwort: this.passwort,
        }),
      );
      this.angelegt.set(result);
      this.nutzerDaten.set(LEERES_FORMULAR);
      this.passwortSichtbar.set(false);
    } catch (error) {
      this.fehler.set(extrahiereFehlermeldung(error, 'Account konnte nicht angelegt werden.'));
    } finally {
      this.wirdGeladen.set(false);
    }
  }

  weitererNutzer(): void {
    this.angelegt.set(null);
    this.fehler.set(null);
  }
}
