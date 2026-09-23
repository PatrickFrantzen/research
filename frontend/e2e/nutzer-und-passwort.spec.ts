// Nutzerverwaltung ohne Mailversand (Issue #76): Nutzer mit Initialpasswort
// anlegen, Pflicht-Passwortwechsel beim ersten Login, Zurücksetzen durch einen
// Kollegen. Dazu die weiter per URL erreichbaren Seiten "Passwort setzen" und
// "Passwort vergessen" (für #63) sowie die Einstellungen.
import { Browser, expect, Page, test } from '@playwright/test';
import { ERIKA, MAX, pruefeBarrierefreiheit } from './testdaten.js';

const CLARA = {
  vorname: 'Clara',
  nachname: 'Beispiel',
  email: 'clara.e2e@example.com',
  initialpasswort: 'e2e-Initial-Clara-1',
  passwort: 'e2e-Passwort-Clara-1',
  zurueckgesetzt: 'e2e-Reset-Clara-001',
};

async function loginAls(browser: Browser, email: string, passwort: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto('/login');
  await page.getByLabel('E-Mail').fill(email);
  await page.getByTestId('login-passwort').fill(passwort);
  await page.getByRole('button', { name: 'Login' }).click();
  return page;
}

async function aendereInitialpasswort(page: Page, neuesPasswort: string): Promise<void> {
  await page.getByLabel('Neues Passwort', { exact: true }).fill(neuesPasswort);
  await page.getByLabel('Neues Passwort wiederholen').fill(neuesPasswort);
  await page.getByRole('button', { name: 'Passwort ändern' }).click();
}

test.describe('mit Session von Erika', () => {
  test.use({ storageState: ERIKA.storageState });

  test('Nutzer anlegen, erster Login mit Pflicht-Passwortwechsel, Zurücksetzen durch Kollegin', async ({ page, browser }) => {
    // Anlegen über die Nutzerliste.
    await page.goto('/nutzer');
    await page.getByRole('link', { name: 'Nutzer anlegen' }).click();
    await expect(page).toHaveURL(/\/nutzer\/neu$/);
    await page.getByLabel('Vorname').fill(CLARA.vorname);
    await page.getByLabel('Nachname').fill(CLARA.nachname);
    await page.getByLabel('E-Mail').fill(CLARA.email);
    await page.getByRole('combobox', { name: 'Standort' }).click();
    await page.getByRole('option', { name: ERIKA.standort }).click();
    await page.getByTestId('initialpasswort').fill(CLARA.initialpasswort);
    await page.getByRole('button', { name: 'Anlegen' }).click();

    const bestaetigung = page.getByRole('status').filter({ hasText: CLARA.email });
    await expect(bestaetigung).toBeFocused();
    await expect(page.getByText('persönlich an den Kollegen weitergeben')).toBeVisible();
    await pruefeBarrierefreiheit(page, 'Nutzer angelegt');

    // Clara meldet sich mit dem Initialpasswort an: nur der Wechsel ist erreichbar.
    const clara = await loginAls(browser, CLARA.email, CLARA.initialpasswort);
    await expect(clara).toHaveURL(/\/passwort-aendern$/);
    await expect(clara.getByRole('heading', { level: 1, name: 'Passwort ändern' })).toBeFocused();
    await pruefeBarrierefreiheit(clara, 'Passwort ändern');
    await clara.goto('/wareneintraege');
    await expect(clara).toHaveURL(/\/passwort-aendern$/);
    const gesperrt = await clara.request.get('/api/v1/wareneintraege');
    expect(gesperrt.status(), 'Backend erzwingt den Wechsel').toBe(403);

    // Initialpasswort behalten geht nicht.
    await aendereInitialpasswort(clara, CLARA.initialpasswort);
    const fehler = clara.getByRole('alert');
    await expect(fehler).toContainText('vom Initialpasswort unterscheiden');
    await expect(fehler).toBeFocused();

    await aendereInitialpasswort(clara, CLARA.passwort);
    await expect(clara.getByText('Passwort geändert.')).toBeVisible();
    await expect(clara).toHaveURL(/\/wareneintraege$/);
    await expect(clara.getByTestId('trefferanzahl')).toBeVisible();

    // Clara hat ihr Passwort vergessen: Erika vergibt ein neues Initialpasswort.
    await page.goto('/nutzer');
    const eintrag = page.getByTestId('nutzer-eintrag').filter({ hasText: CLARA.email });
    await eintrag.getByRole('button', { name: `Passwort zurücksetzen für ${CLARA.vorname} ${CLARA.nachname}` }).click();
    const dialog = page.getByRole('dialog', { name: 'Passwort zurücksetzen' });
    await expect(dialog).toBeVisible();
    await pruefeBarrierefreiheit(page, 'Passwort-zurücksetzen-Dialog');
    await dialog.getByTestId('zuruecksetzen-passwort').fill(CLARA.zurueckgesetzt);
    await dialog.getByRole('button', { name: 'Zurücksetzen' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(`Passwort für ${CLARA.vorname} ${CLARA.nachname} zurückgesetzt.`)).toBeVisible();

    // Claras alte Session ist damit beendet ...
    await clara.getByRole('button', { name: 'Nächste Seite' }).click();
    await expect(clara).toHaveURL(/\/login$/);
    // ... und mit dem neuen Initialpasswort ist der Wechsel wieder Pflicht.
    const claraNeu = await loginAls(browser, CLARA.email, CLARA.zurueckgesetzt);
    await expect(claraNeu).toHaveURL(/\/passwort-aendern$/);
  });

  test('das eigene Passwort lässt sich in der Nutzerliste nicht zurücksetzen', async ({ page }) => {
    await page.goto('/nutzer');
    const eigenerEintrag = page.getByTestId('nutzer-eintrag').filter({ hasText: ERIKA.email });
    await expect(eigenerEintrag).toContainText('Du');
    await expect(eigenerEintrag.getByTestId('passwort-zuruecksetzen')).toHaveCount(0);
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
