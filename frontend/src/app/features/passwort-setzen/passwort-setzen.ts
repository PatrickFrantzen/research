import { Component, inject, signal } from '@angular/core';
import { FormField, form, maxLength, minLength, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service.js';
import { extrahiereFehlermeldung } from '../../core/http-fehler.js';

@Component({
  selector: 'app-passwort-setzen',
  imports: [FormField, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, RouterLink],
  templateUrl: './passwort-setzen.html',
  styleUrl: './passwort-setzen.scss',
})
export class PasswortSetzen {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';

  protected readonly passwortDaten = signal({ neuesPasswort: '' });
  protected readonly passwortForm = form(this.passwortDaten, (pfad) => {
    required(pfad.neuesPasswort);
    minLength(pfad.neuesPasswort, 12);
    maxLength(pfad.neuesPasswort, 128);
  });
  protected readonly fehler = signal<string | null>(null);
  protected readonly erfolgreich = signal(false);
  protected readonly wirdGeladen = signal(false);

  get neuesPasswort(): string {
    return this.passwortDaten().neuesPasswort;
  }

  set neuesPasswort(neuesPasswort: string) {
    this.passwortDaten.update((daten) => ({ ...daten, neuesPasswort }));
  }

  constructor() {
    // Reset-Token nicht in URL/Browser-Historie/Referrer/Screenshots stehen
    // lassen, sobald er ausgelesen wurde (Issue #25).
    if (this.token) {
      void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    }
  }

  async submit(): Promise<void> {
    if (!this.passwortForm().valid()) return;
    this.fehler.set(null);
    this.wirdGeladen.set(true);
    try {
      await this.authService.passwortSetzen(this.token, this.neuesPasswort);
      this.erfolgreich.set(true);
      setTimeout(() => this.router.navigateByUrl('/login'), 2000);
    } catch (error) {
      this.fehler.set(extrahiereFehlermeldung(error, 'Link ist ungültig oder abgelaufen.'));
    } finally {
      this.wirdGeladen.set(false);
    }
  }
}
