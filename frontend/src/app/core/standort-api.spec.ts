import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { StandortApi } from './standort-api.js';

describe('StandortApi', () => {
  let api: StandortApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(StandortApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads all Standorte', () => {
    api.liste().subscribe();

    const request = httpMock.expectOne('/api/v1/standorte');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });
});
