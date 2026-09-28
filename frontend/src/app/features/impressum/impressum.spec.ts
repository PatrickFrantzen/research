import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Impressum } from './impressum.js';

describe('Impressum', () => {
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Impressum],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(Impressum);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  it('shows the operator sections and none that do not apply (Issue #105)', () => {
    const ueberschriften = Array.from(element.querySelectorAll('h2')).map((h2) =>
      h2.textContent?.trim(),
    );

    expect(ueberschriften).toEqual(['Angaben gemäß § 5 DDG', 'Kontakt', 'Steuerliche Angaben']);
  });

  it('shows name and address of the operator', () => {
    const text = element.textContent ?? '';

    expect(text).toContain('Patrick Frantzen');
    expect(text).toContain('Vögelser Kamp 26');
    expect(text).toContain('21357 Bardowick');
    expect(text).toContain('Handelsname: PrintByPatrickDE');
  });

  it('links e-mail and WhatsApp', () => {
    const email = element.querySelector('a[href="mailto:patrickfrantzen@web.de"]');
    const whatsapp = element.querySelector('a[href="https://wa.me/4915567213415"]');

    expect(email?.textContent?.trim()).toBe('patrickfrantzen@web.de');
    expect(whatsapp?.textContent?.trim()).toBe('015567213415');
  });

  it('shows the tax details including the small business note', () => {
    const text = element.textContent ?? '';

    expect(text).toContain('Steuernummer: 33/113/07862');
    expect(text).toContain('Finanzamt Lüneburg');
    expect(text).toContain('Kleinunternehmer im Sinne von § 19 UStG');
  });

  it('contains no placeholders anymore', () => {
    expect(element.querySelector('.platzhalter')).toBeNull();
    expect(element.textContent).not.toMatch(/\[[^\]]+\]/);
  });
});
