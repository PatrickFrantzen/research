// Pflicht-Passwortwechsel beim ersten Login (Issue #76): Wer mit einem
// Initialpasswort eingeloggt ist, das ein Kollege vergeben hat, landet hier
// und kommt erst nach dem Wechsel in die App (authGuard/initialpasswortGuard,
// serverseitig JwtAuthGuard).
import { Component, computed, inject, signal } from '@angular/core';
import { FormField, form, maxLength, minLength, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service.js';
import { FokusBeiAnzeige } from '../../core/fokus-bei-anzeige.js';
import { extrahiereFehlermeldung } from '../../core/http-fehler.js';

@Component({
  selector: 'app-passwort-aendern',
  imports: [FokusBeiAnzeige, FormField, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule],
  templateUrl: './passwort-aendern.html',
})
export class PasswortAendern {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly passwortDaten = signal({ neuesPasswort: '', wiederholung: '' });
  protected readonly passwortForm = form(this.passwortDaten, (pfad) => {
    required(pfad.neuesPasswort);
    minLength(pfad.neuesPasswort, 12);
    maxLength(pfad.neuesPasswort, 128);
    required(pfad.wiederholung);
  });
  protected readonly stimmtUeberein = computed(
    () => this.passwortDaten().neuesPasswort === this.passwortDaten().wiederholung,
  );
  protected readonly fehler = signal<string | null>(null);
  protected readonly wirdGeladen = signal(false);

  get neuesPasswort(): string {
    return this.passwortDaten().neuesPasswort;
  }

  set neuesPasswort(neuesPasswort: string) {
    this.passwortDaten.update((daten) => ({ ...daten, neuesPasswort }));
  }

  get wiederholung(): string {
    return this.passwortDaten().wiederholung;
  }

  set wiederholung(wiederholung: string) {
    this.passwortDaten.update((daten) => ({ ...daten, wiederholung }));
  }

  async submit(): Promise<void> {
    if (!this.passwortForm().valid() || !this.stimmtUeberein()) return;
    this.fehler.set(null);
    this.wirdGeladen.set(true);
    try {
      await this.authService.passwortAendern(this.neuesPasswort);
      this.snackBar.open('Passwort geändert.', undefined, { duration: 3000 });
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.fehler.set(extrahiereFehlermeldung(error, 'Passwort konnte nicht geändert werden.'));
    } finally {
      this.wirdGeladen.set(false);
    }
  }

  async abmelden(): Promise<void> {
    this.authService.logout();
    await this.router.navigateByUrl('/login');
  }
}
