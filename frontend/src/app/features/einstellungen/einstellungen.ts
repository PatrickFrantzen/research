import { HttpClient } from '@angular/common/http';
import { Component, effect, inject, resource, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

interface Standort {
  id: string;
  name: string;
}

interface EigeneDaten {
  vorname: string;
  nachname: string;
  email: string;
  standortId: string;
}

@Component({
  selector: 'app-einstellungen',
  imports: [FormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule, RouterLink],
  templateUrl: './einstellungen.html',
  styleUrl: './einstellungen.scss',
})
export class Einstellungen {
  private readonly http = inject(HttpClient);

  protected readonly standorte = resource({
    loader: () => firstValueFrom(this.http.get<Standort[]>('/api/v1/standorte')),
  });

  protected readonly eigeneDaten = resource({
    loader: () => firstValueFrom(this.http.get<EigeneDaten>('/api/v1/nutzer/me')),
  });

  vorname = '';
  nachname = '';
  standortId = '';

  protected readonly gespeichert = signal(false);
  protected readonly fehler = signal<string | null>(null);
  protected readonly wirdGeladen = signal(false);

  constructor() {
    effect(() => {
      const daten = this.eigeneDaten.value();
      if (daten) {
        this.vorname = daten.vorname;
        this.nachname = daten.nachname;
        this.standortId = daten.standortId;
      }
    });
  }

  async submit(): Promise<void> {
    this.fehler.set(null);
    this.gespeichert.set(false);
    this.wirdGeladen.set(true);
    try {
      await firstValueFrom(
        this.http.patch<EigeneDaten>('/api/v1/nutzer/me', {
          vorname: this.vorname,
          nachname: this.nachname,
          standortId: this.standortId,
        }),
      );
      this.gespeichert.set(true);
    } catch {
      this.fehler.set('Änderungen konnten nicht gespeichert werden.');
    } finally {
      this.wirdGeladen.set(false);
    }
  }
}
