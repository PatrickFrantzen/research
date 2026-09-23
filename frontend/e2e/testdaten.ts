// Feste Testdaten und Helfer für die E2E-Tests (Issue #62). Die Zugangsdaten
// von Erika setzt e2e/stack.sh als Bootstrap-Nutzer, Max und die
// Wareneinträge legt testdaten.setup.ts über die API an.
import AxeBuilder from '@axe-core/playwright';
import { APIRequestContext, expect, Page } from '@playwright/test';

export const ERIKA = {
  email: 'erika.e2e@example.com',
  passwort: 'e2e-Passwort-Erika-1',
  vorname: 'Erster',
  standort: 'Hauptsitz',
  storageState: 'test-results/.auth/erika.json',
};

export const MAX = {
  email: 'max.e2e@example.com',
  // Von Erika vergeben, beim ersten Login durch passwort ersetzt (Issue #76).
  initialpasswort: 'e2e-Initial-Max-01',
  passwort: 'e2e-Passwort-Max-01',
  vorname: 'Max',
  nachname: 'Mustermann',
  standort: 'Außenlager',
  storageState: 'test-results/.auth/max.json',
};

// Zwei AVV-Codes für die Filter-Tests, per Suchbegriff eindeutig auffindbar.
export const AVV_A = { suche: '15 01 01', code: '15 01 01' };
export const AVV_B = { suche: '17 01 07', code: '17 01 07' };

// Erika: 23 Einträge (3 Seiten à 10), davon 8 mit AVV_B (Nr. 1, 4, …, 22) und 7
// mit "Palette" im Freitext (jede dritte Nr.). Max: 3 Einträge am Außenlager,
// alle AVV_A und "Palette".
export const ERIKA_EINTRAEGE = 23;
export const MAX_EINTRAEGE = 3;

// Kleines, gültiges PNG (1×1 Pixel) für Foto-Uploads.
export const TEST_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

// CSRF-Double-Submit: schreibende API-Aufrufe brauchen den Cookie-Wert als
// Header (siehe frontend/src/app/core/csrf.interceptor.ts).
export async function csrfHeader(request: APIRequestContext): Promise<Record<string, string>> {
  const { cookies } = await request.storageState();
  const csrf = cookies.find((cookie) => cookie.name === 'csrfToken');
  return csrf ? { 'X-CSRF-Token': csrf.value } : {};
}

// AXE-Gate (Issue #54): WCAG 2.2 A/AA plus AXE-Best-Practices (Landmarks,
// Überschriften). Jeder Verstoß bricht den Test, auch "minor": Stand heute
// sind es null, und so bleibt es sichtbar, wenn einer dazukommt.
export async function pruefeBarrierefreiheit(page: Page, kontext: string): Promise<void> {
  // Material-Animationen (Ripple, Dialog-Einblendung) abwarten, sonst misst
  // AXE Kontraste halbtransparenter Zwischenzustände.
  await page.waitForTimeout(300);
  const ergebnis = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  const beschreibung = ergebnis.violations
    .map((v) => `[${v.impact}] ${v.id}: ${v.help}\n  ${v.nodes.map((n) => n.target.join(' ')).join('\n  ')}`)
    .join('\n');
  expect(ergebnis.violations.map((v) => v.id), `AXE-Verstöße (${kontext}):\n${beschreibung}`).toEqual([]);
}
