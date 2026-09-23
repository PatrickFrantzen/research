// Neues Initialpasswort für einen Kollegen vergeben, der sein Passwort
// vergessen hat (Issue #76). Kein Mailversand: Das Passwort wird persönlich
// weitergegeben, beim nächsten Login muss der Kollege es ändern.
import { Component, inject, signal } from '@angular/core';
import { FormField, form, maxLength, minLength, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';
import { FokusBeiAnzeige } from '../../core/fokus-bei-anzeige.js';
import { extrahiereFehlermeldung } from '../../core/http-fehler.js';
import { NutzerApi, NutzerUebersicht } from '../../core/nutzer-api.js';

@Component({
  selector: 'app-passwort-zuruecksetzen-dialog',
  imports: [FokusBeiAnzeige, FormField, MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Passwort zurücksetzen</h2>
    <form (submit)="$event.preventDefault(); zuruecksetzen()">
      <mat-dialog-content class="formular">
        <p>
          Neues Initialpasswort für {{ nutzer.vorname }} {{ nutzer.nachname }}. Bitte persönlich weitergeben, beim nächsten
          Login muss es geändert werden. Bestehende Anmeldungen werden beendet.
        </p>
        <mat-form-field appearance="outline">
          <mat-label>Neues Initialpasswort</mat-label>
          <input
            matInput
            data-testid="zuruecksetzen-passwort"
            [type]="passwortSichtbar() ? 'text' : 'password'"
            [formField]="passwortForm.passwort"
            autocomplete="new-password"
          />
          <button
            matIconButton
            matSuffix
            type="button"
            [attr.aria-label]="passwortSichtbar() ? 'Passwort verbergen' : 'Passwort anzeigen'"
            (click)="passwortSichtbar.set(!passwortSichtbar())"
          >
            <mat-icon>{{ passwortSichtbar() ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
          <mat-hint>Mindestens 12 Zeichen</mat-hint>
        </mat-form-field>
        @if (fehler(); as meldung) {
          <p class="fehler" role="alert" appFokusBeiAnzeige>{{ meldung }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button matButton type="button" mat-dialog-close>Abbrechen</button>
        <button matButton="filled" type="submit" [disabled]="!passwortForm().valid() || wirdGeladen()">
          Zurücksetzen
        </button>
      </mat-dialog-actions>
    </form>
  `,
})
export class PasswortZuruecksetzenDialog {
  protected readonly nutzer = inject<{ nutzer: NutzerUebersicht }>(MAT_DIALOG_DATA).nutzer;
  private readonly dialogRef = inject(MatDialogRef<PasswortZuruecksetzenDialog, boolean>);
  private readonly nutzerApi = inject(NutzerApi);

  protected readonly passwortDaten = signal({ passwort: '' });
  protected readonly passwortForm = form(this.passwortDaten, (pfad) => {
    required(pfad.passwort);
    minLength(pfad.passwort, 12);
    maxLength(pfad.passwort, 128);
  });
  protected readonly passwortSichtbar = signal(false);
  protected readonly fehler = signal<string | null>(null);
  protected readonly wirdGeladen = signal(false);

  set passwort(passwort: string) {
    this.passwortDaten.set({ passwort });
  }

  async zuruecksetzen(): Promise<void> {
    if (!this.passwortForm().valid()) return;
    this.fehler.set(null);
    this.wirdGeladen.set(true);
    try {
      await firstValueFrom(this.nutzerApi.passwortZuruecksetzen(this.nutzer.id, this.passwortDaten().passwort));
      this.dialogRef.close(true);
    } catch (error) {
      this.fehler.set(extrahiereFehlermeldung(error, 'Passwort konnte nicht zurückgesetzt werden.'));
    } finally {
      this.wirdGeladen.set(false);
    }
  }
}
