import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NutzerAnlegen } from './nutzer-anlegen.js';

describe('NutzerAnlegen', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NutzerAnlegen],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads the Standorte for the select on init', () => {
    const fixture = TestBed.createComponent(NutzerAnlegen);
    fixture.detectChanges();

    const request = httpMock.expectOne('/api/v1/standorte');
    expect(request.request.method).toBe('GET');
    request.flush([{ id: 'standort-1', name: 'Hauptsitz' }]);
  });

  it('creates the Nutzer with the entered fields and resets the form on success', async () => {
    const fixture = TestBed.createComponent(NutzerAnlegen);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/standorte').flush([{ id: 'standort-1', name: 'Hauptsitz' }]);
    await fixture.whenStable();

    const component = fixture.componentInstance;
    component.vorname = 'Erika';
    component.nachname = 'Mustermann';
    component.email = 'erika@example.com';
    component.standortId = 'standort-1';
    component.passwort = 'Initial-Passwort-1';

    const submitPromise = component.submit();
    const request = httpMock.expectOne('/api/v1/nutzer');
    expect(request.request.body).toEqual({
      vorname: 'Erika',
      nachname: 'Mustermann',
      email: 'erika@example.com',
      standortId: 'standort-1',
      passwort: 'Initial-Passwort-1',
    });
    request.flush({ id: 'nutzer-2', vorname: 'Erika', nachname: 'Mustermann', email: 'erika@example.com' });
    await submitPromise;

    expect(component.vorname).toBe('');
    expect(component.passwort).toBe('');
    expect(
      (component as unknown as { angelegt: () => { email: string } | null }).angelegt()?.email,
    ).toBe('erika@example.com');
  });

  it('shows an error when creation fails', async () => {
    const fixture = TestBed.createComponent(NutzerAnlegen);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/standorte').flush([{ id: 'standort-1', name: 'Hauptsitz' }]);
    await fixture.whenStable();
    fixture.componentInstance.vorname = 'Erika';
    fixture.componentInstance.nachname = 'Mustermann';
    fixture.componentInstance.email = 'erika@example.com';
    fixture.componentInstance.standortId = 'standort-1';
    fixture.componentInstance.passwort = 'Initial-Passwort-1';

    const submitPromise = fixture.componentInstance.submit();
    httpMock.expectOne('/api/v1/nutzer').flush('error', { status: 500, statusText: 'Server Error' });
    await submitPromise;

    expect(
      (fixture.componentInstance as unknown as { fehler: () => string | null }).fehler(),
    ).toBe('Account konnte nicht angelegt werden.');
  });

  async function legeNutzerAn(fixture: ReturnType<typeof TestBed.createComponent<NutzerAnlegen>>) {
    const component = fixture.componentInstance;
    component.vorname = 'Erika';
    component.nachname = 'Mustermann';
    component.email = 'erika@example.com';
    component.standortId = 'standort-1';
    component.passwort = 'Initial-Passwort-1';
    const submitPromise = component.submit();
    httpMock
      .expectOne('/api/v1/nutzer')
      .flush({ id: 'nutzer-2', vorname: 'Erika', nachname: 'Mustermann', email: 'erika@example.com' });
    await submitPromise;
    fixture.detectChanges();
  }

  it('confirms the new account and reminds to hand over the credentials in person – Issue #76', async () => {
    const fixture = TestBed.createComponent(NutzerAnlegen);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/standorte').flush([{ id: 'standort-1', name: 'Hauptsitz' }]);
    await fixture.whenStable();
    await legeNutzerAn(fixture);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Account für Erika Mustermann (erika@example.com) wurde angelegt.');
    expect(text).toContain('persönlich');
    // Das Initialpasswort wird nach dem Anlegen nicht erneut angezeigt.
    expect(text).not.toContain('Initial-Passwort-1');
  });

  it('requires an initial password with at least 12 characters', async () => {
    const fixture = TestBed.createComponent(NutzerAnlegen);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/standorte').flush([{ id: 'standort-1', name: 'Hauptsitz' }]);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component.vorname = 'Erika';
    component.nachname = 'Mustermann';
    component.email = 'erika@example.com';
    component.standortId = 'standort-1';
    component.passwort = 'zu-kurz';

    await component.submit();

    httpMock.expectNone('/api/v1/nutzer');
    expect().nothing();
  });

  it('returns to an empty form for another Nutzer without reloading', async () => {
    const fixture = TestBed.createComponent(NutzerAnlegen);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/standorte').flush([{ id: 'standort-1', name: 'Hauptsitz' }]);
    await fixture.whenStable();
    await legeNutzerAn(fixture);

    (fixture.nativeElement.querySelector('[data-testid="weiterer-nutzer"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
    expect(fixture.componentInstance.vorname).toBe('');
  });

  it('shows a Standort load error with retry and blocks submitting until Standorte are loaded', async () => {
    const fixture = TestBed.createComponent(NutzerAnlegen);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/standorte').flush('Fehler', { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const component = fixture.componentInstance;
    component.vorname = 'Erika';
    component.nachname = 'Mustermann';
    component.email = 'erika@example.com';
    component.standortId = 'standort-1';
    component.passwort = 'Initial-Passwort-1';
    fixture.detectChanges();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Standorte konnten nicht geladen werden.');
    expect((element.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBeTrue();
    await component.submit();
    httpMock.expectNone('/api/v1/nutzer');

    (element.querySelector('[data-testid="erneut-laden"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/standorte').flush([{ id: 'standort-1', name: 'Hauptsitz' }]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect((element.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBeFalse();
  });
});
