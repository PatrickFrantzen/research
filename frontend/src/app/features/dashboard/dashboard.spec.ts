import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Dashboard } from './dashboard.js';

describe('Dashboard', () => {
  it('shows tiles linking to Stoffstrom erfassen and Stoffstrom-Portal', async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const links = Array.from(element.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(element.textContent).toContain('Stoffstrom erfassen');
    expect(element.textContent).toContain('Stoffstrom-Portal');
    expect(links).toContain('/wareneintrag-erfassen');
    expect(links).toContain('/wareneintraege');
  });
});
