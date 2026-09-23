import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth.service.js';
import { StandortApi } from '../../core/standort-api.js';
import { WareneintragListe } from './wareneintrag-liste.js';

describe('WareneintragListe', () => {
  let httpMock: HttpTestingController;
  let dialog: MatDialog;
  let authService: { nutzerId: () => string | null };

  beforeEach(async () => {
    authService = { nutzerId: () => 'nutzer-1' };
    await TestBed.configureTestingModule({
      imports: [WareneintragListe],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        // Stammdaten-Adapter an der Systemgrenze fest belegt – die Liste
        // selbst wird weiter über echte HTTP-Requests geprüft.
        {
          provide: StandortApi,
          useValue: {
            liste: () =>
              of([
                { id: 'standort-1', name: 'Hauptsitz' },
                { id: 'standort-2', name: 'Lager Nord' },
              ]),
          },
        },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    dialog = TestBed.inject(MatDialog);
  });

  // Öffnet keinen echten Dialog-Overlay im Test-DOM (das würde ein
  // Material-Dialog-Testmodul o.ä. erfordern), sondern spyt die
  // Dialog-Öffnung selbst – die Liste muss nur auf das Ergebnis reagieren,
  // nicht der Dialoginhalt selbst (der ist in ConfirmDialog bzw.
  // WareneintragBearbeitenDialog eigenständig getestet).
  function dialogSchliesstMit<T>(ergebnis: T | undefined) {
    spyOn(dialog, 'open').and.returnValue({ afterClosed: () => of(ergebnis) } as MatDialogRef<unknown, T>);
  }

  afterEach(() => httpMock.verify());

  describe('Ladezustände (Issue #53)', () => {
    function erstelleListe() {
      const fixture = TestBed.createComponent(WareneintragListe);
      fixture.detectChanges();
      httpMock.expectOne((req) => req.url === '/api/v1/avv-codes').flush([]);
      return { fixture, element: fixture.nativeElement as HTMLElement };
    }

    it('shows a progress bar while loading and no "keine Einträge" message', () => {
      const { element } = erstelleListe();

      expect(element.querySelector('mat-progress-bar')).not.toBeNull();
      expect(element.querySelector('[data-testid="keine-eintraege"]')).toBeNull();
      httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege').flush({ daten: [], gesamt: 0 });
    });

    it('shows a request error as error with retry, never as an empty list', fakeAsync(() => {
      const { fixture, element } = erstelleListe();
      httpMock
        .expectOne((req) => req.url === '/api/v1/wareneintraege')
        .flush('Fehler', { status: 500, statusText: 'Server Error' });
      tick();
      fixture.detectChanges();

      expect(element.querySelector('[role="alert"]')?.textContent).toContain('Wareneinträge konnten nicht geladen werden.');
      expect(element.querySelector('[data-testid="keine-eintraege"]')).toBeNull();
      expect(element.querySelector('mat-paginator')).toBeNull();

      (element.querySelector('[data-testid="erneut-laden"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege').flush({ daten: [], gesamt: 0 });
      tick();
      fixture.detectChanges();

      expect(element.querySelector('[role="alert"]')).toBeNull();
      expect(element.querySelector('[data-testid="keine-eintraege"]')).not.toBeNull();
      expect(element.querySelector('mat-paginator')).not.toBeNull();
    }));

    it('keeps the last total in the paginator while the next page loads', fakeAsync(() => {
      const { fixture } = erstelleListe();
      httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege').flush({ daten: [], gesamt: 45 });
      tick();
      fixture.detectChanges();

      fixture.componentInstance.onSeitenwechsel({ pageIndex: 1, pageSize: 20, length: 45 });
      fixture.detectChanges();

      expect((fixture.componentInstance as unknown as { gesamt: () => number }).gesamt()).toBe(45);
      httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege').flush({ daten: [], gesamt: 45 });
      tick();
    }));
  });

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

  describe('Trefferanzahl (Issue #61)', () => {
    function ladeListe(gesamt: number) {
      const fixture = TestBed.createComponent(WareneintragListe);
      fixture.detectChanges();
      httpMock.expectOne((req) => req.url === '/api/v1/avv-codes').flush([]);
      const element = fixture.nativeElement as HTMLElement;
      const anzahlVorher = element.querySelector('[data-testid="trefferanzahl"]');
      httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege').flush({ daten: [], gesamt });
      tick();
      fixture.detectChanges();
      return { anzahlVorher, anzahl: element.querySelector('[data-testid="trefferanzahl"]') };
    }

    it('shows the total number of hits once loaded, not while loading', fakeAsync(() => {
      const { anzahlVorher, anzahl } = ladeListe(45);

      expect(anzahlVorher).toBeNull();
      expect(anzahl?.textContent?.trim()).toBe('45 Wareneinträge');
    }));

    it('uses the singular for exactly one hit', fakeAsync(() => {
      expect(ladeListe(1).anzahl?.textContent?.trim()).toBe('1 Wareneintrag');
    }));
  });

  it('describes each photo by its view, AVV-Code and date instead of a generic alt text (Issue #61)', fakeAsync(() => {
    const fixture = TestBed.createComponent(WareneintragListe);
    fixture.detectChanges();
    httpMock.expectOne((req) => req.url === '/api/v1/avv-codes').flush([]);
    httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege').flush({
      daten: [
        {
          id: 'wareneintrag-1',
          fotoFernUrl: '/fern.jpg',
          fotoNahUrl: null,
          fotoDetailUrl: '/detail.jpg',
          freitext: 'test',
          erstelltAm: '2026-09-19T20:08:00',
          avvCode: { code: '17 01 01' },
          standort: { id: 'standort-1', name: 'Hauptsitz' },
          erfasstVon: { id: 'nutzer-2', vorname: 'Max', nachname: 'Mustermann' },
        },
      ],
      gesamt: 1,
    });
    tick();
    fixture.detectChanges();

    const alts = Array.from(fixture.nativeElement.querySelectorAll('.fotos img') as NodeListOf<HTMLImageElement>).map(
      (img) => img.alt,
    );
    expect(alts).toEqual(['Fernansicht – AVV 17 01 01, 19.09.2026', 'Detailansicht – AVV 17 01 01, 19.09.2026']);
  }));

  describe('sichtbare Filter (Issue #61)', () => {
    function waehleAvvCode(fixture: ReturnType<typeof TestBed.createComponent<WareneintragListe>>, id: string) {
      fixture.componentInstance.onAvvCodeAusgewaehlt({ option: { value: id } } as never);
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
    }

    it('shows the chosen AVV-Code as a removable chip and frees the search field for another choice', fakeAsync(() => {
      const fixture = TestBed.createComponent(WareneintragListe);
      fixture.detectChanges();
      httpMock.expectOne((req) => req.url === '/api/v1/avv-codes').flush([
        { id: 'avv-1', code: '17 01 01', bezeichnung: 'Beton', gefaehrlich: false },
      ]);
      httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege').flush({ daten: [], gesamt: 0 });
      tick();
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;

      waehleAvvCode(fixture, 'avv-1');
      httpMock
        .expectOne((req) => req.url === '/api/v1/wareneintraege' && req.params.get('avvCodeId') === 'avv-1')
        .flush({ daten: [], gesamt: 0 });

      expect(element.querySelector('[data-testid="filter-avv"]')?.textContent).toContain('17 01 01 – Beton');
      expect((element.querySelector('[data-testid="avv-suche"]') as HTMLInputElement).value).toBe('');

      (element.querySelector('[data-testid="filter-avv"] [matChipRemove]') as HTMLButtonElement).click();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      httpMock
        .expectOne((req) => req.url === '/api/v1/wareneintraege' && !req.params.has('avvCodeId'))
        .flush({ daten: [], gesamt: 0 });
      expect(element.querySelector('[data-testid="filter-avv"]')).toBeNull();
    }));

    it('leaves the search field empty after picking a suggestion from the autocomplete', fakeAsync(() => {
      const fixture = TestBed.createComponent(WareneintragListe);
      fixture.detectChanges();
      httpMock.expectOne((req) => req.url === '/api/v1/avv-codes').flush([
        { id: 'avv-1', code: '17 01 01', bezeichnung: 'Beton', gefaehrlich: false },
      ]);
      httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege').flush({ daten: [], gesamt: 0 });
      tick();
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('[data-testid="avv-suche"]') as HTMLInputElement;

      input.dispatchEvent(new Event('focusin'));
      fixture.detectChanges();
      tick();
      (document.querySelector('mat-option') as HTMLElement).click();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      httpMock.expectOne((req) => req.params.get('avvCodeId') === 'avv-1').flush({ daten: [], gesamt: 0 });
      expect(input.value).toBe('');
      expect(fixture.nativeElement.querySelector('[data-testid="filter-avv"]')).not.toBeNull();
    }));

    it('filters by the chosen Standort and shows it as a removable chip', fakeAsync(() => {
      const fixture = TestBed.createComponent(WareneintragListe);
      fixture.detectChanges();
      httpMock.expectOne((req) => req.url === '/api/v1/avv-codes').flush([]);
      httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege').flush({ daten: [], gesamt: 0 });
      tick();
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;

      (element.querySelector('[data-testid="standort-filter"] .mat-mdc-select-trigger') as HTMLElement).click();
      fixture.detectChanges();
      tick();
      const option = Array.from(document.querySelectorAll('mat-option')).find((o) => o.textContent?.includes('Lager Nord'));
      (option as HTMLElement).click();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      const request = httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege');
      expect(request.request.params.get('standortId')).toBe('standort-2');
      expect(request.request.params.get('seite')).toBe('0');
      request.flush({ daten: [], gesamt: 0 });
      tick();
      fixture.detectChanges();
      expect(element.querySelector('[data-testid="filter-standort"]')?.textContent).toContain('Lager Nord');

      (element.querySelector('[data-testid="filter-standort"] [matChipRemove]') as HTMLButtonElement).click();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
      httpMock
        .expectOne((req) => req.url === '/api/v1/wareneintraege' && !req.params.has('standortId'))
        .flush({ daten: [], gesamt: 0 });
      expect(element.querySelector('[data-testid="filter-standort"]')).toBeNull();
    }));

    function listeMitFiltern() {
      const fixture = TestBed.createComponent(WareneintragListe);
      fixture.detectChanges();
      httpMock.expectOne((req) => req.url === '/api/v1/avv-codes').flush([
        { id: 'avv-1', code: '17 01 01', bezeichnung: 'Beton', gefaehrlich: false },
      ]);
      httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege').flush({ daten: [], gesamt: 0 });
      tick();
      fixture.detectChanges();
      waehleAvvCode(fixture, 'avv-1');
      httpMock.expectOne((req) => req.params.get('avvCodeId') === 'avv-1').flush({ daten: [], gesamt: 0 });
      fixture.componentInstance.onStandortGewaehlt('standort-2');
      fixture.detectChanges();
      tick();
      httpMock.expectOne((req) => req.params.get('standortId') === 'standort-2').flush({ daten: [], gesamt: 0 });
      fixture.componentInstance.onSucheEingabe('Bauschutt');
      tick(300);
      fixture.detectChanges();
      httpMock.expectOne((req) => req.params.get('suche') === 'Bauschutt').flush({ daten: [], gesamt: 0 });
      tick();
      fixture.detectChanges();
      return { fixture, element: fixture.nativeElement as HTMLElement };
    }

    it('shows the free-text search as a removable chip as well', fakeAsync(() => {
      const { fixture, element } = listeMitFiltern();

      expect(element.querySelector('[data-testid="filter-suche"]')?.textContent).toContain('Bauschutt');
      (element.querySelector('[data-testid="filter-suche"] [matChipRemove]') as HTMLButtonElement).click();
      fixture.detectChanges();
      tick(300);
      fixture.detectChanges();

      const request = httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege');
      expect(request.request.params.has('suche')).toBeFalse();
      expect(request.request.params.get('avvCodeId')).toBe('avv-1');
      request.flush({ daten: [], gesamt: 0 });
      expect(element.querySelector('[data-testid="filter-suche"]')).toBeNull();
    }));

    it('resets all filters at once and starts again on the first page', fakeAsync(() => {
      const { fixture, element } = listeMitFiltern();

      (element.querySelector('[data-testid="filter-zuruecksetzen"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      tick(300);
      fixture.detectChanges();

      const request = httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege');
      expect(request.request.params.has('avvCodeId')).toBeFalse();
      expect(request.request.params.has('standortId')).toBeFalse();
      expect(request.request.params.has('suche')).toBeFalse();
      expect(request.request.params.get('seite')).toBe('0');
      request.flush({ daten: [], gesamt: 0 });
      tick();
      fixture.detectChanges();
      expect(element.querySelector('.aktive-filter')).toBeNull();
      expect((element.querySelector('[data-testid="freitext-suche"]') as HTMLInputElement).value).toBe('');
    }));
  });

  it('shows the assigned AVV-Code on each Wareneintrag', fakeAsync(() => {
    const fixture = TestBed.createComponent(WareneintragListe);
    fixture.detectChanges();
    httpMock.expectOne((req) => req.url === '/api/v1/avv-codes').flush([]);
    httpMock
      .expectOne((req) => req.url === '/api/v1/wareneintraege')
      .flush({ daten: [
        {
          id: 'wareneintrag-1',
          fotoFernUrl: '/foto.jpg',
          fotoNahUrl: null,
          fotoDetailUrl: null,
          freitext: 'test',
          erstelltAm: '2026-09-19T18:08:00.000Z',
          avvCode: { code: '17 01 01' },
          standort: { id: 'standort-1', name: 'Hauptsitz' },
          erfasstVon: { id: 'nutzer-1', vorname: 'Erika', nachname: 'Musterfrau' },
        },
      ], gesamt: 1 });
    tick();
    fixture.detectChanges();

    const karte = fixture.nativeElement.querySelector('.karte') as HTMLElement;
    expect(karte.textContent).toContain('AVV-Code: 17 01 01');
    expect(karte.textContent).toContain('Standort: Hauptsitz');
    expect(karte.textContent).toContain('Erfasst von: Erika Musterfrau');
  }));

  it('shows Bearbeiten/Löschen only for Wareneintraege the current Nutzer created themselves', fakeAsync(() => {
    const fixture = TestBed.createComponent(WareneintragListe);
    fixture.detectChanges();
    httpMock.expectOne((req) => req.url === '/api/v1/avv-codes').flush([]);
    httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege').flush({
      daten: [
        {
          id: 'eigener-wareneintrag',
          fotoFernUrl: null,
          fotoNahUrl: null,
          fotoDetailUrl: null,
          freitext: 'eigener',
          erstelltAm: '2026-09-19T18:08:00.000Z',
          avvCode: { code: '17 01 01' },
          standort: { id: 'standort-1', name: 'Hauptsitz' },
          erfasstVon: { id: 'nutzer-1', vorname: 'Erika', nachname: 'Musterfrau' },
        },
        {
          id: 'fremder-wareneintrag',
          fotoFernUrl: null,
          fotoNahUrl: null,
          fotoDetailUrl: null,
          freitext: 'fremder',
          erstelltAm: '2026-09-19T18:08:00.000Z',
          avvCode: { code: '17 01 01' },
          standort: { id: 'standort-1', name: 'Hauptsitz' },
          erfasstVon: { id: 'nutzer-2', vorname: 'Max', nachname: 'Mustermann' },
        },
      ],
      gesamt: 2,
    });
    tick();
    fixture.detectChanges();

    const karten = fixture.nativeElement.querySelectorAll('.karte') as NodeListOf<HTMLElement>;
    expect(karten[0].querySelector('[data-testid="wareneintrag-bearbeiten"]')).not.toBeNull();
    expect(karten[0].querySelector('[data-testid="wareneintrag-loeschen"]')).not.toBeNull();
    expect(karten[1].querySelector('[data-testid="wareneintrag-bearbeiten"]')).toBeNull();
    expect(karten[1].querySelector('[data-testid="wareneintrag-loeschen"]')).toBeNull();
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
          fotoFernUrl: '/foto.jpg',
          fotoNahUrl: null,
          fotoDetailUrl: null,
          freitext: 'test',
          erstelltAm: '2026-09-19T20:08:00',
          avvCode: { code: '17 01 01' },
          standort: { id: 'standort-1', name: 'Hauptsitz' },
          erfasstVon: { id: 'nutzer-1', vorname: 'Erika', nachname: 'Musterfrau' },
        },
      ], gesamt: 1 });
    tick();
    fixture.detectChanges();

    const datum = fixture.nativeElement.querySelector('.datum') as HTMLElement;
    expect(datum.textContent?.trim()).toBe('19.09.2026, 20:08');
  }));

  it('opens the edit dialog with the selected Wareneintrag and reloads the list once it closes successfully', fakeAsync(() => {
    dialogSchliesstMit(true);
    const fixture = TestBed.createComponent(WareneintragListe);
    fixture.detectChanges();
    httpMock.expectOne((req) => req.url === '/api/v1/avv-codes').flush([]);
    const wareneintrag = {
      id: 'wareneintrag-1',
      fotoFernUrl: '/foto.jpg',
      fotoNahUrl: null,
      fotoDetailUrl: null,
      freitext: 'alter Text',
      erstelltAm: '2026-09-19T20:08:00',
      avvCode: { code: '17 01 01' },
      standort: { id: 'standort-1', name: 'Hauptsitz' },
      erfasstVon: { id: 'nutzer-1', vorname: 'Erika', nachname: 'Musterfrau' },
    };
    httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege').flush({ daten: [wareneintrag], gesamt: 1 });
    tick();
    fixture.detectChanges();

    fixture.componentInstance.bearbeitungOeffnen(wareneintrag as never);

    expect(dialog.open).toHaveBeenCalled();
    const data = (dialog.open as jasmine.Spy).calls.mostRecent().args[1].data;
    expect(data.wareneintrag).toEqual(wareneintrag);
    tick();
    fixture.detectChanges();
    httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege').flush({ daten: [], gesamt: 0 });
  }));

  it('does not reload the list when the edit dialog is cancelled', fakeAsync(() => {
    dialogSchliesstMit(undefined);
    const fixture = TestBed.createComponent(WareneintragListe);
    fixture.detectChanges();
    httpMock.expectOne((req) => req.url === '/api/v1/avv-codes').flush([]);
    httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege').flush({ daten: [], gesamt: 0 });
    tick();
    fixture.detectChanges();

    fixture.componentInstance.bearbeitungOeffnen({
      id: 'wareneintrag-1',
      fotoFernUrl: '/foto.jpg',
      fotoNahUrl: null,
      fotoDetailUrl: null,
      freitext: 'test',
      erstelltAm: '2026-09-19T20:08:00',
      avvCode: { code: '17 01 01' },
      standort: { id: 'standort-1', name: 'Hauptsitz' },
      erfasstVon: { id: 'nutzer-1', vorname: 'Erika', nachname: 'Musterfrau' },
    } as never);
    tick();
    fixture.detectChanges();

    httpMock.expectNone((req) => req.url === '/api/v1/wareneintraege');
    expect().nothing();
  }));

  it('deletes a Wareneintrag after confirmation and reloads the list', fakeAsync(() => {
    dialogSchliesstMit(true);
    const fixture = TestBed.createComponent(WareneintragListe);
    fixture.detectChanges();
    httpMock.expectOne((req) => req.url === '/api/v1/avv-codes').flush([]);
    const wareneintrag = {
      id: 'wareneintrag-1',
      fotoFernUrl: '/foto.jpg',
      fotoNahUrl: null,
      fotoDetailUrl: null,
      freitext: 'test',
      erstelltAm: '2026-09-19T20:08:00',
      avvCode: { code: '17 01 01' },
      standort: { id: 'standort-1', name: 'Hauptsitz' },
      erfasstVon: { id: 'nutzer-1', vorname: 'Erika', nachname: 'Musterfrau' },
    };
    httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege').flush({ daten: [wareneintrag], gesamt: 1 });
    tick();
    fixture.detectChanges();

    void fixture.componentInstance.loeschen(wareneintrag as never);
    tick();

    expect(dialog.open).toHaveBeenCalled();
    const request = httpMock.expectOne('/api/v1/wareneintraege/wareneintrag-1');
    expect(request.request.method).toBe('DELETE');
    request.flush({});
    tick();
    fixture.detectChanges();
    httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege').flush({ daten: [], gesamt: 0 });
  }));

  it('does not delete a Wareneintrag when the confirmation dialog is cancelled', fakeAsync(() => {
    dialogSchliesstMit(undefined);
    const fixture = TestBed.createComponent(WareneintragListe);
    fixture.detectChanges();
    httpMock.expectOne((req) => req.url === '/api/v1/avv-codes').flush([]);
    httpMock.expectOne((req) => req.url === '/api/v1/wareneintraege').flush({ daten: [], gesamt: 0 });
    tick();
    fixture.detectChanges();

    void fixture.componentInstance.loeschen({
      id: 'wareneintrag-1',
      fotoFernUrl: '/foto.jpg',
      fotoNahUrl: null,
      fotoDetailUrl: null,
      freitext: 'test',
      erstelltAm: '2026-09-19T20:08:00',
      avvCode: { code: '17 01 01' },
      standort: { id: 'standort-1', name: 'Hauptsitz' },
      erfasstVon: { id: 'nutzer-1', vorname: 'Erika', nachname: 'Musterfrau' },
    } as never);
    tick();

    httpMock.expectNone('/api/v1/wareneintraege/wareneintrag-1');
    expect().nothing();
  }));
});
