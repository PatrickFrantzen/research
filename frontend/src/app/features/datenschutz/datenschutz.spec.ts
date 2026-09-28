import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Datenschutz } from './datenschutz.js';

describe('Datenschutz', () => {
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Datenschutz],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(Datenschutz);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  function abschnitt(titel: string): string {
    const h2 = Array.from(element.querySelectorAll('h2')).find(
      (ueberschrift) => ueberschrift.textContent?.trim() === titel,
    );
    return h2?.closest('section')?.textContent ?? '';
  }

  it('covers every processing of the app (Issue #107)', () => {
    const ueberschriften = Array.from(element.querySelectorAll('h2')).map((h2) =>
      h2.textContent?.trim(),
    );

    expect(ueberschriften).toEqual([
      'Verantwortlicher',
      'Geltungsbereich',
      'Hosting',
      'Nutzerkonto',
      'Wareneinträge, Fotos und Dokumente',
      'Cookies und Speicher im Browser',
      'Protokolle',
      'Schutz vor Missbrauch',
      'E-Mail-Versand',
      'KI-Analyse mit Google Gemini',
      'Datensicherung',
      'Externe Inhalte',
      'Ihre Rechte',
      'Beschwerderecht',
    ]);
  });

  it('names the controller with the data from the Impressum', () => {
    const verantwortlicher = abschnitt('Verantwortlicher');

    expect(verantwortlicher).toContain('Patrick Frantzen');
    expect(verantwortlicher).toContain('Vögelser Kamp 26');
    expect(verantwortlicher).toContain('21357 Bardowick');
    expect(element.querySelector('a[href="mailto:patrickfrantzen@web.de"]')).not.toBeNull();
  });

  it('explains that the KI-Analyse only runs on an explicit click and transfers photos to the USA', () => {
    const gemini = abschnitt('KI-Analyse mit Google Gemini');

    expect(gemini).toContain('ausdrücklich');
    expect(gemini).toContain('USA');
    expect(gemini).toContain('Drittland');
    expect(gemini).toContain('kostenlosen Tarif');
  });

  it('states the retention of logs and backups', () => {
    expect(abschnitt('Protokolle')).toContain('30 Tage');
    expect(abschnitt('Datensicherung')).toContain('7 Tage');
  });

  it('names the supervisory authority', () => {
    expect(abschnitt('Beschwerderecht')).toContain('Niedersachsen');
  });
});
