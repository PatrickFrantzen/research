import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MitarbeiterAnlegen } from './mitarbeiter-anlegen.js';

describe('MitarbeiterAnlegen', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MitarbeiterAnlegen],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads the Standorte for the select on init', () => {
    const fixture = TestBed.createComponent(MitarbeiterAnlegen);
    fixture.detectChanges();

    const request = httpMock.expectOne('/api/v1/standorte');
    expect(request.request.method).toBe('GET');
    request.flush([{ id: 'standort-1', name: 'Hauptsitz' }]);
  });

  it('creates the Mitarbeiter with the entered fields and resets the form on success', async () => {
    const fixture = TestBed.createComponent(MitarbeiterAnlegen);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/standorte').flush([]);

    const component = fixture.componentInstance;
    component.vorname = 'Erika';
    component.nachname = 'Mustermann';
    component.email = 'erika@example.com';
    component.standortId = 'standort-1';

    const submitPromise = component.submit();
    const request = httpMock.expectOne('/api/v1/nutzer');
    expect(request.request.body).toEqual({
      vorname: 'Erika',
      nachname: 'Mustermann',
      email: 'erika@example.com',
      standortId: 'standort-1',
    });
    request.flush({ email: 'erika@example.com', passwortSetzenLink: 'https://example.com/setzen?token=abc' });
    await submitPromise;

    expect(component.vorname).toBe('');
    expect(
      (component as unknown as { angelegt: () => { email: string } | null }).angelegt()?.email,
    ).toBe('erika@example.com');
  });

  it('shows an error when creation fails', async () => {
    const fixture = TestBed.createComponent(MitarbeiterAnlegen);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/standorte').flush([]);
    fixture.componentInstance.vorname = 'Erika';
    fixture.componentInstance.nachname = 'Mustermann';
    fixture.componentInstance.email = 'erika@example.com';
    fixture.componentInstance.standortId = 'standort-1';

    const submitPromise = fixture.componentInstance.submit();
    httpMock.expectOne('/api/v1/nutzer').flush('error', { status: 500, statusText: 'Server Error' });
    await submitPromise;

    expect(
      (fixture.componentInstance as unknown as { fehler: () => string | null }).fehler(),
    ).toBe('Account konnte nicht angelegt werden.');
  });
});
