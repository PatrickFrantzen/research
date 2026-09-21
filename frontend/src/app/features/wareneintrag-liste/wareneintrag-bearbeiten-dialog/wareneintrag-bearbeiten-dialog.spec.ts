import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { Wareneintrag } from '../../../core/wareneintrag-api.js';
import { WareneintragBearbeitenDialog } from './wareneintrag-bearbeiten-dialog.js';

const WARENEINTRAG: Wareneintrag = {
  id: 'wareneintrag-1',
  fotoUrl: '/foto.jpg',
  freitext: 'alter Text',
  erstelltAm: '2026-09-19T20:08:00',
  avvCode: { code: '17 01 01' },
};

interface TestableDialog {
  freitext: string;
  kannSpeichern: boolean;
  fehler: () => string | null;
}

function asTestable(component: WareneintragBearbeitenDialog): TestableDialog {
  return component as unknown as TestableDialog;
}

describe('WareneintragBearbeitenDialog', () => {
  let httpMock: HttpTestingController;
  let dialogRef: jasmine.SpyObj<MatDialogRef<WareneintragBearbeitenDialog>>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<WareneintragBearbeitenDialog>>('MatDialogRef', ['close']);
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

  it('prefills the freitext field from the given Wareneintrag', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance.freitext).toBe('alter Text');
  });

  it('cannot be saved before an AVV-Code has been selected', () => {
    const fixture = createComponent();
    const component = asTestable(fixture.componentInstance);
    expect(component.kannSpeichern).toBe(false);
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
      .flush([{ id: 'avv-2', code: '20 03 01', bezeichnung: 'Siedlungsabfälle', gefaehrlich: false }]);
    tick();
    fixture.detectChanges();

    fixture.componentInstance.onAvvCodeAusgewaehlt({ option: { value: 'avv-2' } } as never);

    expect(component.kannSpeichern).toBe(true);
  }));

  it('submits avvCodeId, freitext and an optional foto as FormData and closes with true on success', fakeAsync(() => {
    const fixture = createComponent();
    fixture.componentInstance.onAvvSucheEingabe('20 03');
    tick(300);
    fixture.detectChanges();
    httpMock
      .expectOne((req) => req.url === '/api/v1/avv-codes' && req.params.get('suche') === '20 03')
      .flush([{ id: 'avv-2', code: '20 03 01', bezeichnung: 'Siedlungsabfälle', gefaehrlich: false }]);
    tick();
    fixture.componentInstance.onAvvCodeAusgewaehlt({ option: { value: 'avv-2' } } as never);
    fixture.componentInstance.foto = new File(['foto'], 'neu.jpg', { type: 'image/jpeg' });

    void fixture.componentInstance.speichern();

    const request = httpMock.expectOne('/api/v1/wareneintraege/wareneintrag-1');
    expect(request.request.method).toBe('PATCH');
    const body = request.request.body as FormData;
    expect(body.get('avvCodeId')).toBe('avv-2');
    expect(body.get('freitext')).toBe('alter Text');
    expect((body.get('foto') as File).name).toBe('neu.jpg');
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
      .flush([{ id: 'avv-2', code: '20 03 01', bezeichnung: 'Siedlungsabfälle', gefaehrlich: false }]);
    tick();
    fixture.componentInstance.onAvvCodeAusgewaehlt({ option: { value: 'avv-2' } } as never);

    void fixture.componentInstance.speichern();
    httpMock.expectOne('/api/v1/wareneintraege/wareneintrag-1').flush('error', { status: 500, statusText: 'Server Error' });
    tick();

    expect(component.fehler()).toBe('Wareneintrag konnte nicht gespeichert werden.');
    expect(dialogRef.close).not.toHaveBeenCalled();
  }));
});
