import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Wareneintrag } from '../../../core/wareneintrag-api.js';
import { AppFehlerMelder } from '../../../core/app-fehler-melder.js';
import { WareneintragBearbeitenDialog } from './wareneintrag-bearbeiten-dialog.js';

const WARENEINTRAG: Wareneintrag = {
  id: 'wareneintrag-1',
  fotoFernUrl: '/foto.jpg',
  fotoNahUrl: null,
  fotoDetailUrl: null,
  dokumentUrl: '/lieferschein.pdf',
  freitext: 'alter Text',
  erstelltAm: '2026-09-19T20:08:00',
  avvCode: { id: 'avv-1', code: '17 01 01', bezeichnung: 'Beton' },
  standort: { id: 'standort-1', name: 'Hauptsitz' },
  erfasstVon: { id: 'nutzer-1', vorname: 'Erika', nachname: 'Musterfrau' },
};

interface TestableDialog {
  freitext: string;
  kannSpeichern: boolean;
  fehler: () => string | null;
  fotoErsetzen: (ansicht: 'fotoFern' | 'fotoNah' | 'fotoDetail', event: Event) => Promise<void>;
  dokumentErsetzen: (event: Event) => void;
  dateiLoeschen: (
    datei: 'fotoFern' | 'fotoNah' | 'fotoDetail' | 'dokument',
    label: string,
  ) => Promise<void>;
}

function asTestable(component: WareneintragBearbeitenDialog): TestableDialog {
  return component as unknown as TestableDialog;
}

function fotoAuswahlEvent(datei: File): Event {
  const input = document.createElement('input');
  input.type = 'file';
  const files = Object.assign([datei], { item: (index: number) => [datei][index] ?? null });
  Object.defineProperty(input, 'files', { value: files });
  return { target: input } as unknown as Event;
}

