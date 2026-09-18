import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
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

    expect(
      (component as unknown as { gespeichert: () => boolean }).gespeichert(),
    ).toBe(true);
  });
});
