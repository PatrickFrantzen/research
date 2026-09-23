import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WareneintragErfassen } from './wareneintrag-erfassen.js';

interface TestableWareneintragErfassen {
  ausgewaehlterAvvCode: { id: string; code: string; bezeichnung: string; gefaehrlich?: boolean } | null;
  kannAbsenden: boolean;
  angelegt: () => { id: string } | null;
  fehler: () => string | null;
  onFotoAusgewaehlt: (ansicht: 'fotoFern' | 'fotoNah' | 'fotoDetail', event: Event) => void;
  fotoVorschau: (ansicht: 'fotoFern' | 'fotoNah' | 'fotoDetail') => string | null;
}

function asTestable(component: WareneintragErfassen): TestableWareneintragErfassen {
  return component as unknown as TestableWareneintragErfassen;
}

function fotoAuswahlEvent(datei: File): Event {
  const input = document.createElement('input');
  input.type = 'file';
  Object.defineProperty(input, 'files', { value: [datei] });
  return { target: input } as unknown as Event;
}

describe('WareneintragErfassen', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WareneintragErfassen],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function createComponent() {
    const fixture = TestBed.createComponent(WareneintragErfassen);
    fixture.detectChanges();
    httpMock.expectOne((req) => req.url === '/api/v1/avv-codes').flush([]);
    return fixture;
  }

  it('cannot be submitted until AVV-Code and freitext are both set, no foto required', () => {
    const fixture = createComponent();
    const component = asTestable(fixture.componentInstance);

    expect(component.kannAbsenden).toBe(false);

    component.ausgewaehlterAvvCode = { id: 'avv-1', code: '17 01 01', bezeichnung: 'Beton' };
    fixture.componentInstance.freitext = 'Bauschutt am Eingang';

    expect(component.kannAbsenden).toBe(true);
  });

  it('does not send a request when submitted without an AVV-Code', async () => {
    const fixture = createComponent();

    await fixture.componentInstance.submit();

    httpMock.expectNone('/api/v1/wareneintraege');
    expect().nothing();
  });

  it('submits without any foto, since photos are optional', async () => {
    const fixture = createComponent();
    const component = asTestable(fixture.componentInstance);
    component.ausgewaehlterAvvCode = { id: 'avv-1', code: '17 01 01', bezeichnung: 'Beton' };
    fixture.componentInstance.freitext = 'Bauschutt am Eingang';

    const submitPromise = fixture.componentInstance.submit();
    const request = httpMock.expectOne('/api/v1/wareneintraege');
    const body = request.request.body as FormData;
    expect(body.get('avvCodeId')).toBe('avv-1');
    expect(body.get('freitext')).toBe('Bauschutt am Eingang');
    expect(body.get('fotoFern')).toBeNull();
    expect(body.get('fotoNah')).toBeNull();
    expect(body.get('fotoDetail')).toBeNull();
    request.flush({ id: 'wareneintrag-1' });
    await submitPromise;

    expect(component.angelegt()).toEqual({ id: 'wareneintrag-1' });
  });

  it('submits only the fotos that were actually taken, under their own field names', async () => {
    const fixture = createComponent();
    const component = asTestable(fixture.componentInstance);
    component.ausgewaehlterAvvCode = { id: 'avv-1', code: '17 01 01', bezeichnung: 'Beton' };
    fixture.componentInstance.freitext = 'Bauschutt am Eingang';
    const fotoFern = new File(['fern'], 'fern.jpg', { type: 'image/jpeg' });
    const fotoDetail = new File(['detail'], 'detail.jpg', { type: 'image/jpeg' });
    component.onFotoAusgewaehlt('fotoFern', fotoAuswahlEvent(fotoFern));
    component.onFotoAusgewaehlt('fotoDetail', fotoAuswahlEvent(fotoDetail));

    const submitPromise = fixture.componentInstance.submit();
    const request = httpMock.expectOne('/api/v1/wareneintraege');
    const body = request.request.body as FormData;
    expect((body.get('fotoFern') as File).name).toBe('fern.jpg');
    expect(body.get('fotoNah')).toBeNull();
    expect((body.get('fotoDetail') as File).name).toBe('detail.jpg');
    request.flush({ id: 'wareneintrag-1' });
    await submitPromise;
  });

  it('shows an error when the request fails', async () => {
    const fixture = createComponent();
    const component = asTestable(fixture.componentInstance);
    component.ausgewaehlterAvvCode = { id: 'avv-1', code: '17 01 01', bezeichnung: 'Beton' };
    fixture.componentInstance.freitext = 'Bauschutt am Eingang';

    const submitPromise = fixture.componentInstance.submit();
    httpMock.expectOne('/api/v1/wareneintraege').flush('error', { status: 500, statusText: 'Server Error' });
    await submitPromise;

    expect(component.fehler()).toBe('Wareneintrag konnte nicht angelegt werden.');
  });

  it('resets fotos, AVV-Code and freitext when starting another entry', () => {
    const fixture = createComponent();
    const component = asTestable(fixture.componentInstance);
    component.onFotoAusgewaehlt('fotoFern', fotoAuswahlEvent(new File(['foto'], 'foto.jpg', { type: 'image/jpeg' })));
    component.ausgewaehlterAvvCode = { id: 'avv-1', code: '17 01 01', bezeichnung: 'Beton' };
    fixture.componentInstance.freitext = 'Bauschutt am Eingang';

    fixture.componentInstance.weitererEintrag();

    expect(component.fotoVorschau('fotoFern')).toBeNull();
    expect(component.ausgewaehlterAvvCode).toBeNull();
    expect(fixture.componentInstance.freitext).toBe('');
    expect(component.kannAbsenden).toBe(false);
  });

  it('debounces AVV search input and selects AVV codes by id', fakeAsync(() => {
    const fixture = createComponent();
    const component = asTestable(fixture.componentInstance);

    fixture.componentInstance.onAvvSucheEingabe('17');
    fixture.componentInstance.onAvvSucheEingabe('17 01');
    tick(299);
    httpMock.expectNone((req) => req.url === '/api/v1/avv-codes' && req.params.get('suche') === '17 01');
    tick(1);
    fixture.detectChanges();
    httpMock
      .expectOne((req) => req.url === '/api/v1/avv-codes' && req.params.get('suche') === '17 01')
      .flush([{ id: 'avv-1', code: '17 01 01', bezeichnung: 'Beton', gefaehrlich: false }]);
    tick();
    fixture.detectChanges();

    fixture.componentInstance.onAvvCodeAusgewaehlt({ option: { value: 'avv-1' } } as never);

    expect(component.ausgewaehlterAvvCode).toEqual({
      id: 'avv-1',
      code: '17 01 01',
      bezeichnung: 'Beton',
      gefaehrlich: false,
    });
  }));
});
