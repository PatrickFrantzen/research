import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WareneintragErfassen } from './wareneintrag-erfassen.js';

interface TestableWareneintragErfassen {
  foto: File | null;
  ausgewaehlterAvvCode: { id: string; code: string; bezeichnung: string; gefaehrlich?: boolean } | null;
  kannAbsenden: boolean;
  angelegt: () => { id: string } | null;
  fehler: () => string | null;
}

function asTestable(component: WareneintragErfassen): TestableWareneintragErfassen {
  return component as unknown as TestableWareneintragErfassen;
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

  it('cannot be submitted until foto, AVV-Code and freitext are all set', () => {
    const fixture = createComponent();
    const component = asTestable(fixture.componentInstance);

    expect(component.kannAbsenden).toBe(false);

    component.foto = new File(['foto'], 'foto.jpg', { type: 'image/jpeg' });
    component.ausgewaehlterAvvCode = { id: 'avv-1', code: '17 01 01', bezeichnung: 'Beton' };
    fixture.componentInstance.freitext = 'Bauschutt am Eingang';

    expect(component.kannAbsenden).toBe(true);
  });

  it('does not send a request when submitted without a foto or AVV-Code', async () => {
    const fixture = createComponent();

    await fixture.componentInstance.submit();

    httpMock.expectNone('/api/v1/wareneintraege');
    expect().nothing();
  });

  it('submits foto, avvCodeId and freitext as FormData and stores the result', async () => {
    const fixture = createComponent();
    const component = asTestable(fixture.componentInstance);
    component.foto = new File(['foto'], 'foto.jpg', { type: 'image/jpeg' });
    component.ausgewaehlterAvvCode = { id: 'avv-1', code: '17 01 01', bezeichnung: 'Beton' };
    fixture.componentInstance.freitext = 'Bauschutt am Eingang';

    const submitPromise = fixture.componentInstance.submit();
    const request = httpMock.expectOne('/api/v1/wareneintraege');
    const body = request.request.body as FormData;
    expect(body.get('avvCodeId')).toBe('avv-1');
    expect(body.get('freitext')).toBe('Bauschutt am Eingang');
    expect((body.get('foto') as File).name).toBe('foto.jpg');
    request.flush({ id: 'wareneintrag-1' });
    await submitPromise;

    expect(component.angelegt()).toEqual({ id: 'wareneintrag-1' });
  });

  it('shows an error when the request fails', async () => {
    const fixture = createComponent();
    const component = asTestable(fixture.componentInstance);
    component.foto = new File(['foto'], 'foto.jpg', { type: 'image/jpeg' });
    component.ausgewaehlterAvvCode = { id: 'avv-1', code: '17 01 01', bezeichnung: 'Beton' };
    fixture.componentInstance.freitext = 'Bauschutt am Eingang';

    const submitPromise = fixture.componentInstance.submit();
    httpMock.expectOne('/api/v1/wareneintraege').flush('error', { status: 500, statusText: 'Server Error' });
    await submitPromise;

    expect(component.fehler()).toBe('Wareneintrag konnte nicht angelegt werden.');
  });

  it('resets foto, AVV-Code and freitext when starting another entry', () => {
    const fixture = createComponent();
    const component = asTestable(fixture.componentInstance);
    component.foto = new File(['foto'], 'foto.jpg', { type: 'image/jpeg' });
    component.ausgewaehlterAvvCode = { id: 'avv-1', code: '17 01 01', bezeichnung: 'Beton' };
    fixture.componentInstance.freitext = 'Bauschutt am Eingang';

    fixture.componentInstance.weitererEintrag();

    expect(component.foto).toBeNull();
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
