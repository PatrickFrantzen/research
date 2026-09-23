import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { Einstellungen } from './einstellungen.js';

describe('Einstellungen', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Einstellungen],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads the own Stammdaten and prefills the form', async () => {
    const fixture = TestBed.createComponent(Einstellungen);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/standorte').flush([]);

    const request = httpMock.expectOne('/api/v1/nutzer/me');
    expect(request.request.method).toBe('GET');
    request.flush({
      id: 'nutzer-1',
      vorname: 'Erika',
      nachname: 'Musterfrau',
      email: 'erika@research.local',
      standortId: 'standort-1',
    });

    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.vorname).toBe('Erika');
    expect(fixture.componentInstance.nachname).toBe('Musterfrau');
    expect(fixture.componentInstance.standortId).toBe('standort-1');
  });

  it('saves the changed fields and shows a success message', async () => {
    const openSpy = spyOn(TestBed.inject(MatSnackBar), 'open');
    const fixture = TestBed.createComponent(Einstellungen);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/standorte').flush([]);
    httpMock
      .expectOne('/api/v1/nutzer/me')
      .flush({ vorname: 'Erika', nachname: 'Musterfrau', email: 'erika@research.local', standortId: 'standort-1' });
    await fixture.whenStable();

    const component = fixture.componentInstance;
    component.vorname = 'Erika';
    component.nachname = 'Neuername';
    component.standortId = 'standort-2';

    const submitPromise = component.submit();
    const request = httpMock.expectOne('/api/v1/nutzer/me');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ vorname: 'Erika', nachname: 'Neuername', standortId: 'standort-2' });
    request.flush({ vorname: 'Erika', nachname: 'Neuername', email: 'erika@research.local', standortId: 'standort-2' });
    await submitPromise;

    expect(openSpy).toHaveBeenCalledWith('Änderungen gespeichert.', undefined, jasmine.anything());
  });

  it('links to the Impressum, since mobile has no footer', () => {
    const fixture = TestBed.createComponent(Einstellungen);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/standorte').flush([]);
    httpMock.expectOne('/api/v1/nutzer/me').flush({ vorname: '', nachname: '', email: '', standortId: '' });

    const link = fixture.nativeElement.querySelector('.impressum-link') as HTMLAnchorElement | null;
    expect(link?.getAttribute('href')).toBe('/impressum');
  });

  it('keeps the form locked until the own data and Standorte are loaded', async () => {
    const fixture = TestBed.createComponent(Einstellungen);
    fixture.detectChanges();
    const speichern = () => fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    const vorname = () => fixture.nativeElement.querySelector('input') as HTMLInputElement;

    expect(speichern().disabled).toBeTrue();
    expect(vorname().disabled).toBeTrue();

    httpMock.expectOne('/api/v1/standorte').flush([{ id: 'standort-1', name: 'Hauptsitz' }]);
    httpMock
      .expectOne('/api/v1/nutzer/me')
      .flush({ vorname: 'Erika', nachname: 'Musterfrau', email: 'erika@research.local', standortId: 'standort-1' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(vorname().disabled).toBeFalse();
    expect(speichern().disabled).toBeFalse();
  });

  it('shows a load error of the own data with retry and does not allow saving', async () => {
    const fixture = TestBed.createComponent(Einstellungen);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/standorte').flush([]);
    httpMock.expectOne('/api/v1/nutzer/me').flush('Fehler', { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Deine Daten konnten nicht geladen werden.');
    expect((element.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBeTrue();

    (element.querySelector('[data-testid="erneut-laden"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    httpMock
      .expectOne('/api/v1/nutzer/me')
      .flush({ vorname: 'Erika', nachname: 'Musterfrau', email: 'erika@research.local', standortId: '' });
  });
});
