import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AvvCodeApi } from './avv-code-api.js';

describe('AvvCodeApi', () => {
  let api: AvvCodeApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AvvCodeApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('searches AVV codes with an optional search parameter', () => {
    api.suchen('Beton').subscribe();

    const request = httpMock.expectOne('/api/v1/avv-codes?suche=Beton');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });
});
