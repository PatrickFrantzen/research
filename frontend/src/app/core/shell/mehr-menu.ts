import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service.js';
import { ThemeService } from '../theme.service.js';

@Component({
  selector: 'app-mehr-menu',
  imports: [MatIconModule, MatListModule, RouterLink],
  template: `
    <mat-nav-list>
      <a mat-list-item routerLink="/nutzer" (click)="schliessen()">
        <mat-icon matListItemIcon>group</mat-icon>
        <span matListItemTitle>Nutzer</span>
      </a>
      <a mat-list-item routerLink="/einstellungen" (click)="schliessen()">
        <mat-icon matListItemIcon>settings</mat-icon>
        <span matListItemTitle>Einstellungen</span>
      </a>
    </mat-nav-list>
    <mat-action-list>
      <button mat-list-item type="button" data-testid="farbmodus-umschalten" (click)="themeService.umschalten()">
        <mat-icon matListItemIcon>{{ themeService.modus() === 'dunkel' ? 'light_mode' : 'dark_mode' }}</mat-icon>
        <span matListItemTitle>{{ themeService.modus() === 'dunkel' ? 'Helles Design' : 'Dunkles Design' }}</span>
      </button>
      <button mat-list-item type="button" (click)="logout()">
        <mat-icon matListItemIcon>logout</mat-icon>
        <span matListItemTitle>Logout</span>
      </button>
    </mat-action-list>
  `,
})
export class MehrMenu {
  private readonly bottomSheetRef = inject(MatBottomSheetRef<MehrMenu>);
  private readonly authService = inject(AuthService);
  protected readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);

  schliessen(): void {
    this.bottomSheetRef.dismiss();
  }

  async logout(): Promise<void> {
    this.bottomSheetRef.dismiss();
    this.authService.logout();
    await this.router.navigateByUrl('/login');
  }
}
