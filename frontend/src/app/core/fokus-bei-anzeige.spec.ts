import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FokusBeiAnzeige } from './fokus-bei-anzeige.js';

@Component({
  imports: [FokusBeiAnzeige],
  template: `
    <button>Absenden</button>
    @if (fehler()) {
      <p role="alert" appFokusBeiAnzeige>{{ fehler() }}</p>
    }
  `,
})
class Formular {
  readonly fehler = signal<string | null>(null);
}

describe('FokusBeiAnzeige', () => {
  it('focuses the element when it appears', async () => {
    const fixture = TestBed.createComponent(Formular);
    fixture.autoDetectChanges();
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();

    fixture.componentInstance.fehler.set('E-Mail oder Passwort ungültig.');
    await fixture.whenStable();

    const meldung = (fixture.nativeElement as HTMLElement).querySelector('p');
    expect(document.activeElement).toBe(meldung);
    expect(meldung?.getAttribute('tabindex')).toBe('-1');
    fixture.nativeElement.remove();
  });
});
