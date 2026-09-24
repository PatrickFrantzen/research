import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { WareneintragErfassen } from './wareneintrag-erfassen.js';

interface TestableWareneintragErfassen {
  ausgewaehlterAvvCode: { id: string; code: string; bezeichnung: string; gefaehrlich?: boolean } | null;
  kannAbsenden: boolean;
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

  describe('Fotoauswahl (Issue #59)', () => {
    it('offers only the image types the server accepts and prefers the rear camera', () => {
      const fixture = createComponent();
      const inputs = fixture.nativeElement.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>;

      expect(inputs.length).toBe(3);
      inputs.forEach((input) => {
        expect(input.accept).toBe('image/jpeg,image/png,image/webp');
        expect(input.getAttribute('capture')).toBe('environment');
      });
    });

    it('rejects an unsupported file type before any request: message, no preview, not submitted', async () => {
      const fixture = createComponent();
      const component = asTestable(fixture.componentInstance);

      component.onFotoAusgewaehlt('fotoFern', fotoAuswahlEvent(new File(['gif'], 'foto.gif', { type: 'image/gif' })));
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Fernansicht: Nur JPEG, PNG oder WebP erlaubt.');
      expect(component.fotoVorschau('fotoFern')).toBeNull();

      component.ausgewaehlterAvvCode = { id: 'avv-1', code: '17 01 01', bezeichnung: 'Beton' };
      fixture.componentInstance.freitext = 'Bauschutt am Eingang';
      const submitPromise = fixture.componentInstance.submit();
      const request = httpMock.expectOne('/api/v1/wareneintraege');
      expect((request.request.body as FormData).get('fotoFern')).toBeNull();
      request.flush({ id: 'wareneintrag-1' });
      await submitPromise;
    });

    it('rejects a file larger than 10 MB with a clear message and no preview', () => {
      const fixture = createComponent();
      const component = asTestable(fixture.componentInstance);
      const zuGross = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'riesig.jpg', { type: 'image/jpeg' });

      component.onFotoAusgewaehlt('fotoNah', fotoAuswahlEvent(zuGross));
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Nahansicht: Datei ist größer als 10 MB.');
      expect(component.fotoVorschau('fotoNah')).toBeNull();
    });

    it('accepts a PNG or WebP of exactly 10 MB: clears the previous message, shows a preview and submits it', async () => {
      const fixture = createComponent();
      const component = asTestable(fixture.componentInstance);
      component.onFotoAusgewaehlt('fotoDetail', fotoAuswahlEvent(new File(['gif'], 'alt.gif', { type: 'image/gif' })));
      const grenze = new File([new Uint8Array(10 * 1024 * 1024)], 'detail.webp', { type: 'image/webp' });

      component.onFotoAusgewaehlt('fotoDetail', fotoAuswahlEvent(grenze));
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
      expect(component.fotoVorschau('fotoDetail')).not.toBeNull();
      component.ausgewaehlterAvvCode = { id: 'avv-1', code: '17 01 01', bezeichnung: 'Beton' };
      fixture.componentInstance.freitext = 'Bauschutt am Eingang';
      const submitPromise = fixture.componentInstance.submit();
      const request = httpMock.expectOne('/api/v1/wareneintraege');
      expect(((request.request.body as FormData).get('fotoDetail') as File).name).toBe('detail.webp');
      request.flush({ id: 'wareneintrag-1' });
      await submitPromise;
    });

    it('clears the file inputs after a successful entry, so the same photo can be picked again', async () => {
      const fixture = createComponent();
      const input = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;
      const auswahl = new DataTransfer();
      auswahl.items.add(new File(['fern'], 'fern.jpg', { type: 'image/jpeg' }));
      input.files = auswahl.files;
      input.dispatchEvent(new Event('change'));
      const component = asTestable(fixture.componentInstance);
      component.ausgewaehlterAvvCode = { id: 'avv-1', code: '17 01 01', bezeichnung: 'Beton' };
      fixture.componentInstance.freitext = 'Bauschutt am Eingang';

      const submitPromise = fixture.componentInstance.submit();
      httpMock.expectOne('/api/v1/wareneintraege').flush({ id: 'wareneintrag-1' });
      await submitPromise;
      fixture.detectChanges();

      const inputs = fixture.nativeElement.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>;
      inputs.forEach((feld) => expect(feld.files?.length ?? 0).toBe(0));
      expect(component.fotoVorschau('fotoFern')).toBeNull();
    });
  });

  it('cannot be submitted until AVV-Code and freitext are both set, no foto required', () => {
    const fixture = createComponent();
    const component = asTestable(fixture.componentInstance);

    expect(component.kannAbsenden).toBe(false);

    component.ausgewaehlterAvvCode = { id: 'avv-1', code: '17 01 01', bezeichnung: 'Beton' };
    fixture.componentInstance.freitext = 'Bauschutt am Eingang';

    expect(component.kannAbsenden).toBe(true);
  });

  it('cannot be submitted with a freitext longer than the backend limit of 2000 characters', () => {
    const fixture = createComponent();
    const component = asTestable(fixture.componentInstance);
    component.ausgewaehlterAvvCode = { id: 'avv-1', code: '17 01 01', bezeichnung: 'Beton' };

    fixture.componentInstance.freitext = 'a'.repeat(2000);
    expect(component.kannAbsenden).toBe(true);

    fixture.componentInstance.freitext = 'a'.repeat(2001);
    expect(component.kannAbsenden).toBe(false);
  });

  it('does not send a request when submitted without an AVV-Code', async () => {
    const fixture = createComponent();

    await fixture.componentInstance.submit();

    httpMock.expectNone('/api/v1/wareneintraege');
    expect().nothing();
  });

  it('submits without any foto, since photos are optional, then confirms and resets for the next entry', async () => {
    const openSpy = spyOn(TestBed.inject(MatSnackBar), 'open');
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

    expect(openSpy).toHaveBeenCalledWith('Wareneintrag wurde angelegt.', undefined, jasmine.anything());
    expect(fixture.componentInstance.freitext).toBe('');
    expect(component.ausgewaehlterAvvCode).toBeNull();
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

  describe('Object-URLs der Fotovorschau', () => {
    let urlZaehler: number;

    beforeEach(() => {
      urlZaehler = 0;
      spyOn(URL, 'createObjectURL').and.callFake(() => `blob:vorschau-${++urlZaehler}`);
      spyOn(URL, 'revokeObjectURL');
    });

    function foto(name: string): Event {
      return fotoAuswahlEvent(new File([name], `${name}.jpg`, { type: 'image/jpeg' }));
    }

    it('revokes the previous preview when a foto is replaced and shows the new one', () => {
      const fixture = createComponent();
      const component = asTestable(fixture.componentInstance);

      component.onFotoAusgewaehlt('fotoFern', foto('erstes'));
      component.onFotoAusgewaehlt('fotoFern', foto('zweites'));

      expect(URL.revokeObjectURL).toHaveBeenCalledOnceWith('blob:vorschau-1');
      expect(component.fotoVorschau('fotoFern')).toBe('blob:vorschau-2');
    });

    it('revokes every preview exactly once on reset', () => {
      const fixture = createComponent();
      const component = asTestable(fixture.componentInstance);
      component.onFotoAusgewaehlt('fotoFern', foto('fern'));
      component.onFotoAusgewaehlt('fotoDetail', foto('detail'));

      fixture.componentInstance.weitererEintrag();
      fixture.destroy();

      expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:vorschau-1');
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:vorschau-2');
    });

    it('revokes remaining previews when the component is destroyed', () => {
      const fixture = createComponent();
      asTestable(fixture.componentInstance).onFotoAusgewaehlt('fotoNah', foto('nah'));

      fixture.destroy();

      expect(URL.revokeObjectURL).toHaveBeenCalledOnceWith('blob:vorschau-1');
    });
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
