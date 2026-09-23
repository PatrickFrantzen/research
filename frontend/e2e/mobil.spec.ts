// Mobile Journey (Issues #54, #62): Dashboard → Wareneintrag mit Foto
// erfassen → in der Liste wiederfinden, dazu Bottom-Navigation und
// "Mehr"-Menü per Tastatur sowie AXE auf den mobilen Ansichten.
import { expect, test } from '@playwright/test';
import { AVV_A, ERIKA, pruefeBarrierefreiheit, TEST_PNG } from './testdaten.js';

test.use({ storageState: ERIKA.storageState });

for (const farbschema of ['light', 'dark'] as const) {
  test(`AXE auf Dashboard, Erfassen und Liste (${farbschema})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: farbschema });
    for (const pfad of ['/', '/wareneintrag-erfassen', '/wareneintraege']) {
      await page.goto(pfad);
      await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
      await page.waitForLoadState('networkidle');
      await pruefeBarrierefreiheit(page, `mobil ${pfad}, ${farbschema}`);
    }
  });
}

test('Wareneintrag mit Foto erfassen und in der Liste wiederfinden', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Einträge anlegen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Wareneintrag erfassen' })).toBeFocused();

  await page.locator('input[type="file"]').first().setInputFiles({ name: 'fern.png', mimeType: 'image/png', buffer: TEST_PNG });
  await expect(page.getByRole('img', { name: 'Fernansicht' })).toBeVisible();

  await page.getByLabel('AVV-Code').fill(AVV_A.suche);
  await page.getByRole('option', { name: new RegExp(`^${AVV_A.code}`) }).click();
  await page.getByLabel('Freitext').fill('Mobil E2E mit Foto');
  await page.getByRole('button', { name: 'Absenden' }).click();

  await expect(page.getByText('Wareneintrag wurde angelegt.')).toBeVisible();
  // Formular ist für den nächsten Eintrag zurückgesetzt.
  await expect(page.getByLabel('Freitext')).toHaveValue('');
  await expect(page.getByRole('img', { name: 'Fernansicht' })).toHaveCount(0);

  const mobileNavigation = page.getByRole('navigation', { name: 'Mobile Navigation' });
  await mobileNavigation.getByRole('link', { name: 'Wareneinträge' }).click();
  await expect(mobileNavigation.getByRole('link', { name: 'Wareneinträge' })).toHaveAttribute('aria-current', 'page');
  await page.getByTestId('freitext-suche').fill('Mobil E2E mit Foto');
  await expect(page.getByTestId('trefferanzahl')).toHaveText('1 Wareneintrag');

  // Foto kommt per signierter URL aus dem Objektspeicher und lädt wirklich.
  const foto = page.getByRole('img', { name: new RegExp(`^Fernansicht – AVV ${AVV_A.code}`) });
  await expect(foto).toBeVisible();
  await expect.poll(() => foto.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBe(1);
});

test('"Mehr"-Menü per Tastatur öffnen, schließen und darüber navigieren', async ({ page }) => {
  await page.goto('/');
  const mehr = page.getByRole('button', { name: 'Mehr' });

  await mehr.focus();
  await page.keyboard.press('Enter');
  const menue = page.locator('mat-bottom-sheet-container');
  await expect(menue.getByRole('link', { name: 'Einstellungen' })).toBeVisible();
  await pruefeBarrierefreiheit(page, 'Mehr-Menü offen');

  // Ohne Navigation geschlossen: Fokus zurück auf "Mehr".
  await page.keyboard.press('Escape');
  await expect(menue).toBeHidden();
  await expect(mehr).toBeFocused();

  await page.keyboard.press('Enter');
  await menue.getByRole('link', { name: 'Einstellungen' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/einstellungen$/);
  await expect(menue).toBeHidden();
  await expect(page.getByRole('heading', { level: 1, name: 'Einstellungen' })).toBeFocused();
});
