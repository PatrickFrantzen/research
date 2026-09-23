import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Impressum } from './impressum.js';

describe('Impressum', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Impressum],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('shows all mandatory sections with clearly marked placeholders', () => {
    const fixture = TestBed.createComponent(Impressum);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const ueberschriften = Array.from(element.querySelectorAll('h2')).map((h2) => h2.textContent?.trim());

    expect(ueberschriften).toEqual([
      'Angaben gemäß § 5 DDG',
      'Vertreten durch',
      'Kontakt',
      'Registereintrag',
      'Umsatzsteuer-ID',
    ]);
    expect(element.querySelectorAll('.platzhalter').length).toBeGreaterThan(0);
  });
});
