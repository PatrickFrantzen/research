import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Protokolle } from './protokolle.js';

describe('Protokolle', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Protokolle],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  async function geladen() {
    const fixture = TestBed.createComponent(Protokolle);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/protokoll').flush({ tage: ['2026-09-26', '2026-09-25'] });
    await fixture.whenStable();
    fixture.detectChanges();
    httpMock
      .expectOne('/api/v1/protokoll/aktivitaet/2026-09-26')
      .flush('2026-09-26 08:00:00 | a@x.de | Wareneintrag erstellt | 1\n2026-09-26 09:00:00 | b@x.de | Nutzer angelegt | 2\n');
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('zeigt das Aktivitäts-Log des neuesten Tages, neueste Zeile zuerst', async () => {
    const fixture = await geladen();
    const text = (fixture.nativeElement as HTMLElement).querySelector('pre')?.textContent ?? '';

    expect(text.indexOf('Nutzer angelegt')).toBeLessThan(text.indexOf('Wareneintrag erstellt'));
  });

  it('lädt beim Umschalten das Fehler-Log desselben Tages', async () => {
    const fixture = await geladen();

    (fixture.nativeElement.querySelector('[data-testid="art-fehler"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/protokoll/fehler/2026-09-26').flush('2026-09-26 10:00:00 | 400 | POST /x | a@x.de | kaputt\n');
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('pre')?.textContent).toContain('kaputt');
  });

  it('bietet die Datei zum Herunterladen an', async () => {
    const fixture = await geladen();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a[download]') as HTMLAnchorElement;

    expect(link.getAttribute('href')).toBe('/api/v1/protokoll/aktivitaet/2026-09-26');
    expect(link.getAttribute('download')).toBe('aktivitaet-2026-09-26.log');
  });
});
