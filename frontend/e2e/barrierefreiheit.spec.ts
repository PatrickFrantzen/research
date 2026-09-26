// AXE-Gate für alle Seiten in Hell und Dunkel (Issue #54): WCAG 2.2 A/AA
// inklusive Kontrast. Die Flows selbst prüfen AXE zusätzlich in
// Zwischenzuständen (Fehler, Dialoge), siehe die übrigen Specs.
import { expect, test } from '@playwright/test';
import { ERIKA, pruefeBarrierefreiheit } from './testdaten.js';

const OEFFENTLICHE_SEITEN = [
  { pfad: '/login', ueberschrift: 'Anmelden' },
  { pfad: '/passwort-vergessen', ueberschrift: 'Passwort vergessen' },
  { pfad: '/passwort-setzen', ueberschrift: 'Passwort setzen' },
  { pfad: '/impressum', ueberschrift: 'Impressum' },
  { pfad: '/gibt-es-nicht', ueberschrift: 'Seite nicht gefunden' },
];

const GESCHUETZTE_SEITEN = [
  { pfad: '/wareneintraege', ueberschrift: 'Wareneinträge' },
  { pfad: '/wareneintrag-erfassen', ueberschrift: 'Wareneintrag erfassen' },
  { pfad: '/nutzerverwaltung', ueberschrift: 'Nutzerverwaltung' },
  { pfad: '/protokolle', ueberschrift: 'Logs' },
  { pfad: '/nutzer-anlegen', ueberschrift: 'Nutzer anlegen' },
  { pfad: '/einstellungen', ueberschrift: 'Einstellungen' },
];

for (const farbschema of ['light', 'dark'] as const) {
  test.describe(`Farbschema ${farbschema}`, () => {
    test.use({ colorScheme: farbschema });

    for (const seite of OEFFENTLICHE_SEITEN) {
      test(`${seite.pfad} ohne Session`, async ({ page }) => {
        await page.goto(seite.pfad);
        await expect(page.getByRole('heading', { level: 1, name: seite.ueberschrift })).toBeVisible();
        await pruefeBarrierefreiheit(page, `${seite.pfad}, ${farbschema}`);
      });
    }

    test.describe('mit Session', () => {
      test.use({ storageState: ERIKA.storageState });

      for (const seite of GESCHUETZTE_SEITEN) {
        test(seite.pfad, async ({ page }) => {
          await page.goto(seite.pfad);
          await expect(page.getByRole('heading', { level: 1, name: seite.ueberschrift })).toBeVisible();
          await page.waitForLoadState('networkidle');
          await pruefeBarrierefreiheit(page, `${seite.pfad}, ${farbschema}`);
        });
      }
    });
  });
}
