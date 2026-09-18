import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service.js';

@Component({
  selector: 'app-login',
  imports: [FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  passwort = '';
  protected readonly fehler = signal<string | null>(null);
  protected readonly wirdGeladen = signal(false);

  async submit(): Promise<void> {
    this.fehler.set(null);
    this.wirdGeladen.set(true);
    try {
      const { mussPasswortSetzen } = await this.authService.login(this.email, this.passwort);
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
