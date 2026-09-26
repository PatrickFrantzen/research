import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FokusBeiAnzeige } from '../../core/fokus-bei-anzeige.js';
import { extrahiereFehlermeldung } from '../../core/http-fehler.js';
import { LadeZustand } from '../../core/lade-zustand/lade-zustand.js';
import { NutzerApi, NutzerUebersicht } from '../../core/nutzer-api.js';

@Component({
  selector: 'app-nutzerverwaltung',
  imports: [FokusBeiAnzeige, LadeZustand, MatButtonModule, MatCardModule, MatIconModule, MatListModule, RouterLink],
  templateUrl: './nutzerverwaltung.html',
})
export class Nutzerverwaltung {
  private readonly nutzerApi = inject(NutzerApi);

  protected readonly nutzer = rxResource({ stream: () => this.nutzerApi.liste() });
  protected readonly nutzerListe = computed(() => (this.nutzer.hasValue() ? this.nutzer.value() : []));

  protected readonly meldung = signal<string | null>(null);
  protected readonly fehler = signal<string | null>(null);
  protected readonly wirdGesendet = signal<string | null>(null);

  async passwortMailSenden(n: NutzerUebersicht): Promise<void> {
    this.meldung.set(null);
    this.fehler.set(null);
    this.wirdGesendet.set(n.id);
    try {
      await firstValueFrom(this.nutzerApi.sendePasswortLink(n.id));
      this.meldung.set(`Passwort-Mail an ${n.email} wurde verschickt (24 Stunden gültig).`);
    } catch (error) {
      this.fehler.set(extrahiereFehlermeldung(error, `Passwort-Mail an ${n.email} konnte nicht verschickt werden.`));
    } finally {
      this.wirdGesendet.set(null);
    }
  }
}
