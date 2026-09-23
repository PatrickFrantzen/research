// Nutzer anlegen, Passwort setzen und vergessen, Einstellungen (Issue #62).
// Ohne abschließenden Login, um das Login-Rate-Limit zu schonen: der Login
// mit neuem Passwort ist in testdaten.setup.ts (Max) abgedeckt.
import { expect, test } from '@playwright/test';
import { ERIKA, MAX, pruefeBarrierefreiheit } from './testdaten.js';

test.describe('mit Session von Erika', () => {
  test.use({ storageState: ERIKA.storageState });

  test('Nutzer anlegen und über den Link das Passwort setzen', async ({ page, browser }) => {
    await page.goto('/nutzer-anlegen');
    await page.getByLabel('Vorname').fill('Clara');
    await page.getByLabel('Nachname').fill('Beispiel');
    await page.getByLabel('E-Mail').fill('clara.e2e@example.com');
    await page.getByRole('combobox', { name: 'Standort' }).click();
    await page.getByRole('option', { name: ERIKA.standort }).click();
    await page.getByRole('button', { name: 'Anlegen' }).click();

    const bestaetigung = page.getByRole('status').filter({ hasText: 'clara.e2e@example.com' });
    await expect(bestaetigung).toBeFocused();
    await pruefeBarrierefreiheit(page, 'Nutzer angelegt');
    const link = await page.getByTestId('passwort-setzen-link').inputValue();

    // Der neue Nutzer öffnet den Link in seinem eigenen Browser.
    const neuerKontext = await browser.newContext();
    const clara = await neuerKontext.newPage();
    await clara.goto(link);
    await expect(clara).toHaveURL(/\/passwort-setzen$/); // Token aus der URL entfernt
    const setzen = clara.getByRole('button', { name: 'Passwort setzen' });
    await clara.getByLabel('Neues Passwort').fill('zu-kurz');
    await expect(setzen).toBeDisabled();
    await clara.getByLabel('Neues Passwort').fill('e2e-Passwort-Clara-1');
    await setzen.click();

    await expect(clara).toHaveURL(/\/login\?passwortGesetzt=1$/);
    await expect(clara.getByText('Passwort wurde gesetzt. Du kannst dich jetzt anmelden.')).toBeVisible();
    await neuerKontext.close();
  });
});

test('Passwort setzen mit ungültigem Link zeigt eine fokussierte Fehlermeldung', async ({ page }) => {
  await page.goto('/passwort-setzen?token=ungueltig');
  await page.getByLabel('Neues Passwort').fill('e2e-Passwort-Egal-01');
  await page.getByRole('button', { name: 'Passwort setzen' }).click();

  const fehler = page.getByRole('alert');
  await expect(fehler).toBeVisible();
  await expect(fehler).toBeFocused();
  await pruefeBarrierefreiheit(page, 'Passwort setzen mit Fehler');
});

test('Passwort vergessen bestätigt die Anfrage ohne Rückschluss auf Accounts', async ({ page }) => {
  await page.goto('/passwort-vergessen');
  await page.getByLabel('E-Mail').fill('unbekannt.e2e@example.com');
  await page.getByRole('button', { name: 'Link anfordern' }).click();

  const bestaetigung = page.getByRole('status');
  await expect(bestaetigung).toContainText('Falls ein Account mit dieser E-Mail existiert');
  await expect(bestaetigung).toBeFocused();
  await pruefeBarrierefreiheit(page, 'Passwort vergessen bestätigt');
});

test.describe('mit Session von Max', () => {
  test.use({ storageState: MAX.storageState });

  test('Einstellungen speichern', async ({ page }) => {
    await page.goto('/einstellungen');
    const vorname = page.getByLabel('Vorname');
    await expect(vorname).toHaveValue(MAX.vorname);
    await vorname.fill('Maximilian');
    await page.getByRole('button', { name: 'Speichern' }).click();

    await expect(page.getByText('Änderungen gespeichert.')).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Vorname')).toHaveValue('Maximilian');
  });
});
