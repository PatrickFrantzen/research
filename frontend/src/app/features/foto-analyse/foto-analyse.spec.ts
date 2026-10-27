import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { FotoAnalyseApi, FotoAnalyseErgebnis } from '../../core/foto-analyse-api.js';
import { FotoAnalyse } from './foto-analyse.js';

const ERGEBNIS: FotoAnalyseErgebnis = {
  fraktionen: [{ name: 'Holz', anteilProzent: 100 }],
  einschaetzung: 'Lackiertes Holz.',
  avvVorschlag: {
    code: '17 02 04',
    bezeichnung: 'Holz mit gefährlichen Stoffen',
    gefaehrlich: true,
    begruendung: 'Lackiert.',
  },
};

describe('FotoAnalyse', () => {
  let api: jasmine.SpyObj<FotoAnalyseApi>;

  beforeEach(() => {
    api = jasmine.createSpyObj<FotoAnalyseApi>('FotoAnalyseApi', [
      'analysieren',
      'senden',
      'verwerfen',
    ]);
    spyOn(HTMLInputElement.prototype, 'click');
    TestBed.configureTestingModule({
      providers: [{ provide: FotoAnalyseApi, useValue: api }],
    });
  });

  async function mitFoto() {
    const fixture = TestBed.createComponent(FotoAnalyse);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const input = element.querySelector('[data-testid="kamera"]') as HTMLInputElement;
    const transfer = new DataTransfer();
    transfer.items.add(new File(['x'], 'foto.png', { type: 'image/png' }));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change'));
    await new Promise((resolve) => setTimeout(resolve, 50));
    await fixture.whenStable();
    return { fixture, element };
  }

  function klick(element: HTMLElement, testid: string) {
    (element.querySelector(`[data-testid="${testid}"]`) as HTMLButtonElement).click();
  }

  it('opens the camera directly', async () => {
    const fixture = TestBed.createComponent(FotoAnalyse);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    expect(HTMLInputElement.prototype.click).toHaveBeenCalled();
  });

  it('analyses only after confirmation and shows the suggestion with the hazard hint', async () => {
    api.analysieren.and.returnValue(of(ERGEBNIS));
    const { fixture, element } = await mitFoto();
    expect(api.analysieren).not.toHaveBeenCalled();
    expect(element.querySelector('.vorschau')).not.toBeNull();

    klick(element, 'analysieren');
    await fixture.whenStable();

    expect(api.analysieren).toHaveBeenCalled();
    expect(element.textContent).toContain('AVV-Vorschlag: 17 02 04');
    expect(element.querySelector('[data-testid="gefaehrlich"]')).not.toBeNull();
  });

  it('sends the mail and confirms it', async () => {
    api.analysieren.and.returnValue(of(ERGEBNIS));
    api.senden.and.returnValue(of(undefined));
    const { fixture, element } = await mitFoto();
    klick(element, 'analysieren');
    await fixture.whenStable();

    klick(element, 'senden');
    await fixture.whenStable();

    expect(api.senden).toHaveBeenCalled();
    expect(element.querySelector('[data-testid="gesendet"]')).not.toBeNull();
  });

  it('discards photo and result', async () => {
    api.analysieren.and.returnValue(of(ERGEBNIS));
    const { fixture, element } = await mitFoto();
    klick(element, 'analysieren');
    await fixture.whenStable();

    api.verwerfen.and.returnValue(of(undefined));
    klick(element, 'verwerfen');
    await fixture.whenStable();

    expect(element.querySelector('.vorschau')).toBeNull();
    expect(element.querySelector('[data-testid="aufnehmen"]')).not.toBeNull();
    expect(api.verwerfen).toHaveBeenCalled();
  });

  it('shows the error and retries', async () => {
    api.analysieren.and.returnValues(
      throwError(() => new Error('kaputt')),
      of(ERGEBNIS),
    );
    const { fixture, element } = await mitFoto();
    klick(element, 'analysieren');
    await fixture.whenStable();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'KI-Analyse ist fehlgeschlagen',
    );
    klick(element, 'analysieren');
    await fixture.whenStable();

    expect(api.analysieren).toHaveBeenCalledTimes(2);
    expect(element.textContent).toContain('Lackiertes Holz.');
  });
});
