import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { WareneintragApi } from './wareneintrag-api.js';

describe('WareneintragApi', () => {
  let api: WareneintragApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(WareneintragApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads a filtered Wareneintrag page with stable query parameters', () => {
    api.liste({ avvCodeId: 'avv-1', suche: 'Bauschutt', seite: 2, proSeite: 50 }).subscribe();

    const request = httpMock.expectOne(
      (req) =>
        req.url === '/api/v1/wareneintraege' &&
        req.params.get('avvCodeId') === 'avv-1' &&
        req.params.get('suche') === 'Bauschutt' &&
        req.params.get('seite') === '2' &&
        req.params.get('proSeite') === '50',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ daten: [], gesamt: 0 });
  });

  it('sends date range and AVV sorting only when set (Issue #131)', () => {
    api
      .liste({
        avvCodeId: null,
        suche: '',
        seite: 0,
        proSeite: 20,
        datumVon: '2026-10-20',
        datumBis: '2026-10-21',
        sortierung: 'avv-ab',
      })
      .subscribe();
    const mit = httpMock.expectOne(
      (req) =>
        req.params.get('datumVon') === '2026-10-20' &&
        req.params.get('datumBis') === '2026-10-21' &&
        req.params.get('sortierung') === 'avv-ab',
    );
    mit.flush({ daten: [], gesamt: 0 });

    api.liste({ avvCodeId: null, suche: '', seite: 0, proSeite: 20 }).subscribe();
    const ohne = httpMock.expectOne('/api/v1/wareneintraege?seite=0&proSeite=20');
    ohne.flush({ daten: [], gesamt: 0 });
  });
});
