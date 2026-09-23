import { NgOptimizedImage } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../auth.service.js';
import { ThemeService } from '../theme.service.js';
import { MehrMenu } from './mehr-menu.js';

@Component({
  selector: 'app-shell',
  imports: [NgOptimizedImage, MatButtonModule, MatIconModule, MatToolbarModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  protected readonly authService = inject(AuthService);
  protected readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly bottomSheet = inject(MatBottomSheet);

  mehrOeffnen(): void {
    this.bottomSheet.open(MehrMenu);
  }

  async logout(): Promise<void> {
    this.authService.logout();
    await this.router.navigateByUrl('/login');
  }
}
