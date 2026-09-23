// Auth-Fehlerpfade gegen das echte Backend (Issue #62): Eine abgelaufene
// Session (401) führt zurück zum Login, eine fehlende Berechtigung (403)
// bleibt auf der Seite und wird angesagt.
import { expect, test } from '@playwright/test';
import { ERIKA, MAX } from './testdaten.js';

test.describe('401: Session abgelaufen', () => {
  test.use({ storageState: ERIKA.storageState });

  test('nächster API-Aufruf leitet zum Login', async ({ page, context }) => {
    await page.goto('/wareneintraege');
    await expect(page.getByTestId('trefferanzahl')).toBeVisible();

    // Wie ein abgelaufenes Cookie: der Server kennt die Session nicht mehr.
    await context.clearCookies();
    await page.getByRole('button', { name: 'Nächste Seite' }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Anmelden' })).toBeFocused();
  });
});

test.describe('403: keine Berechtigung', () => {
  test.use({ storageState: MAX.storageState });

  test('Löschen eines fremden Eintrags wird abgelehnt und angesagt', async ({ page }) => {
    // Die UI zeigt für fremde Einträge keinen Lösch-Button. Um die echte
    // 403-Antwort des Backends zu provozieren, wird Max' Lösch-Request auf
    // einen Eintrag von Erika umgeleitet.
    const liste = await page.request.get('/api/v1/wareneintraege', { params: { suche: 'Erika 01', proSeite: '1' } });
    const [fremderEintrag] = ((await liste.json()) as { daten: { id: string }[] }).daten;
    await page.route('**/api/v1/wareneintraege/*', async (route) => {
      if (route.request().method() !== 'DELETE') return route.continue();
      await route.continue({ url: route.request().url().replace(/[^/]+$/, fremderEintrag.id) });
    });

    await page.goto('/wareneintraege');
    await page.getByTestId('freitext-suche').fill('Max 01');
    await expect(page.getByTestId('trefferanzahl')).toHaveText('1 Wareneintrag');
    await page.getByTestId('wareneintrag-loeschen').click();
    await page.getByTestId('confirm-dialog-bestaetigen').click();

    await expect(page.getByText('Keine Berechtigung für diese Aktion.')).toBeVisible();
    await expect(page).toHaveURL(/\/wareneintraege$/);
    await expect(page.getByTestId('trefferanzahl')).toHaveText('1 Wareneintrag');

    const nochDa = await page.request.get('/api/v1/wareneintraege', { params: { suche: 'Erika 01', proSeite: '1' } });
    expect(((await nochDa.json()) as { gesamt: number }).gesamt).toBe(1);
  });
});
