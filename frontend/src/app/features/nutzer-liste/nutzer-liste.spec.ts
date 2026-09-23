import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth.service.js';
import { NutzerListe } from './nutzer-liste.js';
import { PasswortZuruecksetzenDialog } from './passwort-zuruecksetzen-dialog.js';

const NUTZER = [
  { id: 'nutzer-1', vorname: 'Erika', nachname: 'Musterfrau', email: 'erika@example.com', standort: { id: 's1', name: 'Hauptsitz' } },
  { id: 'nutzer-2', vorname: 'Max', nachname: 'Mustermann', email: 'max@example.com', standort: { id: 's2', name: 'Außenlager' } },
];

describe('NutzerListe', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NutzerListe],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { nutzerId: signal('nutzer-1') } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  async function geladen() {
    const fixture = TestBed.createComponent(NutzerListe);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/nutzer').flush(NUTZER);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('lists all Nutzer with email and Standort, offering a reset for everyone except oneself', async () => {
    const element = (await geladen()).nativeElement as HTMLElement;

    const eintraege = element.querySelectorAll('[data-testid="nutzer-eintrag"]');
    expect(eintraege.length).toBe(2);
    expect(eintraege[1].textContent).toContain('Mustermann, Max');
    expect(eintraege[1].textContent).toContain('max@example.com · Außenlager');
    expect(eintraege[0].querySelector('[data-testid="passwort-zuruecksetzen"]')).toBeNull();
    expect(eintraege[1].querySelector('[data-testid="passwort-zuruecksetzen"]')?.textContent).toContain(
      'Passwort zurücksetzen für Max Mustermann',
    );
  });

  it('opens the reset dialog and confirms a successful reset', async () => {
    const fixture = await geladen();
    const dialog = spyOn(TestBed.inject(MatDialog), 'open').and.returnValue({ afterClosed: () => of(true) } as never);
    const snackBar = spyOn(TestBed.inject(MatSnackBar), 'open');

    fixture.componentInstance.passwortZuruecksetzen(NUTZER[1]);

    expect(dialog).toHaveBeenCalledWith(PasswortZuruecksetzenDialog, { data: { nutzer: NUTZER[1] } });
    expect(snackBar).toHaveBeenCalledWith(
      'Passwort für Max Mustermann zurückgesetzt. Bitte persönlich weitergeben.',
      undefined,
      jasmine.anything(),
    );
  });
});
