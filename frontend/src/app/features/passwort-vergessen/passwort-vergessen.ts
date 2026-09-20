import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service.js';

@Component({
  selector: 'app-passwort-vergessen',
  imports: [FormField, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, RouterLink],
  templateUrl: './passwort-vergessen.html',
  styleUrl: './passwort-vergessen.scss',
})
export class PasswortVergessen {
  private readonly authService = inject(AuthService);

  protected readonly passwortVergessenDaten = signal({ email: '' });
  protected readonly passwortVergessenForm = form(this.passwortVergessenDaten, (pfad) => {
    required(pfad.email);
    email(pfad.email);
  });
  protected readonly angefordert = signal(false);
  protected readonly wirdGeladen = signal(false);

  get email(): string {
    return this.passwortVergessenDaten().email;
  }

  set email(email: string) {
    this.passwortVergessenDaten.update((daten) => ({ ...daten, email }));
  }

  async submit(): Promise<void> {
    if (!this.passwortVergessenForm().valid()) return;
    this.wirdGeladen.set(true);
    try {
      await this.authService.passwortVergessen(this.email);
    } catch {
      // Immer die gleiche Meldung, egal ob die E-Mail existiert
      // (keine Rückschlüsse auf bestehende Accounts).
    } finally {
      this.wirdGeladen.set(false);
      this.angefordert.set(true);
    }
  }
}
