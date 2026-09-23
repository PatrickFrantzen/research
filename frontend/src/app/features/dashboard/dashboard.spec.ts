import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Dashboard } from './dashboard.js';

describe('Dashboard', () => {
  it('shows tiles linking to Einträge anlegen and Einträge ansehen', async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const links = Array.from(element.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(element.textContent).toContain('Einträge anlegen');
    expect(element.textContent).toContain('Einträge ansehen');
    expect(links).toContain('/wareneintrag-erfassen');
    expect(links).toContain('/wareneintraege');
  });
});
