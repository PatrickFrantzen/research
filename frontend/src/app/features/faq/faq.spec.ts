import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Faq } from './faq.js';

describe('Faq', () => {
  it('zeigt die Fragen als aufklappbare Panels', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Faq);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const fragen = Array.from(element.querySelectorAll('mat-panel-title')).map((f) =>
      f.textContent?.trim(),
    );

    expect(element.querySelector('h1')?.textContent).toContain('Häufige Fragen');
    expect(fragen.length).toBeGreaterThanOrEqual(5);
    expect(fragen).toContain('Was kann die KI-Analyse?');
    expect(fragen.every((frage) => frage?.endsWith('?'))).toBeTrue();
  });
});
