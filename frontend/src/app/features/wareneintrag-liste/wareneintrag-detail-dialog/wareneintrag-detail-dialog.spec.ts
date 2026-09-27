import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Wareneintrag } from '../../../core/wareneintrag-api.js';
import { WareneintragDetailDialog } from './wareneintrag-detail-dialog.js';

const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

const AVV_PASST = { urteil: 'passt', begruendung: 'Passt zum Bauschutt.', vorschlag: null };

const WARENEINTRAG: Wareneintrag = {
  id: 'wareneintrag-1',
  fotoFernUrl: PIXEL,
  fotoNahUrl: PIXEL,
  fotoDetailUrl: PIXEL,
  freitext: 'Bauschutt am Eingang',
  erstelltAm: '2026-09-19T20:08:00',
  avvCode: { id: 'avv-1', code: '17 01 01', bezeichnung: 'Beton' },
  standort: { id: 'standort-1', name: 'Hauptsitz' },
  erfasstVon: { id: 'nutzer-1', vorname: 'Erika', nachname: 'Musterfrau' },
};

describe('WareneintragDetailDialog', () => {
  function erstelle(wareneintrag: Wareneintrag, startFoto: number) {
    TestBed.configureTestingModule({
      imports: [WareneintragDetailDialog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: { wareneintrag, startFoto } },
        { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
      ],
    });
    const fixture = TestBed.createComponent(WareneintragDetailDialog);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const position = () => element.querySelector('[data-testid="galerie-position"]')?.textContent?.trim();
    const button = (name: string) => element.querySelector(`button[aria-label="${name}"]`) as HTMLButtonElement;
    return { fixture, element, position, button };
  }

  it('starts at the chosen foto and pages with the arrow buttons', () => {
    const { fixture, position, button } = erstelle(WARENEINTRAG, 1);
    expect(position()).toBe('2 / 3');

    button('Nächstes Foto').click();
    fixture.detectChanges();
    expect(position()).toBe('3 / 3');
    expect(button('Nächstes Foto').disabled).toBeTrue();

    button('Vorheriges Foto').click();
    button('Vorheriges Foto').click();
    fixture.detectChanges();
    expect(position()).toBe('1 / 3');
    expect(button('Vorheriges Foto').disabled).toBeTrue();
  });

  it('pages with ←/→ and stops at the ends', () => {
    const { fixture, element, position } = erstelle(WARENEINTRAG, 0);
    const taste = (key: string) => element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

    taste('ArrowLeft');
    fixture.detectChanges();
    expect(position()).toBe('1 / 3');

    taste('ArrowRight');
    taste('ArrowRight');
    taste('ArrowRight');
    fixture.detectChanges();
    expect(position()).toBe('3 / 3');
  });

  it('shows all data of the Wareneintrag', () => {
    const { element } = erstelle(WARENEINTRAG, 0);
    const text = element.textContent ?? '';
    expect(text).toContain('17 01 01 – Beton');
    expect(text).toContain('19.09.2026, 20:08');
    expect(text).toContain('Bauschutt am Eingang');
    expect(text).toContain('Hauptsitz');
    expect(text).toContain('Erika Musterfrau');
    expect(element.querySelectorAll('.spur img').length).toBe(3);
  });

  it('shows no gallery for a Wareneintrag without fotos', () => {
    const { element } = erstelle({ ...WARENEINTRAG, fotoFernUrl: null, fotoNahUrl: null, fotoDetailUrl: null }, 0);
    expect(element.querySelector('.galerie')).toBeNull();
    expect(element.textContent).toContain('Bauschutt am Eingang');
  });

  it('skips missing fotos and shows no arrows for a single foto', () => {
    const { element } = erstelle({ ...WARENEINTRAG, fotoFernUrl: null, fotoDetailUrl: null }, 0);
    expect(element.querySelector('.spur img')?.getAttribute('alt')).toBe('Nahansicht');
    expect(element.querySelector('.steuerung')).toBeNull();
  });

  describe('KI-Analyse (Issue #93)', () => {
    const URL = '/api/v1/wareneintraege/wareneintrag-1/ki-analyse';
    const analysierenButton = (element: HTMLElement) =>
      element.querySelector('[data-testid="analysieren"]') as HTMLButtonElement;

    it('shows a loading state and then the preview with bar, list, total and assessment', async () => {
      const { fixture, element } = erstelle(WARENEINTRAG, 0);
      const httpMock = TestBed.inject(HttpTestingController);

      analysierenButton(element).click();
      fixture.detectChanges();
      expect(element.querySelector('mat-progress-bar')).not.toBeNull();
      expect(analysierenButton(element).disabled).toBeTrue();

      httpMock.expectOne({ method: 'POST', url: URL }).flush({
        fraktionen: [
          { name: 'Beton', anteilProzent: 70 },
          { name: 'Holz', anteilProzent: 30 },
        ],
        einschaetzung: 'Überwiegend Beton.',
        avvPruefung: AVV_PASST,
      });
      await fixture.whenStable();
      fixture.detectChanges();

      const zeilen = [...element.querySelectorAll('.fraktionen li')].map((li) =>
        [...li.children].map((spalte) => spalte.textContent?.trim()).filter(Boolean).join(' '),
      );
      expect(zeilen).toEqual(['Beton 70 %', 'Holz 30 %', 'Gesamt 100 %']);
      expect(element.querySelectorAll('.balken span').length).toBe(2);
      expect(element.textContent).toContain('geschätzter Volumenanteil');
      expect(element.textContent).toContain('Überwiegend Beton.');
      expect(element.textContent).toContain('KI-Schätzung aus den Fotos, keine Messung.');
      expect(element.querySelector('mat-progress-bar')).toBeNull();
    });

    it('says so when no waste is visible', async () => {
      const { fixture, element } = erstelle(WARENEINTRAG, 0);
      analysierenButton(element).click();
      TestBed.inject(HttpTestingController).expectOne({ method: 'POST', url: URL }).flush({ fraktionen: [], einschaetzung: 'Nur Boden.', avvPruefung: AVV_PASST });
      await fixture.whenStable();
      fixture.detectChanges();

      expect(element.querySelector('[data-testid="kein-abfall"]')?.textContent).toContain('kein Abfall erkennbar');
      expect(element.querySelector('.fraktionen')).toBeNull();
    });

    it('shows the server message on failure, e.g. the exhausted daily quota', async () => {
      const { fixture, element } = erstelle(WARENEINTRAG, 0);
      analysierenButton(element).click();
      TestBed.inject(HttpTestingController)
        .expectOne({ method: 'POST', url: URL })
        .flush(
          { message: 'Tageskontingent der KI-Analyse erschöpft, bitte morgen erneut versuchen.' },
          { status: 429, statusText: 'Too Many Requests' },
        );
      await fixture.whenStable();
      fixture.detectChanges();

      expect(element.querySelector('[role="alert"]')?.textContent).toContain('Tageskontingent der KI-Analyse erschöpft');
      expect(analysierenButton(element).disabled).toBeFalse();
    });

    it('disables the button for a Wareneintrag without fotos', () => {
      const { element } = erstelle({ ...WARENEINTRAG, fotoFernUrl: null, fotoNahUrl: null, fotoDetailUrl: null }, 0);
      expect(analysierenButton(element).disabled).toBeTrue();
    });
  });

  describe('gespeicherte KI-Analyse (Issue #94)', () => {
    const URL = '/api/v1/wareneintraege/wareneintrag-1/ki-analyse';
    const ERGEBNIS = { fraktionen: [{ name: 'Beton', anteilProzent: 100 }], einschaetzung: 'Nur Beton.', avvPruefung: AVV_PASST };
    const GESPEICHERT = {
      ergebnis: ERGEBNIS,
      analysiertVon: { vorname: 'Max', nachname: 'Mustermann' },
      analysiertAm: '2026-09-20T14:05:00',
    };
    const button = (element: HTMLElement, testId: string) =>
      element.querySelector(`[data-testid="${testId}"]`) as HTMLButtonElement | null;

    async function nach(fixture: { whenStable: () => Promise<unknown>; detectChanges: () => void }) {
      await fixture.whenStable();
      fixture.detectChanges();
    }

    it('shows the saved analysis with author and time right after opening', async () => {
      const { fixture, element } = erstelle(WARENEINTRAG, 0);
      TestBed.inject(HttpTestingController).expectOne({ method: 'GET', url: URL }).flush(GESPEICHERT);
      await nach(fixture);

      expect(element.querySelector('[data-testid="einschaetzung"]')?.textContent).toContain('Nur Beton.');
      expect(element.querySelector('[data-testid="analysiert-von"]')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
        'Analysiert von Max Mustermann am 20.09.2026, 14:05',
      );
      expect(button(element, 'analysieren')).not.toBeNull();
      expect(element.querySelector('[data-testid="nicht-analysiert"]')).toBeNull();
    });

    it('says "Noch nicht analysiert" without a saved analysis (e.g. after a foto change, Issue #96)', async () => {
      const { fixture, element } = erstelle(WARENEINTRAG, 0);
      TestBed.inject(HttpTestingController).expectOne({ method: 'GET', url: URL }).flush(null);
      await nach(fixture);
      expect(element.querySelector('[data-testid="nicht-analysiert"]')?.textContent).toContain('Noch nicht analysiert.');
    });

    it('offers Speichern and Wiederholen for a preview and shows the saved result after saving', async () => {
      const { fixture, element } = erstelle(WARENEINTRAG, 0);
      const httpMock = TestBed.inject(HttpTestingController);
      httpMock.expectOne({ method: 'GET', url: URL }).flush(null);
      await nach(fixture);

      button(element, 'analysieren')!.click();
      httpMock.expectOne({ method: 'POST', url: URL }).flush(ERGEBNIS);
      await nach(fixture);
      expect(element.textContent).toContain('Vorschau, noch nicht gespeichert.');
      expect(button(element, 'analysieren')).toBeNull();

      button(element, 'analyse-speichern')!.click();
      const speichern = httpMock.expectOne({ method: 'PUT', url: URL });
      expect(speichern.request.body).toBeNull();
      speichern.flush({ ...GESPEICHERT, analysiertVon: { vorname: 'Erika', nachname: 'Musterfrau' } });
      await nach(fixture);

      expect(element.querySelector('[data-testid="analysiert-von"]')?.textContent).toContain('Erika Musterfrau');
      expect(element.textContent).not.toContain('Vorschau, noch nicht gespeichert.');
      expect(button(element, 'analyse-speichern')).toBeNull();
      expect(button(element, 'analysieren')).not.toBeNull();
    });

    it('starts a new preview on Wiederholen while the saved analysis stays until saving', async () => {
      const { fixture, element } = erstelle(WARENEINTRAG, 0);
      const httpMock = TestBed.inject(HttpTestingController);
      httpMock.expectOne({ method: 'GET', url: URL }).flush(GESPEICHERT);
      await nach(fixture);

      button(element, 'analysieren')!.click();
      httpMock.expectOne({ method: 'POST', url: URL }).flush({ ...ERGEBNIS, einschaetzung: 'Erster Versuch.' });
      await nach(fixture);
      button(element, 'analyse-wiederholen')!.click();
      httpMock.expectOne({ method: 'POST', url: URL }).flush({ ...ERGEBNIS, einschaetzung: 'Zweiter Versuch.' });
      await nach(fixture);

      expect(element.querySelector('[data-testid="einschaetzung"]')?.textContent).toContain('Zweiter Versuch.');
      httpMock.expectNone({ method: 'PUT', url: URL });
    });

    it('shows the server message when saving fails, e.g. an expired preview', async () => {
      const { fixture, element } = erstelle(WARENEINTRAG, 0);
      const httpMock = TestBed.inject(HttpTestingController);
      httpMock.expectOne({ method: 'GET', url: URL }).flush(null);
      button(element, 'analysieren')!.click();
      httpMock.expectOne({ method: 'POST', url: URL }).flush(ERGEBNIS);
      await nach(fixture);

      button(element, 'analyse-speichern')!.click();
      httpMock
        .expectOne({ method: 'PUT', url: URL })
        .flush({ message: 'Keine aktuelle Analyse zum Speichern vorhanden. Bitte erneut analysieren.' }, { status: 400, statusText: 'Bad Request' });
      await nach(fixture);

      expect(element.querySelector('[role="alert"]')?.textContent).toContain('Keine aktuelle Analyse zum Speichern vorhanden.');
    });
  });

  describe('AVV-Prüfung (Issue #95)', () => {
    const URL = '/api/v1/wareneintraege/wareneintrag-1/ki-analyse';

    async function mitPruefung(avvPruefung: object) {
      const { fixture, element } = erstelle(WARENEINTRAG, 0);
      const httpMock = TestBed.inject(HttpTestingController);
      (element.querySelector('[data-testid="analysieren"]') as HTMLButtonElement).click();
      httpMock
        .expectOne({ method: 'POST', url: URL })
        .flush({ fraktionen: [{ name: 'Beton', anteilProzent: 100 }], einschaetzung: 'Beton.', avvPruefung });
      await fixture.whenStable();
      fixture.detectChanges();
      return element.querySelector('[data-testid="avv-pruefung"]') as HTMLElement;
    }

    it('shows verdict with icon and text, reasoning and the suggested code with designation', async () => {
      const pruefung = await mitPruefung({
        urteil: 'passt_eher_nicht',
        begruendung: 'Gemischter Bauschutt statt reinem Beton.',
        vorschlag: { code: '17 01 07', bezeichnung: 'Gemische aus Beton, Ziegeln, Fliesen und Keramik' },
      });

      expect(pruefung.querySelector('.urteil')?.textContent).toContain('AVV-Code passt eher nicht');
      expect(pruefung.querySelector('mat-icon')?.textContent?.trim()).toBe('warning');
      expect(pruefung.textContent).toContain('Gemischter Bauschutt statt reinem Beton.');
      expect(pruefung.querySelector('[data-testid="avv-vorschlag"]')?.textContent).toContain(
        'Vorschlag: 17 01 07 – Gemische aus Beton, Ziegeln, Fliesen und Keramik',
      );
      // Nur Anzeige: kein Button zum Übernehmen.
      expect(pruefung.querySelector('button')).toBeNull();
    });

    it('shows no suggestion when there is none', async () => {
      const pruefung = await mitPruefung({ urteil: 'passt', begruendung: 'Passt.', vorschlag: null });
      expect(pruefung.querySelector('.urteil')?.textContent).toContain('AVV-Code passt');
      expect(pruefung.querySelector('mat-icon')?.textContent?.trim()).toBe('check_circle');
      expect(pruefung.querySelector('[data-testid="avv-vorschlag"]')).toBeNull();
    });
  });
});
