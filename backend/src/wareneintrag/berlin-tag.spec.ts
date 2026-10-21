import { describe, expect, it } from 'vitest';
import { folgetagBeginnBerlin, tagesbeginnBerlin } from './berlin-tag.js';

describe('berlin-tag', () => {
  it.each([
    ['2026-01-15', '2026-01-14T23:00:00.000Z'], // Winterzeit (UTC+1)
    ['2026-10-21', '2026-10-20T22:00:00.000Z'], // Sommerzeit (UTC+2)
    // Umstellung auf Winterzeit am 25.10.: Mitternacht ist noch Sommerzeit
    ['2026-10-25', '2026-10-24T22:00:00.000Z'],
    ['2026-10-26', '2026-10-25T23:00:00.000Z'],
    // Umstellung auf Sommerzeit am 29.03.: Mitternacht ist noch Winterzeit
    ['2026-03-29', '2026-03-28T23:00:00.000Z'],
    ['2026-03-30', '2026-03-29T22:00:00.000Z'],
  ])('beginnt der Tag %s in Berlin um %s', (datum, erwartet) => {
    expect(tagesbeginnBerlin(datum).toISOString()).toBe(erwartet);
  });

  it('liefert den Beginn des Folgetags, auch über Monats- und Jahresgrenzen', () => {
    expect(folgetagBeginnBerlin('2026-10-21').toISOString()).toBe(
      '2026-10-21T22:00:00.000Z',
    );
    expect(folgetagBeginnBerlin('2026-12-31').toISOString()).toBe(
      '2026-12-31T23:00:00.000Z',
    );
    expect(folgetagBeginnBerlin('2026-02-28').toISOString()).toBe(
      '2026-02-28T23:00:00.000Z',
    );
  });
});
