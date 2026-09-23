import { DeutscherPaginatorIntl } from './paginator-intl.js';

describe('DeutscherPaginatorIntl', () => {
  const intl = new DeutscherPaginatorIntl();

  it('uses German labels', () => {
    expect(intl.itemsPerPageLabel).toBe('Einträge pro Seite:');
    expect(intl.nextPageLabel).toBe('Nächste Seite');
  });

  it('formats the range in German', () => {
    expect(intl.getRangeLabel(0, 20, 2)).toBe('1 – 2 von 2');
    expect(intl.getRangeLabel(1, 10, 25)).toBe('11 – 20 von 25');
    expect(intl.getRangeLabel(2, 10, 25)).toBe('21 – 25 von 25');
  });

  it('handles an empty result', () => {
    expect(intl.getRangeLabel(0, 10, 0)).toBe('0 von 0');
  });
});
