import { Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormField, email as emailValidator, form, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { extrahiereFehlermeldung } from '../../core/http-fehler.js';
import { NeuerNutzer, NutzerApi } from '../../core/nutzer-api.js';
import { StandortApi } from '../../core/standort-api.js';

@Component({
  selector: 'app-nutzer-anlegen',
  imports: [
    FormField,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    RouterLink,
  ],
  templateUrl: './nutzer-anlegen.html',
  styleUrl: './nutzer-anlegen.scss',
})
export class NutzerAnlegen {
  private readonly nutzerApi = inject(NutzerApi);
  private readonly standortApi = inject(StandortApi);

  protected readonly standorte = rxResource({
    stream: () => this.standortApi.liste(),
  });

  protected readonly nutzerDaten = signal({ vorname: '', nachname: '', email: '', standortId: '' });
  protected readonly nutzerForm = form(this.nutzerDaten, (pfad) => {
    required(pfad.vorname);
    required(pfad.nachname);
    required(pfad.email);
    emailValidator(pfad.email);
    required(pfad.standortId);
  });

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

  async submit(): Promise<void> {
    if (!this.nutzerForm().valid()) return;
    this.fehler.set(null);
    this.wirdGeladen.set(true);
    try {
      const result = await firstValueFrom(
        this.nutzerApi.legeNutzerAn({
          vorname: this.vorname,
          nachname: this.nachname,
          email: this.email,
          standortId: this.standortId,
        }),
      );
      this.angelegt.set(result);
      this.nutzerDaten.set({ vorname: '', nachname: '', email: '', standortId: '' });
    } catch (error) {
      this.fehler.set(extrahiereFehlermeldung(error, 'Account konnte nicht angelegt werden.'));
    } finally {
      this.wirdGeladen.set(false);
    }
  }
}
