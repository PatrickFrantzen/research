import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service.js';

@Component({
  selector: 'app-passwort-vergessen',
  imports: [FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, RouterLink],
  templateUrl: './passwort-vergessen.html',
  styleUrl: './passwort-vergessen.scss',
})
export class PasswortVergessen {
  private readonly authService = inject(AuthService);

  email = '';
  protected readonly angefordert = signal(false);
  protected readonly wirdGeladen = signal(false);

  async submit(): Promise<void> {
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
