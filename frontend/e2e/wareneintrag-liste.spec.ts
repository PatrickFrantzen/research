// Verwaltungsansicht am Desktop (Issue #62): kombinierte Filter mit
// Pagination sowie Bearbeiten und Löschen inklusive Bestätigung. Bearbeiten
// und Löschen arbeiten auf eigens angelegten Einträgen, damit die Zählungen
// der Seed-Daten unberührt bleiben.
import { APIRequestContext, expect, Page, test } from '@playwright/test';
import { AVV_A, AVV_B, csrfHeader, ERIKA, MAX, pruefeBarrierefreiheit, TEST_PNG } from './testdaten.js';

test.use({ storageState: ERIKA.storageState });

async function waehleAvvFilter(page: Page, suche: string): Promise<void> {
  await page.getByTestId('avv-suche').fill(suche);
  await page.getByRole('option', { name: new RegExp(`^${suche}`) }).click();
}

async function sucheFreitext(page: Page, begriff: string): Promise<void> {
  await page.getByTestId('freitext-suche').fill(begriff);
}

async function legeEintragAn(api: APIRequestContext, freitext: string, fotos: string[] = []): Promise<void> {
  const [avvCode] = (await (await api.get('/api/v1/avv-codes', { params: { suche: AVV_A.suche } })).json()) as { id: string }[];
  const fotoFelder = Object.fromEntries(fotos.map((feld) => [feld, { name: `${feld}.png`, mimeType: 'image/png', buffer: TEST_PNG }]));
  const antwort = await api.post('/api/v1/wareneintraege', {
    headers: await csrfHeader(api),
    multipart: { avvCodeId: avvCode.id, freitext, ...fotoFelder },
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

test('Detail-Dialog mit Bildergalerie öffnen (Issue #92)', async ({ page }) => {
  await legeEintragAn(page.request, 'E2E Details', ['fotoFern', 'fotoNah']);
  await page.goto('/wareneintraege');
  await sucheFreitext(page, 'E2E Details');
  await expect(page.getByTestId('trefferanzahl')).toHaveText('1 Wareneintrag');
  const dialog = page.getByRole('dialog', { name: `AVV-Code ${AVV_A.code}` });
  const position = dialog.getByTestId('galerie-position');

  // Klick auf das zweite Foto startet dort, ←/→ und Buttons blättern.
  const nahFoto = page.getByRole('button', { name: /^Nahansicht/ });
  await nahFoto.click();
  await expect(position).toHaveText('2 / 2');
  await expect(dialog).toContainText('E2E Details');
  await expect(dialog).toContainText(ERIKA.standort);
  await pruefeBarrierefreiheit(page, 'Detail-Dialog');
  await page.keyboard.press('ArrowLeft');
  await expect(position).toHaveText('1 / 2');
  await dialog.getByRole('button', { name: 'Nächstes Foto' }).click();
  await expect(position).toHaveText('2 / 2');

  // Nach dem Schließen steht der Fokus wieder auf dem auslösenden Foto.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(nahFoto).toBeFocused();

  // Tastatur-Einstieg über den Titel.
  await page.getByTestId('wareneintrag-details').focus();
  await page.keyboard.press('Enter');
  await expect(position).toHaveText('1 / 2');
  await page.keyboard.press('Escape');

  // Bearbeiten öffnet nur den Bearbeiten-Dialog.
  await page.getByTestId('wareneintrag-bearbeiten').click();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(page.getByRole('dialog', { name: 'Wareneintrag bearbeiten' })).toBeVisible();
});

test('KI-Analyse: Vorschau, AVV-Prüfung, verwerfen, speichern, wieder anzeigen (Issues #93 bis #96)', async ({ page }) => {
  // Gemini ist im E2E-Stack der lokale Stub (e2e/gemini-stub.mjs), der
  // Weg durch das Backend inklusive Redis-Vorschau ist echt.
  await legeEintragAn(page.request, 'E2E Analyse', ['fotoFern']);
  await page.goto('/wareneintraege');
  await sucheFreitext(page, 'E2E Analyse');
  await expect(page.getByTestId('trefferanzahl')).toHaveText('1 Wareneintrag');
  const dialog = page.getByRole('dialog', { name: `AVV-Code ${AVV_A.code}` });
  const oeffnen = async () => {
    await page.getByTestId('wareneintrag-details').click();
    await expect(dialog).toBeVisible();
  };
  // Erst schließen lassen, sonst ist der alte Dialog beim Wiederöffnen noch
  // in der Ausblend-Animation und es gibt kurz zwei.
  const schliessen = async () => {
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  };

  // Vorschau, dann ohne Speichern schließen: nichts bleibt.
  await oeffnen();
  await expect(dialog.getByTestId('analysiert-von')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Analysieren' }).click();
  await expect(dialog.getByRole('listitem')).toHaveText([/Mineralischer Bauschutt\s*70 %/, /Holz\s*30 %/, /Gesamt\s*100 %/]);
  await expect(dialog.getByTestId('einschaetzung')).toHaveText('Überwiegend Bauschutt mit etwas Holz.');
  await expect(dialog).toContainText('KI-Schätzung aus den Fotos, keine Messung.');
  // AVV-Prüfung (Issue #95): Vorschlag aus avv_codes, nur Anzeige.
  await expect(dialog.getByTestId('avv-pruefung')).toContainText('AVV-Code passt eher nicht');
  await expect(dialog.getByTestId('avv-vorschlag')).toContainText(`Vorschlag: ${AVV_B.code} – `);
  await expect(dialog.getByTestId('avv-pruefung').getByRole('button')).toHaveCount(0);
  await pruefeBarrierefreiheit(page, 'Detail-Dialog mit KI-Vorschau');
  await schliessen();
  await oeffnen();
  await expect(dialog.getByTestId('einschaetzung')).toHaveCount(0);

  // Wiederholen, speichern, erneut öffnen: gespeicherte Analyse mit Urheber.
  await dialog.getByRole('button', { name: 'Analysieren' }).click();
  await dialog.getByRole('button', { name: 'Wiederholen' }).click();
  await dialog.getByRole('button', { name: 'Speichern' }).click();
  const analysiertVon = dialog.getByTestId('analysiert-von');
  await expect(analysiertVon).toHaveText(/^Analysiert von .+ am \d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}$/);
  await expect(analysiertVon).toContainText(ERIKA.vorname);
  await schliessen();
  await oeffnen();
  await expect(dialog.getByTestId('einschaetzung')).toHaveText('Überwiegend Bauschutt mit etwas Holz.');
  await expect(dialog.getByTestId('analysiert-von')).toBeVisible();
  await expect(dialog.getByTestId('avv-vorschlag')).toContainText(AVV_B.code);
  await schliessen();

  // Issue #96: nur Freitext ändern lässt die Analyse stehen ...
  const bearbeiten = page.getByRole('dialog', { name: 'Wareneintrag bearbeiten' });
  await page.getByTestId('wareneintrag-bearbeiten').click();
  await bearbeiten.getByTestId('bearbeiten-freitext').fill('E2E Analyse geändert');
  await bearbeiten.getByTestId('bearbeiten-speichern').click();
  await expect(bearbeiten).toBeHidden();
  await oeffnen();
  await expect(dialog.getByTestId('analysiert-von')).toBeVisible();
  await schliessen();

  // ... ein ersetztes Foto löscht sie.
  await page.getByTestId('wareneintrag-bearbeiten').click();
  await bearbeiten.getByTestId('bearbeiten-foto-fotoFern').setInputFiles({ name: 'neu.png', mimeType: 'image/png', buffer: TEST_PNG });
  await bearbeiten.getByTestId('bearbeiten-speichern').click();
  await expect(bearbeiten).toBeHidden();
  await oeffnen();
  await expect(dialog.getByTestId('nicht-analysiert')).toHaveText('Noch nicht analysiert.');
  await expect(dialog.getByTestId('analysiert-von')).toHaveCount(0);
  await schliessen();

  // Löschen des Eintrags nimmt die Analyse mit (ON DELETE CASCADE).
  await page.getByTestId('wareneintrag-loeschen').click();
  await page.getByRole('dialog', { name: 'Wareneintrag löschen' }).getByTestId('confirm-dialog-bestaetigen').click();
  await expect(page.getByText('Wareneintrag wurde gelöscht.')).toBeVisible();
});
