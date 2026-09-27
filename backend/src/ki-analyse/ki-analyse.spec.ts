import { describe, expect, it } from 'vitest';
import { normalisiereAvvCode, pruefeAntwort, rundeAufHundert } from './ki-analyse.js';

const summe = (fraktionen: { anteilProzent: number }[]) => fraktionen.reduce((s, f) => s + f.anteilProzent, 0);

describe('rundeAufHundert', () => {
  it('rounds 33.3/33.3/33.4 to whole numbers that sum to exactly 100', () => {
    const ergebnis = rundeAufHundert([
      { name: 'A', anteilProzent: 33.3 },
      { name: 'B', anteilProzent: 33.3 },
      { name: 'C', anteilProzent: 33.4 },
    ]);
    expect(ergebnis.map((f) => f.anteilProzent)).toEqual([34, 33, 33]);
    expect(ergebnis[0].name).toBe('C');
  });

  it('normalises shares that do not sum to 100 and sorts descending', () => {
    const ergebnis = rundeAufHundert([
      { name: 'Holz', anteilProzent: 10 },
      { name: 'LVP', anteilProzent: 30 },
      { name: 'Sonstiges', anteilProzent: 5 },
    ]);
    expect(ergebnis.map((f) => f.name)).toEqual(['LVP', 'Holz', 'Sonstiges']);
    expect(summe(ergebnis)).toBe(100);
  });

  it('gives remaining points to the largest remainders', () => {
    const ergebnis = rundeAufHundert([
      { name: 'A', anteilProzent: 12.9 },
      { name: 'B', anteilProzent: 43.5 },
      { name: 'C', anteilProzent: 43.6 },
    ]);
    expect(ergebnis).toEqual([
      { name: 'C', anteilProzent: 44 },
      { name: 'B', anteilProzent: 43 },
      { name: 'A', anteilProzent: 13 },
    ]);
  });

  it('drops fractions that round to 0', () => {
    const ergebnis = rundeAufHundert([
      { name: 'A', anteilProzent: 99.8 },
      { name: 'B', anteilProzent: 0.2 },
    ]);
    expect(ergebnis).toEqual([{ name: 'A', anteilProzent: 100 }]);
  });
});

describe('pruefeAntwort', () => {
  const gueltig = {
    fraktionen: [
      { name: ' Holz ', anteilProzent: 60 },
      { name: 'Kunststoff', anteilProzent: 40 },
    ],
    einschaetzung: 'Überwiegend Holz.',
    avvPruefung: { urteil: 'passt_eher_nicht', begruendung: ' Holz statt Beton. ', vorgeschlagenerCode: '170201' },
  };

  it('accepts a valid answer and trims names', () => {
    expect(pruefeAntwort(gueltig)?.fraktionen[0]).toEqual({ name: 'Holz', anteilProzent: 60 });
  });

  it('accepts an empty fraction list (no waste visible)', () => {
    const avvPruefung = { urteil: 'nicht_beurteilbar', begruendung: 'Kein Abfall.', vorgeschlagenerCode: null };
    expect(pruefeAntwort({ fraktionen: [], einschaetzung: 'Kein Abfall erkennbar.', avvPruefung })?.fraktionen).toEqual([]);
  });

  it('cuts the assessment to 200 characters', () => {
    expect(pruefeAntwort({ ...gueltig, einschaetzung: 'x'.repeat(300) })?.einschaetzung).toHaveLength(200);
  });

  it('keeps the AVV check with a normalised suggested code', () => {
    expect(pruefeAntwort(gueltig)?.avvPruefung).toEqual({
      urteil: 'passt_eher_nicht',
      begruendung: 'Holz statt Beton.',
      vorgeschlagenerCode: '17 02 01',
    });
  });

  it('drops a malformed suggested code but keeps the verdict', () => {
    const antwort = pruefeAntwort({ ...gueltig, avvPruefung: { ...gueltig.avvPruefung, vorgeschlagenerCode: 'Holz' } });
    expect(antwort?.avvPruefung).toMatchObject({ urteil: 'passt_eher_nicht', vorgeschlagenerCode: null });
  });

  const neunFraktionen = Array.from({ length: 9 }, (_, i) => ({ name: `F${i}`, anteilProzent: 1 }));

  it.each([
    ['no object', 'Holz 60 %'],
    ['missing fraktionen', { einschaetzung: 'x' }],
    ['more than 8 fractions', { ...gueltig, fraktionen: neunFraktionen }],
    ['negative share', { ...gueltig, fraktionen: [{ name: 'Holz', anteilProzent: -5 }] }],
    ['share as string', { ...gueltig, fraktionen: [{ name: 'Holz', anteilProzent: '60' }] }],
    ['empty name', { ...gueltig, fraktionen: [{ name: ' ', anteilProzent: 100 }] }],
    ['all shares zero', { ...gueltig, fraktionen: [{ name: 'Holz', anteilProzent: 0 }] }],
    ['empty assessment', { ...gueltig, einschaetzung: '' }],
    ['missing AVV check', { fraktionen: gueltig.fraktionen, einschaetzung: 'x' }],
    ['unknown verdict', { ...gueltig, avvPruefung: { ...gueltig.avvPruefung, urteil: 'vielleicht' } }],
    ['empty reasoning', { ...gueltig, avvPruefung: { ...gueltig.avvPruefung, begruendung: '' } }],
  ])('rejects an invalid answer: %s', (_, antwort) => {
    expect(pruefeAntwort(antwort)).toBeNull();
  });
});

describe('normalisiereAvvCode', () => {
  it.each([
    ['170101', '17 01 01'],
    ['17 01 01', '17 01 01'],
    ['17 01 06*', '17 01 06'],
  ])('normalises %s to %s', (roh, erwartet) => {
    expect(normalisiereAvvCode(roh)).toBe(erwartet);
  });

  it.each([null, '', '17 01', '1701011', 'AB 01 01', 170101])('rejects %s', (roh) => {
    expect(normalisiereAvvCode(roh)).toBeNull();
  });
});
