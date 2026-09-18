import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service.js';

@Component({
  selector: 'app-passwort-setzen',
  imports: [FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, RouterLink],
  templateUrl: './passwort-setzen.html',
  styleUrl: './passwort-setzen.scss',
})
export class PasswortSetzen {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';

  neuesPasswort = '';
  protected readonly fehler = signal<string | null>(null);
  protected readonly erfolgreich = signal(false);
  protected readonly wirdGeladen = signal(false);

  async submit(): Promise<void> {
    this.fehler.set(null);
    this.wirdGeladen.set(true);
    try {
      await this.authService.passwortSetzen(this.token, this.neuesPasswort);
      this.erfolgreich.set(true);
      setTimeout(() => this.router.navigateByUrl('/login'), 2000);
    } catch {
      this.fehler.set('Link ist ungültig oder abgelaufen.');
    } finally {
      this.wirdGeladen.set(false);
    }
  }
}
