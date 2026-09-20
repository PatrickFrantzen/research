import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
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
    httpMock.expectOne((req) => req.url === '/api/v1/avv-codes').flush([
      { id: 'avv-1', code: '17 01 01', bezeichnung: 'Beton', gefaehrlich: false },
    ]);

    const request = httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege');
    expect(request.request.params.get('seite')).toBe('0');
    expect(request.request.params.get('proSeite')).toBe('20');
    request.flush({ daten: [], gesamt: 0 });
  });

  it('loads the selected page and reloads when the paginator advances', () => {
    const fixture = TestBed.createComponent(WareneintragListe);
    fixture.detectChanges();
    httpMock.expectOne((req) => req.url === '/api/v1/avv-codes').flush([
      { id: 'avv-1', code: '17 01 01', bezeichnung: 'Beton', gefaehrlich: false },
    ]);

    const ersteSeite = httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege');
    expect(ersteSeite.request.params.get('seite')).toBe('0');
    expect(ersteSeite.request.params.get('proSeite')).toBe('20');
    ersteSeite.flush({ daten: [], gesamt: 41 });

    fixture.componentInstance.onSeitenwechsel({ pageIndex: 1, pageSize: 20 } as never);
    fixture.detectChanges();

    const zweiteSeite = httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege');
    expect(zweiteSeite.request.params.get('seite')).toBe('1');
    expect(zweiteSeite.request.params.get('proSeite')).toBe('20');
    zweiteSeite.flush({ daten: [], gesamt: 41 });
  });

  it('returns to the first page when the free-text filter changes', fakeAsync(() => {
    const fixture = TestBed.createComponent(WareneintragListe);
    fixture.detectChanges();
    httpMock.expectOne((req) => req.url === '/api/v1/avv-codes').flush([
      { id: 'avv-1', code: '17 01 01', bezeichnung: 'Beton', gefaehrlich: false },
    ]);
    httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege').flush({ daten: [], gesamt: 41 });

    fixture.componentInstance.onSeitenwechsel({ pageIndex: 1, pageSize: 20 } as never);
    fixture.detectChanges();
    httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege').flush({ daten: [], gesamt: 41 });

    fixture.componentInstance.onSucheEingabe('Bauschutt');
    tick(300);
    fixture.detectChanges();

    const gefilterteErsteSeite = httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege');
    expect(gefilterteErsteSeite.request.params.get('seite')).toBe('0');
    expect(gefilterteErsteSeite.request.params.get('suche')).toBe('Bauschutt');
    gefilterteErsteSeite.flush({ daten: [], gesamt: 1 });
  }));

  it('combines the avvCodeId filter with the free-text search', () => {
    const fixture = TestBed.createComponent(WareneintragListe);
    fixture.detectChanges();
    httpMock.expectOne((req) => req.url === '/api/v1/avv-codes').flush([
      { id: 'avv-1', code: '17 01 01', bezeichnung: 'Beton', gefaehrlich: false },
    ]);
    httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege').flush({ daten: [], gesamt: 0 });

    fixture.componentInstance.avvCodeId.set('avv-1');
    fixture.componentInstance.suche.set('Bauschutt');
    fixture.detectChanges();

    const request = httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege');
    expect(request.request.params.get('avvCodeId')).toBe('avv-1');
    expect(request.request.params.get('suche')).toBe('Bauschutt');
    request.flush({ daten: [], gesamt: 0 });
  });

  it('lets the user choose another AVV-Code without manually deleting the current selection', fakeAsync(() => {
    const fixture = TestBed.createComponent(WareneintragListe);
    fixture.detectChanges();
    httpMock.expectOne((req) => req.url === '/api/v1/avv-codes').flush([
      { id: 'avv-1', code: '17 01 01', bezeichnung: 'Beton', gefaehrlich: false },
    ]);
    httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege').flush({ daten: [], gesamt: 0 });
    tick();
    fixture.detectChanges();

    fixture.componentInstance.onAvvCodeAusgewaehlt({
      option: {
        value: 'avv-1',
      },
    } as never);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    httpMock
      .expectOne(
        (req) => req.url === '/api/v1/wareneintraege' && req.params.get('avvCodeId') === 'avv-1',
      )
      .flush({ daten: [], gesamt: 0 });

    const input = fixture.nativeElement.querySelector('[data-testid="avv-suche"]') as HTMLInputElement;
    expect(input.value).toBe('17 01 01 – Beton');

    input.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(input.value).toBe('');
    expect(fixture.componentInstance.avvCodeId()).toBe('avv-1');
  }));

  it('shows the assigned AVV-Code on each Wareneintrag', fakeAsync(() => {
    const fixture = TestBed.createComponent(WareneintragListe);
    fixture.detectChanges();
    httpMock.expectOne((req) => req.url === '/api/v1/avv-codes').flush([]);
    httpMock
      .expectOne((req) => req.url === '/api/v1/wareneintraege')
      .flush({ daten: [
        {
          id: 'wareneintrag-1',
          fotoUrl: '/foto.jpg',
          freitext: 'test',
          erstelltAm: '2026-09-19T18:08:00.000Z',
          avvCode: { code: '17 01 01' },
        },
      ], gesamt: 1 });
    tick();
    fixture.detectChanges();

    const karte = fixture.nativeElement.querySelector('.karte') as HTMLElement;
    expect(karte.textContent).toContain('AVV-Code: 17 01 01');
  }));

  it('shows the creation date in German format with 24-hour time', fakeAsync(() => {
    const fixture = TestBed.createComponent(WareneintragListe);
    fixture.detectChanges();
    httpMock.expectOne((req) => req.url === '/api/v1/avv-codes').flush([]);
    httpMock
      .expectOne((req) => req.url === '/api/v1/wareneintraege')
      .flush({ daten: [
        {
          id: 'wareneintrag-1',
          fotoUrl: '/foto.jpg',
          freitext: 'test',
          erstelltAm: '2026-09-19T20:08:00',
          avvCode: { code: '17 01 01' },
        },
      ], gesamt: 1 });
    tick();
    fixture.detectChanges();

    const datum = fixture.nativeElement.querySelector('.datum') as HTMLElement;
    expect(datum.textContent?.trim()).toBe('19.09.2026, 20:08');
  }));

  it('lets a supervisor open and save a Wareneintrag edit', fakeAsync(() => {
    const fixture = TestBed.createComponent(WareneintragListe);
    fixture.detectChanges();
    httpMock.expectOne((req) => req.url === '/api/v1/avv-codes').flush([
      { id: 'avv-2', code: '20 03 01', bezeichnung: 'Siedlungsabfälle', gefaehrlich: false },
    ]);
    httpMock
      .expectOne((req) => req.url === '/api/v1/wareneintraege')
      .flush({
        daten: [
          {
            id: 'wareneintrag-1',
            fotoUrl: '/foto.jpg',
            freitext: 'alter Text',
            erstelltAm: '2026-09-19T20:08:00',
            avvCode: { code: '17 01 01' },
          },
        ],
        gesamt: 1,
      });
    tick();
    fixture.detectChanges();

    fixture.componentInstance.bearbeitungOeffnen({
      id: 'wareneintrag-1',
      fotoUrl: '/foto.jpg',
      freitext: 'alter Text',
      erstelltAm: '2026-09-19T20:08:00',
      avvCode: { code: '17 01 01' },
    } as never);
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { bearbeitung: { freitext: string; avvCodeId: string } }).bearbeitung.freitext =
      'neuer Text';
    (fixture.componentInstance as unknown as { bearbeitung: { freitext: string; avvCodeId: string } }).bearbeitung.avvCodeId =
      'avv-2';
    fixture.detectChanges();

    void fixture.componentInstance.speichern();

    const request = httpMock.expectOne('/api/v1/wareneintraege/wareneintrag-1');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body.get('freitext')).toBe('neuer Text');
    expect(request.request.body.get('avvCodeId')).toBe('avv-2');
    request.flush({});
    tick();
    fixture.detectChanges();
    httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege').flush({ daten: [], gesamt: 0 });
  }));

  it('deletes a Wareneintrag after confirmation and reloads the list', fakeAsync(() => {
    spyOn(window, 'confirm').and.returnValue(true);
    const fixture = TestBed.createComponent(WareneintragListe);
    fixture.detectChanges();
    httpMock.expectOne((req) => req.url === '/api/v1/avv-codes').flush([]);
    httpMock
      .expectOne((req) => req.url === '/api/v1/wareneintraege')
      .flush({
        daten: [
          {
            id: 'wareneintrag-1',
            fotoUrl: '/foto.jpg',
            freitext: 'test',
            erstelltAm: '2026-09-19T20:08:00',
            avvCode: { code: '17 01 01' },
          },
        ],
        gesamt: 1,
      });
    tick();
    fixture.detectChanges();

    void fixture.componentInstance.loeschen({
      id: 'wareneintrag-1',
      fotoUrl: '/foto.jpg',
      freitext: 'test',
      erstelltAm: '2026-09-19T20:08:00',
      avvCode: { code: '17 01 01' },
    } as never);

    const request = httpMock.expectOne('/api/v1/wareneintraege/wareneintrag-1');
    expect(request.request.method).toBe('DELETE');
    request.flush({});
    tick();
    fixture.detectChanges();
    httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege').flush({ daten: [], gesamt: 0 });
  }));
});