describe('WareneintragBearbeitenDialog', () => {
  let httpMock: HttpTestingController;
  let dialogRef: jasmine.SpyObj<MatDialogRef<WareneintragBearbeitenDialog>>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<WareneintragBearbeitenDialog>>('MatDialogRef', [
      'close',
    ]);
    await TestBed.configureTestingModule({
      imports: [WareneintragBearbeitenDialog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { wareneintrag: WARENEINTRAG } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function createComponent() {
    const fixture = TestBed.createComponent(WareneintragBearbeitenDialog);
    fixture.detectChanges();
    httpMock.expectOne((req) => req.url === '/api/v1/avv-codes').flush([]);
    return fixture;
  }

  it('replaces the PDF: shows the chosen file name and sends it as dokument (Issue #103)', async () => {
    const fixture = createComponent();
    const element = fixture.nativeElement as HTMLElement;
    expect(
      (element.querySelector('[data-testid="bearbeiten-dokument"]') as HTMLInputElement).accept,
    ).toBe('application/pdf');

    asTestable(fixture.componentInstance).dokumentErsetzen(
      fotoAuswahlEvent(
        new File(['%PDF-1.4'], 'neuer-lieferschein.pdf', { type: 'application/pdf' }),
      ),
    );
    fixture.detectChanges();

    expect(element.textContent).toContain('neuer-lieferschein.pdf');
    void fixture.componentInstance.speichern();
    const request = httpMock.expectOne('/api/v1/wareneintraege/wareneintrag-1');
    expect(((request.request.body as FormData).get('dokument') as File).name).toBe(
      'neuer-lieferschein.pdf',
    );
    request.flush({});
  });

  it('rejects a replacement dokument that is not a PDF and does not send it (Issue #103)', async () => {
    const fixture = createComponent();

    asTestable(fixture.componentInstance).dokumentErsetzen(
      fotoAuswahlEvent(new File(['x'], 'foto.jpg', { type: 'image/jpeg' })),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Dokument (PDF): Nur PDF erlaubt.');
    void fixture.componentInstance.speichern();
    const request = httpMock.expectOne('/api/v1/wareneintraege/wareneintrag-1');
    expect((request.request.body as FormData).get('dokument')).toBeNull();
    request.flush({});
  });

  it('rejects an invalid replacement photo with a message and does not save it (Issue #59)', async () => {
    const fixture = createComponent();
    const component = asTestable(fixture.componentInstance);

    await component.fotoErsetzen(
      'fotoNah',
      fotoAuswahlEvent(new File(['gif'], 'neu.gif', { type: 'image/gif' })),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Nahansicht: Nur JPEG, PNG oder WebP erlaubt.',
    );
    void fixture.componentInstance.speichern();
    const request = httpMock.expectOne('/api/v1/wareneintraege/wareneintrag-1');
    expect((request.request.body as FormData).get('fotoNah')).toBeNull();
    request.flush({});
  });

  it('meldet ein abgelehntes Ersatzfoto ans Fehler-Log', async () => {
    const melde = spyOn(TestBed.inject(AppFehlerMelder), 'melde');
    const fixture = createComponent();

    await asTestable(fixture.componentInstance).fotoErsetzen(
      'fotoNah',
      fotoAuswahlEvent(new File(['gif'], 'foto.gif', { type: 'image/gif' })),
    );

    expect(melde).toHaveBeenCalledOnceWith(
      jasmine.stringContaining('Nahansicht: Nur JPEG, PNG oder WebP erlaubt.'),
    );
  });

  it('lässt beim Ersetzen eines Fotos zwischen Kamera und Galerie wählen', async () => {
    const fixture = createComponent();
    const element = fixture.nativeElement as HTMLElement;
    const kamera = element.querySelector(
      '[data-testid="bearbeiten-kamera-fotoNah"]',
    ) as HTMLInputElement;
    const kameraKlick = spyOn(kamera, 'click');
    expect(kamera.getAttribute('capture')).toBe('environment');
    expect(
      element.querySelector('[data-testid="bearbeiten-foto-fotoNah"]')?.hasAttribute('capture'),
    ).toBe(false);

    const ersetzen = Array.from(element.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Nahansicht hinzufügen'),
    )!;
    ersetzen.click();
    fixture.detectChanges();
    await fixture.whenStable();
    (Array.from(document.querySelectorAll('.mat-mdc-menu-item')) as HTMLButtonElement[])
      .find((e) => e.textContent?.includes('Kamera'))!
      .click();

    expect(kameraKlick).toHaveBeenCalled();
  });

  it('prefills the freitext field from the given Wareneintrag', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance.freitext).toBe('alter Text');
  });

  it('prefills the AVV-Code selection from the given Wareneintrag and allows saving without reselecting it', () => {
    const fixture = createComponent();
    const component = asTestable(fixture.componentInstance);

    expect(fixture.nativeElement.querySelector('[data-testid="bearbeiten-avv-suche"]').value).toBe(
      '17 01 01 – Beton',
    );
    expect(component.kannSpeichern).toBe(true);
  });

  it('submits the prefilled avvCodeId when the user saves without changing the AVV-Code', () => {
    const fixture = createComponent();

    void fixture.componentInstance.speichern();

    const request = httpMock.expectOne('/api/v1/wareneintraege/wareneintrag-1');
    expect(request.request.body.get('avvCodeId')).toBe('avv-1');
    request.flush({});
  });

  it('closes without a request when cancelled', () => {
    const fixture = createComponent();
    fixture.componentInstance.abbrechen();
    expect(dialogRef.close).toHaveBeenCalledWith();
    httpMock.expectNone('/api/v1/wareneintraege/wareneintrag-1');
  });

  it('debounces the AVV search and can save once an AVV-Code is selected', fakeAsync(() => {
    const fixture = createComponent();
    const component = asTestable(fixture.componentInstance);

    fixture.componentInstance.onAvvSucheEingabe('20 03');
    tick(300);
    fixture.detectChanges();
    httpMock
      .expectOne((req) => req.url === '/api/v1/avv-codes' && req.params.get('suche') === '20 03')
      .flush([
        { id: 'avv-2', code: '20 03 01', bezeichnung: 'Siedlungsabfälle', gefaehrlich: false },
      ]);
    tick();
    fixture.detectChanges();

    fixture.componentInstance.onAvvCodeAusgewaehlt({ option: { value: 'avv-2' } } as never);

    expect(component.kannSpeichern).toBe(true);
  }));

  it('cannot be saved with a freitext longer than the backend limit of 2000 characters', () => {
    const fixture = createComponent();
    const component = asTestable(fixture.componentInstance);

    const daten = (
      fixture.componentInstance as unknown as {
        bearbeitungDaten: {
          update: (fn: (d: { freitext: string }) => { freitext: string }) => void;
        };
      }
    ).bearbeitungDaten;
    daten.update((d) => ({ ...d, freitext: 'a'.repeat(2001) }));

    expect(component.kannSpeichern).toBe(false);
  });

  it('submits avvCodeId, freitext and only the replaced fotos as FormData and closes with true on success', fakeAsync(() => {
    const fixture = createComponent();
    const component = asTestable(fixture.componentInstance);
    fixture.componentInstance.onAvvSucheEingabe('20 03');
    tick(300);
    fixture.detectChanges();
    httpMock
      .expectOne((req) => req.url === '/api/v1/avv-codes' && req.params.get('suche') === '20 03')
      .flush([
        { id: 'avv-2', code: '20 03 01', bezeichnung: 'Siedlungsabfälle', gefaehrlich: false },
      ]);
    tick();
    fixture.componentInstance.onAvvCodeAusgewaehlt({ option: { value: 'avv-2' } } as never);
    const neuesFoto = new File(['foto'], 'neu.jpg', { type: 'image/jpeg' });
    // Natives Einlesen läuft außerhalb von fakeAsync, daher über die Zone-Promise.
    spyOn(neuesFoto, 'arrayBuffer').and.returnValue(Promise.resolve(new ArrayBuffer(4)));
    spyOn(window, 'createImageBitmap').and.returnValue(
      Promise.reject(new DOMException('kein Bild', 'InvalidStateError')),
    );
    void component.fotoErsetzen('fotoDetail', fotoAuswahlEvent(neuesFoto));
    tick();

    void fixture.componentInstance.speichern();
    httpMock.expectOne('/api/v1/wareneintraege/wareneintrag-1/ki-analyse').flush(null);
    tick();

    const request = httpMock.expectOne('/api/v1/wareneintraege/wareneintrag-1');
    expect(request.request.method).toBe('PATCH');
    const body = request.request.body as FormData;
    expect(body.get('avvCodeId')).toBe('avv-2');
    expect(body.get('freitext')).toBe('alter Text');
    expect(body.get('fotoFern')).toBeNull();
    expect(body.get('fotoNah')).toBeNull();
    expect((body.get('fotoDetail') as File).name).toBe('neu.jpg');
    // Keine gespeicherte Analyse: keine Rückfrage, nichts zu löschen.
    expect(body.get('analyseLoeschen')).toBeNull();
    request.flush({});
    tick();

    expect(dialogRef.close).toHaveBeenCalledWith(true);
  }));

  it('shows an error and does not close the dialog when saving fails', fakeAsync(() => {
    const fixture = createComponent();
    const component = asTestable(fixture.componentInstance);
    fixture.componentInstance.onAvvSucheEingabe('20 03');
    tick(300);
    fixture.detectChanges();
    httpMock
      .expectOne((req) => req.url === '/api/v1/avv-codes' && req.params.get('suche') === '20 03')
      .flush([
        { id: 'avv-2', code: '20 03 01', bezeichnung: 'Siedlungsabfälle', gefaehrlich: false },
      ]);
    tick();
    fixture.componentInstance.onAvvCodeAusgewaehlt({ option: { value: 'avv-2' } } as never);

    void fixture.componentInstance.speichern();
    httpMock
      .expectOne('/api/v1/wareneintraege/wareneintrag-1')
      .flush('error', { status: 500, statusText: 'Server Error' });
    tick();

    expect(component.fehler()).toBe('Wareneintrag konnte nicht gespeichert werden.');
    expect(dialogRef.close).not.toHaveBeenCalled();
  }));

  describe('Fotos und PDF löschen (Issue #104)', () => {
    const GESPEICHERTE_ANALYSE = {
      ergebnis: {},
      analysiertVon: { vorname: 'Erika', nachname: 'Musterfrau' },
      analysiertAm: '2026-09-20T10:00:00',
    };

    // Beantwortet die geöffneten Rückfragen der Reihe nach.
    function antworte(...antworten: (boolean | undefined)[]) {
      return spyOn(MatDialog.prototype, 'open').and.callFake(
        () => ({ afterClosed: () => of(antworten.shift()) }) as never,
      );
    }

    function knopf(element: HTMLElement, testId: string) {
      return element.querySelector(`[data-testid="${testId}"]`) as HTMLButtonElement | null;
    }

    it('offers a delete button only for files the Wareneintrag has', () => {
      const element = createComponent().nativeElement as HTMLElement;

      expect(knopf(element, 'bearbeiten-loeschen-fotoFern')).not.toBeNull();
      expect(knopf(element, 'bearbeiten-loeschen-dokument')).not.toBeNull();
      expect(knopf(element, 'bearbeiten-loeschen-fotoNah')).toBeNull();
      expect(knopf(element, 'bearbeiten-loeschen-fotoDetail')).toBeNull();
    });

    it('deletes a photo right after confirmation and shows it as gone, without a KI-Analyse question when there is none', fakeAsync(() => {
      const fixture = createComponent();
      const open = antworte(true);
      knopf(fixture.nativeElement, 'bearbeiten-loeschen-fotoFern')!.click();
      tick();

      expect(open.calls.first().args[1]?.data).toEqual(
        jasmine.objectContaining({ titel: 'Fernansicht löschen?' }),
      );
      httpMock.expectOne('/api/v1/wareneintraege/wareneintrag-1/ki-analyse').flush(null);
      tick();
      const request = httpMock.expectOne(
        (req) => req.url === '/api/v1/wareneintraege/wareneintrag-1/dateien/fotoFern',
      );
      expect(request.request.method).toBe('DELETE');
      expect(request.request.params.has('analyseLoeschen')).toBeFalse();
      request.flush({});
      tick();
      fixture.detectChanges();

      expect(open).toHaveBeenCalledTimes(1);
      const element = fixture.nativeElement as HTMLElement;
      expect(knopf(element, 'bearbeiten-loeschen-fotoFern')).toBeNull();
      expect(element.textContent).toContain('Fernansicht hinzufügen');
      expect(knopf(element, 'bearbeiten-status')!.textContent).toContain('Fernansicht gelöscht.');
    }));

    it('deletes nothing when the confirmation is cancelled', fakeAsync(() => {
      const fixture = createComponent();
      antworte(undefined);

      void asTestable(fixture.componentInstance).dateiLoeschen('fotoFern', 'Fernansicht');
      tick();

      httpMock.expectNone((req) => req.url.includes('/dateien/'));
    }));

    for (const [antwort, analyseLoeschen] of [
      [true, 'true'],
      [undefined, null],
    ] as const) {
      it(`asks whether to delete the saved KI-Analyse too, answer ${antwort ? 'Ja' : 'Nein'}`, fakeAsync(() => {
        const fixture = createComponent();
        const open = antworte(true, antwort);

        void asTestable(fixture.componentInstance).dateiLoeschen('fotoFern', 'Fernansicht');
        tick();
        httpMock
          .expectOne('/api/v1/wareneintraege/wareneintrag-1/ki-analyse')
          .flush(GESPEICHERTE_ANALYSE);
        tick();

        expect(open.calls.mostRecent().args[1]?.data).toEqual(
          jasmine.objectContaining({ titel: 'KI-Analyse ebenfalls löschen?' }),
        );
        const request = httpMock.expectOne((req) => req.url.endsWith('/dateien/fotoFern'));
        expect(request.request.params.get('analyseLoeschen')).toBe(analyseLoeschen);
        request.flush({});
      }));
    }

    it('deletes the PDF without asking about the KI-Analyse', fakeAsync(() => {
      const fixture = createComponent();
      const open = antworte(true);

      void asTestable(fixture.componentInstance).dateiLoeschen('dokument', 'Dokument (PDF)');
      tick();

      httpMock.expectOne((req) => req.url.endsWith('/dateien/dokument')).flush({});
      expect(open).toHaveBeenCalledTimes(1);
    }));

    it('shows an error and keeps the file when deleting fails', fakeAsync(() => {
      const fixture = createComponent();
      antworte(true);

      void asTestable(fixture.componentInstance).dateiLoeschen('dokument', 'Dokument (PDF)');
      tick();
      httpMock
        .expectOne((req) => req.url.endsWith('/dateien/dokument'))
        .flush('error', { status: 500, statusText: 'Server Error' });
      tick();
      fixture.detectChanges();

      expect(asTestable(fixture.componentInstance).fehler()).toBe(
        'Dokument (PDF) konnte nicht gelöscht werden.',
      );
      expect(knopf(fixture.nativeElement, 'bearbeiten-loeschen-dokument')).not.toBeNull();
    }));

    it('asks about the KI-Analyse on save when a new photo was chosen', fakeAsync(() => {
      const fixture = createComponent();
      antworte(true);
      const neuesFoto = new File(['foto'], 'neu.jpg', { type: 'image/jpeg' });
      spyOn(neuesFoto, 'arrayBuffer').and.returnValue(Promise.resolve(new ArrayBuffer(4)));
      spyOn(window, 'createImageBitmap').and.returnValue(
        Promise.reject(new DOMException('kein Bild', 'InvalidStateError')),
      );
      void asTestable(fixture.componentInstance).fotoErsetzen(
        'fotoFern',
        fotoAuswahlEvent(neuesFoto),
      );
      tick();

      void fixture.componentInstance.speichern();
      httpMock
        .expectOne('/api/v1/wareneintraege/wareneintrag-1/ki-analyse')
        .flush(GESPEICHERTE_ANALYSE);
      tick();

      const body = httpMock.expectOne('/api/v1/wareneintraege/wareneintrag-1').request
        .body as FormData;
      expect(body.get('analyseLoeschen')).toBe('true');
    }));
  });
});
