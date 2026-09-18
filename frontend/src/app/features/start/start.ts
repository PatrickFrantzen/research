import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service.js';

@Component({
  selector: 'app-start',
  imports: [MatButtonModule, MatToolbarModule, RouterLink],
  templateUrl: './start.html',
  styleUrl: './start.scss',
})
export class Start {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  async logout(): Promise<void> {
    this.authService.logout();
    await this.router.navigateByUrl('/login');
  }
}
