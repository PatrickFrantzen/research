// Verwaltungsansicht am Desktop (Issue #62): kombinierte Filter mit
// Pagination sowie Bearbeiten und Löschen inklusive Bestätigung. Bearbeiten
// und Löschen arbeiten auf eigens angelegten Einträgen, damit die Zählungen
// der Seed-Daten unberührt bleiben.
import { APIRequestContext, expect, Page, test } from '@playwright/test';
import { AVV_A, AVV_B, csrfHeader, ERIKA, MAX, pruefeBarrierefreiheit } from './testdaten.js';

test.use({ storageState: ERIKA.storageState });

async function waehleAvvFilter(page: Page, suche: string): Promise<void> {
  await page.getByTestId('avv-suche').fill(suche);
  await page.getByRole('option', { name: new RegExp(`^${suche}`) }).click();
}

async function sucheFreitext(page: Page, begriff: string): Promise<void> {
  await page.getByTestId('freitext-suche').fill(begriff);
}

async function legeEintragAn(api: APIRequestContext, freitext: string): Promise<void> {
  const [avvCode] = (await (await api.get('/api/v1/avv-codes', { params: { suche: AVV_A.suche } })).json()) as { id: string }[];
  const antwort = await api.post('/api/v1/wareneintraege', {
    headers: await csrfHeader(api),
    multipart: { avvCodeId: avvCode.id, freitext },
  });
  expect(antwort.status()).toBe(201);
}

test('Freitext, AVV-Code und Standort kombiniert filtern, mit Pagination', async ({ page }) => {
  await page.goto('/wareneintraege');
  const karten = page.locator('mat-card');
  const trefferanzahl = page.getByTestId('trefferanzahl');

  // 16 "Karton"-Einträge von Erika: bei 10 pro Seite zwei Seiten.
  // Per Tastatur: Materials Touch-Target liegt über dem Select.
  await page.getByRole('combobox', { name: 'Einträge pro Seite:' }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('option', { name: '10' }).click();
  await sucheFreitext(page, 'Karton');
  await expect(trefferanzahl).toHaveText('16 Wareneinträge');
  await expect(karten).toHaveCount(10);
  await page.getByRole('button', { name: 'Nächste Seite' }).click();
  await expect(page.getByText('11 – 16 von 16')).toBeVisible();
  await expect(karten).toHaveCount(6);

  // Zusätzlicher Filter setzt auf Seite 1 zurück.
  await waehleAvvFilter(page, AVV_B.suche);
  await expect(trefferanzahl).toHaveText('8 Wareneinträge');
  await expect(page.getByText('1 – 8 von 8')).toBeVisible();
  await expect(page.getByTestId('filter-avv')).toContainText(AVV_B.code);
  await expect(page.getByTestId('filter-suche')).toContainText('Karton');

  await page.getByTestId('standort-filter').click();
  await page.getByRole('option', { name: MAX.standort }).click();
  await expect(page.getByTestId('keine-eintraege')).toBeVisible();
  await pruefeBarrierefreiheit(page, 'Liste mit drei aktiven Filtern');

  await page.getByTestId('filter-zuruecksetzen').click();
  await expect(page.getByTestId('filter-avv')).toHaveCount(0);

  // AVV_A + "Palette" am Außenlager: genau die drei Einträge von Max.
  await waehleAvvFilter(page, AVV_A.suche);
  await sucheFreitext(page, 'Palette');
  await page.getByTestId('standort-filter').click();
  await page.getByRole('option', { name: MAX.standort }).click();
  await expect(trefferanzahl).toHaveText('3 Wareneinträge');
  await expect(karten.filter({ hasText: `Standort: ${MAX.standort}` })).toHaveCount(3);
  // Fremde Einträge lassen sich nicht bearbeiten.
  await expect(page.getByTestId('wareneintrag-bearbeiten')).toHaveCount(0);
});

test('eigenen Wareneintrag bearbeiten', async ({ page }) => {
  await legeEintragAn(page.request, 'E2E Bearbeiten Original');
  await page.goto('/wareneintraege');
  await sucheFreitext(page, 'E2E Bearbeiten');
  await expect(page.getByTestId('trefferanzahl')).toHaveText('1 Wareneintrag');

  await page.getByTestId('wareneintrag-bearbeiten').click();
  const dialog = page.getByRole('dialog', { name: 'Wareneintrag bearbeiten' });
  await expect(dialog).toBeVisible();
  await pruefeBarrierefreiheit(page, 'Bearbeiten-Dialog');
  await dialog.getByTestId('bearbeiten-freitext').fill('E2E Bearbeiten Geändert');
  await dialog.getByTestId('bearbeiten-speichern').click();

  await expect(dialog).toBeHidden();
  await expect(page.locator('mat-card')).toContainText('E2E Bearbeiten Geändert');
});

test('eigenen Wareneintrag nach Bestätigung löschen', async ({ page }) => {
  await legeEintragAn(page.request, 'E2E Löschen');
  await page.goto('/wareneintraege');
  await sucheFreitext(page, 'E2E Löschen');
  await expect(page.getByTestId('trefferanzahl')).toHaveText('1 Wareneintrag');

  // Abbrechen lässt den Eintrag stehen.
  await page.getByTestId('wareneintrag-loeschen').click();
  const dialog = page.getByRole('dialog', { name: 'Wareneintrag löschen' });
  await expect(dialog).toContainText('„E2E Löschen“');
  await pruefeBarrierefreiheit(page, 'Lösch-Bestätigung');
  await dialog.getByTestId('confirm-dialog-abbrechen').click();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('trefferanzahl')).toHaveText('1 Wareneintrag');

  await page.getByTestId('wareneintrag-loeschen').click();
  await dialog.getByTestId('confirm-dialog-bestaetigen').click();

  await expect(page.getByText('Wareneintrag wurde gelöscht.')).toBeVisible();
  await expect(page.getByTestId('keine-eintraege')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Wareneinträge' })).toBeFocused();
});
