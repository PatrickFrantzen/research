import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WareneintragListe } from './wareneintrag-liste.js';

describe('WareneintragListe', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WareneintragListe],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists all Wareneintraege without a filter on load', () => {
    const fixture = TestBed.createComponent(WareneintragListe);
    fixture.detectChanges();
    httpMock.expectOne((req) => req.url === '/api/v1/avv-codes').flush([]);

    const request = httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege');
    expect(request.request.params.keys().length).toBe(0);
    request.flush([]);
  });

  it('combines the avvCodeId filter with the free-text search', () => {
    const fixture = TestBed.createComponent(WareneintragListe);
    fixture.detectChanges();
    httpMock.expectOne((req) => req.url === '/api/v1/avv-codes').flush([]);
    httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege').flush([]);

    fixture.componentInstance.avvCodeId.set('avv-1');
    fixture.componentInstance.suche.set('Bauschutt');
    fixture.detectChanges();

    const request = httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege');
    expect(request.request.params.get('avvCodeId')).toBe('avv-1');
    expect(request.request.params.get('suche')).toBe('Bauschutt');
    request.flush([]);
  });
});
