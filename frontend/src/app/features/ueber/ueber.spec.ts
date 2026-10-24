import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Ueber } from './ueber.js';

describe('Ueber', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('nennt Thomas Fritsche für Idee & Konzept und Patrick Frantzen für die Umsetzung', () => {
    const fixture = TestBed.createComponent(Ueber);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Idee & Konzept');
    expect(text).toContain('Thomas Fritsche');
    expect(text).toContain('Technische Umsetzung & Betrieb');
    expect(text).toContain('Patrick Frantzen (printByPatrick)');
  });

  it('verlinkt Impressum und Datenschutz', () => {
    const fixture = TestBed.createComponent(Ueber);
    fixture.detectChanges();

    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a')).map(
      (a) => a.getAttribute('href'),
    );
    expect(links).toEqual(['/impressum', '/datenschutz']);
  });
});
