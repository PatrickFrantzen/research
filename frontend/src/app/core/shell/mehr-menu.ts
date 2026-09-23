import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service.js';

@Component({
  selector: 'app-mehr-menu',
  imports: [MatIconModule, MatListModule, RouterLink],
  template: `
    <mat-nav-list>
      <a mat-list-item routerLink="/nutzer-anlegen" (click)="schliessen()">
        <mat-icon matListItemIcon>person_add</mat-icon>
        <span matListItemTitle>Nutzer anlegen</span>
      </a>
      <a mat-list-item routerLink="/einstellungen" (click)="schliessen()">
        <mat-icon matListItemIcon>settings</mat-icon>
        <span matListItemTitle>Einstellungen</span>
      </a>
      <button mat-list-item type="button" (click)="logout()">
        <mat-icon matListItemIcon>logout</mat-icon>
        <span matListItemTitle>Logout</span>
      </button>
    </mat-nav-list>
  `,
})
export class MehrMenu {
  private readonly bottomSheetRef = inject(MatBottomSheetRef<MehrMenu>);
  private readonly authService = inject(AuthService);
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
