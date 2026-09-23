import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { fokussiereUeberschriftNachNavigation } from './fokus-nach-navigation.js';

@Component({ template: '<h1>Seite A</h1>' })
class SeiteA {}

@Component({ template: '<h1>Seite B</h1><button>Aktion</button>' })
class SeiteB {}

@Component({ imports: [RouterOutlet], template: '<router-outlet />' })
class Wurzel {
  constructor() {
    fokussiereUeberschriftNachNavigation();
  }
}

describe('fokussiereUeberschriftNachNavigation', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'a', component: SeiteA },
          { path: 'b', component: SeiteB },
        ]),
      ],
    });
  });

  it('leaves focus alone on the initial navigation and focuses the new h1 afterwards', async () => {
    const fixture = TestBed.createComponent(Wurzel);
    fixture.autoDetectChanges();
    document.body.appendChild(fixture.nativeElement);
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/a');
    await fixture.whenStable();
    expect(document.activeElement?.tagName).not.toBe('H1');

    await router.navigateByUrl('/b');
    await fixture.whenStable();

    expect(document.activeElement?.textContent).toBe('Seite B');
    expect(document.activeElement?.getAttribute('tabindex')).toBe('-1');
    fixture.nativeElement.remove();
  });
});
