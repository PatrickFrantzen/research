import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PasswortZuruecksetzenDialog } from './passwort-zuruecksetzen-dialog.js';

describe('PasswortZuruecksetzenDialog', () => {
  let httpMock: HttpTestingController;
  let dialogRef: jasmine.SpyObj<MatDialogRef<PasswortZuruecksetzenDialog>>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<PasswortZuruecksetzenDialog>>('MatDialogRef', ['close']);
    await TestBed.configureTestingModule({
      imports: [PasswortZuruecksetzenDialog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: dialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { nutzer: { id: 'nutzer-2', vorname: 'Max', nachname: 'Mustermann', email: 'max@example.com', standort: { id: 's', name: 'X' } } },
        },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('sends the new initial password and closes with true', async () => {
    const component = TestBed.createComponent(PasswortZuruecksetzenDialog).componentInstance;
    component.passwort = 'Neues-Initial-Pw-1';

    const laeuft = component.zuruecksetzen();
    const request = httpMock.expectOne('/api/v1/nutzer/nutzer-2/passwort-zuruecksetzen');
    expect(request.request.body).toEqual({ passwort: 'Neues-Initial-Pw-1' });
    request.flush(null, { status: 204, statusText: 'No Content' });
    await laeuft;

    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('stays open and shows the error when the reset fails', async () => {
    const fixture = TestBed.createComponent(PasswortZuruecksetzenDialog);
    fixture.componentInstance.passwort = 'Neues-Initial-Pw-1';

    const laeuft = fixture.componentInstance.zuruecksetzen();
    httpMock
      .expectOne('/api/v1/nutzer/nutzer-2/passwort-zuruecksetzen')
      .flush({ message: 'Nutzer nicht gefunden.' }, { status: 404, statusText: 'Not Found' });
    await laeuft;
    fixture.detectChanges();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent).toContain('Nutzer nicht gefunden.');
  });

  it('does not send a password shorter than 12 characters', async () => {
    const component = TestBed.createComponent(PasswortZuruecksetzenDialog).componentInstance;
    component.passwort = 'zu-kurz';

    await component.zuruecksetzen();

    httpMock.expectNone('/api/v1/nutzer/nutzer-2/passwort-zuruecksetzen');
    expect(dialogRef.close).not.toHaveBeenCalled();
  });
});
