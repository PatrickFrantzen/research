import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ConfirmDialog } from './confirm-dialog.js';

describe('ConfirmDialog', () => {
  let dialogRef: jasmine.SpyObj<MatDialogRef<ConfirmDialog>>;

  function setup(data: { titel: string; nachricht: string; bestaetigenLabel?: string; abbrechenLabel?: string }) {
    dialogRef = jasmine.createSpyObj<MatDialogRef<ConfirmDialog>>('MatDialogRef', ['close']);
    return TestBed.configureTestingModule({
      imports: [ConfirmDialog],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    }).compileComponents();
  }

  it('shows the given title and message', async () => {
    await setup({ titel: 'Wareneintrag löschen', nachricht: 'Möchten Sie "Bauschutt" wirklich löschen?' });
    const fixture = TestBed.createComponent(ConfirmDialog);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Wareneintrag löschen');
    expect(text).toContain('Möchten Sie "Bauschutt" wirklich löschen?');
  });

  it('closes with true when the confirm button is clicked', async () => {
    await setup({ titel: 'Titel', nachricht: 'Nachricht' });
    const fixture = TestBed.createComponent(ConfirmDialog);
    fixture.detectChanges();

    const bestaetigen = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="confirm-dialog-bestaetigen"]',
    ) as HTMLButtonElement;
    bestaetigen.click();

    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('closes with no result when the cancel button is clicked', async () => {
    await setup({ titel: 'Titel', nachricht: 'Nachricht' });
    const fixture = TestBed.createComponent(ConfirmDialog);
    fixture.detectChanges();

    const abbrechen = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="confirm-dialog-abbrechen"]',
    ) as HTMLButtonElement;
    abbrechen.click();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });

  it('uses custom button labels when provided', async () => {
    await setup({ titel: 'Titel', nachricht: 'Nachricht', bestaetigenLabel: 'Endgültig löschen', abbrechenLabel: 'Doch nicht' });
    const fixture = TestBed.createComponent(ConfirmDialog);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Endgültig löschen');
    expect(text).toContain('Doch nicht');
  });

  it('falls back to default button labels when none are provided', async () => {
    await setup({ titel: 'Titel', nachricht: 'Nachricht' });
    const fixture = TestBed.createComponent(ConfirmDialog);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Bestätigen');
    expect(text).toContain('Abbrechen');
  });
});
