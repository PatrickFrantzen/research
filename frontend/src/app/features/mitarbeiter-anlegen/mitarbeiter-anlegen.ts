import { HttpClient } from '@angular/common/http';
import { Component, inject, resource, signal } from '@angular/core';
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

interface NeuerMitarbeiter {
  email: string;
  passwortSetzenLink: string;
}

@Component({
  selector: 'app-mitarbeiter-anlegen',
  imports: [
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    RouterLink,
  ],
  templateUrl: './mitarbeiter-anlegen.html',
  styleUrl: './mitarbeiter-anlegen.scss',
})
export class MitarbeiterAnlegen {
  private readonly http = inject(HttpClient);

  protected readonly standorte = resource({
    loader: () => firstValueFrom(this.http.get<Standort[]>('/api/v1/standorte')),
  });

  vorname = '';
  nachname = '';
  email = '';
  standortId = '';

  protected readonly angelegt = signal<NeuerMitarbeiter | null>(null);
  protected readonly fehler = signal<string | null>(null);
  protected readonly wirdGeladen = signal(false);

  async submit(): Promise<void> {
    this.fehler.set(null);
    this.wirdGeladen.set(true);
    try {
      const result = await firstValueFrom(
        this.http.post<NeuerMitarbeiter>('/api/v1/nutzer', {
          vorname: this.vorname,
          nachname: this.nachname,
          email: this.email,
          standortId: this.standortId,
        }),
      );
      this.angelegt.set(result);
      this.vorname = '';
      this.nachname = '';
      this.email = '';
      this.standortId = '';
    } catch {
      this.fehler.set('Account konnte nicht angelegt werden.');
    } finally {
      this.wirdGeladen.set(false);
    }
  }
}
