import { Component, inject, signal } from '@angular/core';
import { FormField, form, maxLength, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service.js';

@Component({
  selector: 'app-login',
  imports: [FormField, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Bestätigung nach erfolgreichem Passwort-Setzen (Weiterleitung aus
  // PasswortSetzen, Issue #55).
  protected readonly passwortGesetzt = this.route.snapshot.queryParamMap.has('passwortGesetzt');

  protected readonly loginDaten = signal({ email: '', passwort: '' });
  protected readonly loginForm = form(this.loginDaten, (pfad) => {
    required(pfad.email);
    required(pfad.passwort);
    maxLength(pfad.passwort, 128);
  });
  protected readonly fehler = signal<string | null>(null);
  protected readonly wirdGeladen = signal(false);
  protected readonly passwortSichtbar = signal(false);

  protected passwortSichtbarkeitUmschalten(): void {
    this.passwortSichtbar.update((sichtbar) => !sichtbar);
  }

  async submit(): Promise<void> {
    if (!this.loginForm().valid()) return;
    this.fehler.set(null);
    this.wirdGeladen.set(true);
    try {
      const { email, passwort } = this.loginDaten();
      const { mussPasswortSetzen } = await this.authService.login(email, passwort);
      if (mussPasswortSetzen) {
        this.fehler.set(
          'Für diesen Account muss zuerst ein Passwort gesetzt werden. Bitte den Link aus der Account-Anlage verwenden.',
        );
        this.authService.logout();
        return;
      }
      await this.router.navigateByUrl('/');
    } catch {
      this.fehler.set('E-Mail oder Passwort ungültig.');
    } finally {
      this.wirdGeladen.set(false);
    }
  }
}
