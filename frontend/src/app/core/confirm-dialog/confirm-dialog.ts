import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmDialogDaten {
  titel: string;
  nachricht: string;
  bestaetigenLabel?: string;
  abbrechenLabel?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './confirm-dialog.html',
})
export class ConfirmDialog {
  protected readonly daten = inject<ConfirmDialogDaten>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ConfirmDialog>);

  abbrechen(): void {
    this.dialogRef.close();
  }

  bestaetigen(): void {
    this.dialogRef.close(true);
  }
}
