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

  it('lets the user choose another AVV-Code without manually deleting the current selection', fakeAsync(() => {
    const fixture = TestBed.createComponent(WareneintragListe);
    fixture.detectChanges();
    httpMock.expectOne((req) => req.url === '/api/v1/avv-codes').flush([]);
    httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege').flush([]);
    tick();
    fixture.detectChanges();

    fixture.componentInstance.onAvvCodeAusgewaehlt({
      option: {
        value: { id: 'avv-1', code: '17 01 01', bezeichnung: 'Beton', gefaehrlich: false },
      },
    } as never);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    httpMock
      .expectOne(
        (req) => req.url === '/api/v1/wareneintraege' && req.params.get('avvCodeId') === 'avv-1',
      )
      .flush([]);

    const input = fixture.nativeElement.querySelector('input[name="avvSuche"]') as HTMLInputElement;
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
      .flush([
        {
          id: 'wareneintrag-1',
          fotoUrl: '/foto.jpg',
          freitext: 'test',
          erstelltAm: '2026-09-19T18:08:00.000Z',
          avvCode: { code: '17 01 01' },
        },
      ]);
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
      .flush([
        {
          id: 'wareneintrag-1',
          fotoUrl: '/foto.jpg',
          freitext: 'test',
          erstelltAm: '2026-09-19T20:08:00',
          avvCode: { code: '17 01 01' },
        },
      ]);
    tick();
    fixture.detectChanges();

    const datum = fixture.nativeElement.querySelector('.datum') as HTMLElement;
    expect(datum.textContent?.trim()).toBe('19.09.2026, 20:08');
  }));
});
