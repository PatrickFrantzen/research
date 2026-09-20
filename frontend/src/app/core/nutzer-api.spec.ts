import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NutzerApi } from './nutzer-api.js';

describe('NutzerApi', () => {
  let api: NutzerApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(NutzerApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads and updates the own Nutzer data through the Nutzer endpoint', () => {
    api.eigeneDaten().subscribe();
    httpMock.expectOne('/api/v1/nutzer/me').flush({
      vorname: 'Erika',
      nachname: 'Musterfrau',
      email: 'erika@research.local',
      standortId: 'standort-1',
    });

    api.aktualisiereEigeneDaten({ vorname: 'Erika', nachname: 'Neu', standortId: 'standort-2' }).subscribe();
    const request = httpMock.expectOne('/api/v1/nutzer/me');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ vorname: 'Erika', nachname: 'Neu', standortId: 'standort-2' });
    request.flush({});
  });
});
