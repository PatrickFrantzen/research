// Übersicht aller Nutzer (Issue #76): Von hier aus neue Kollegen anlegen und
// bei vergessenem Passwort ein neues Initialpasswort vergeben.
import { Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service.js';
import { LadeZustand } from '../../core/lade-zustand/lade-zustand.js';
import { NutzerApi, NutzerUebersicht } from '../../core/nutzer-api.js';
import { PasswortZuruecksetzenDialog } from './passwort-zuruecksetzen-dialog.js';

@Component({
  selector: 'app-nutzer-liste',
  imports: [LadeZustand, MatButtonModule, MatCardModule, RouterLink],
  templateUrl: './nutzer-liste.html',
  styleUrl: './nutzer-liste.scss',
})
export class NutzerListe {
  private readonly nutzerApi = inject(NutzerApi);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly authService = inject(AuthService);

  protected readonly nutzer = rxResource({
    stream: () => this.nutzerApi.liste(),
  });

  passwortZuruecksetzen(nutzer: NutzerUebersicht): void {
    this.dialog
      .open(PasswortZuruecksetzenDialog, { data: { nutzer } })
      .afterClosed()
      .subscribe((zurueckgesetzt) => {
        if (!zurueckgesetzt) return;
        this.snackBar.open(
          `Passwort für ${nutzer.vorname} ${nutzer.nachname} zurückgesetzt. Bitte persönlich weitergeben.`,
          undefined,
          { duration: 5000 },
        );
      });
  }
}
