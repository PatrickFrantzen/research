// Login-Journey per Tastatur (Issues #54, #62): Fehlerfall mit Fokus auf der
// Meldung, danach erfolgreicher Login mit Weiterleitung, Fokus auf der neuen
// Seite und aria-current in der Navigation. Ohne Mailversand ist
// "Passwort vergessen" ausgeblendet (Issue #76).
import { expect, test } from '@playwright/test';
import { ERIKA, pruefeBarrierefreiheit } from './testdaten.js';

test('geschützte Seite ohne Session leitet zum Login', async ({ page }) => {
  await page.goto('/wareneintraege');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Anmelden' })).toBeVisible();
  await expect(page).toHaveTitle('Anmelden – RE-SEARCH');
});

test('Login nur per Tastatur, erst mit falschem, dann mit richtigem Passwort', async ({ page }) => {
  await page.goto('/login');
  const email = page.getByLabel('E-Mail');
  const passwort = page.getByTestId('login-passwort');
  await expect(email).toBeEditable();
  await expect(page.getByRole('link', { name: 'Passwort vergessen' })).toHaveCount(0);

  await page.keyboard.press('Tab');
  await expect(email).toBeFocused();
  await page.keyboard.type(ERIKA.email);
  await page.keyboard.press('Tab');
  await expect(passwort).toBeFocused();
  await page.keyboard.type('falsches-Passwort-123');
  await page.keyboard.press('Enter');

  const fehler = page.getByRole('alert');
  await expect(fehler).toHaveText('E-Mail oder Passwort ungültig.');
  await expect(fehler).toBeFocused();
  await pruefeBarrierefreiheit(page, 'Login mit Fehlermeldung');

  // Zurück ins Passwortfeld: über den Sichtbarkeits-Button hinweg.
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(passwort).toBeFocused();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type(ERIKA.passwort);
  await page.keyboard.press('Enter');

  // Desktop-Startseite ist die Liste; der Fokus springt auf ihre Überschrift.
  await expect(page).toHaveURL(/\/wareneintraege$/);
  await expect(page).toHaveTitle('Wareneinträge – RE-SEARCH');
  await expect(page.getByRole('heading', { level: 1, name: 'Wareneinträge' })).toBeFocused();

  const hauptnavigation = page.getByRole('navigation', { name: 'Hauptnavigation' });
  await expect(hauptnavigation.getByRole('link', { name: 'Wareneinträge' })).toHaveAttribute('aria-current', 'page');

  const erfassenLink = hauptnavigation.getByRole('link', { name: 'Wareneintrag erfassen' });
  await erfassenLink.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Wareneintrag erfassen' })).toBeFocused();
  await expect(erfassenLink).toHaveAttribute('aria-current', 'page');
  await expect(hauptnavigation.getByRole('link', { name: 'Wareneinträge' })).not.toHaveAttribute('aria-current');
});
