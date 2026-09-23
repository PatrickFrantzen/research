// Legt die Testdaten über die echte API an (Issue #62) und speichert die
// Sessions von Erika und Max für die Specs. Läuft einmal vor allen Tests auf
// frischer Datenbank (e2e/stack.sh).
import { APIRequestContext, expect, request, test as setup } from '@playwright/test';
import {
  AVV_A,
  AVV_B,
  csrfHeader,
  ERIKA,
  ERIKA_EINTRAEGE,
  MAX,
  MAX_EINTRAEGE,
} from './testdaten.js';

async function login(baseURL: string, email: string, passwort: string): Promise<APIRequestContext> {
  const kontext = await request.newContext({ baseURL });
  const antwort = await kontext.post('/api/v1/auth/login', { data: { email, passwort } });
  expect(antwort.ok(), `Login ${email}`).toBe(true);
  return kontext;
}

async function avvCodeId(api: APIRequestContext, suche: string): Promise<string> {
  const antwort = await api.get('/api/v1/avv-codes', { params: { suche } });
  expect(antwort.ok()).toBe(true);
  const [treffer] = (await antwort.json()) as { id: string }[];
  return treffer.id;
}

async function erstelleEintrag(api: APIRequestContext, avvCodeId: string, freitext: string): Promise<void> {
  const antwort = await api.post('/api/v1/wareneintraege', {
    headers: await csrfHeader(api),
    multipart: { avvCodeId, freitext },
  });
  expect(antwort.status(), `Wareneintrag "${freitext}"`).toBe(201);
}

setup('Testdaten anlegen und Sessions speichern', async ({ baseURL }) => {
  const erika = await login(baseURL!, ERIKA.email, ERIKA.passwort);
  const avvA = await avvCodeId(erika, AVV_A.suche);
  const avvB = await avvCodeId(erika, AVV_B.suche);

  // Max am zweiten Standort anlegen, mit Initialpasswort einloggen und es
  // ersetzen – derselbe Weg wie in der UI (Issue #76).
  const standorte = (await (await erika.get('/api/v1/standorte')).json()) as { id: string; name: string }[];
  const aussenlager = standorte.find((standort) => standort.name === MAX.standort);
  expect(aussenlager, 'Standort aus e2e-vorbereiten.ts').toBeDefined();
  const angelegt = await erika.post('/api/v1/nutzer', {
    headers: await csrfHeader(erika),
    data: {
      vorname: MAX.vorname,
      nachname: MAX.nachname,
      email: MAX.email,
      standortId: aussenlager!.id,
      passwort: MAX.initialpasswort,
    },
  });
  expect(angelegt.status()).toBe(201);

  // Aufsteigend angelegt: die Liste zeigt die neuesten zuerst.
  for (let i = 1; i <= ERIKA_EINTRAEGE; i++) {
    const nummer = String(i).padStart(2, '0');
    const freitext = i % 3 === 0 ? `Erika ${nummer} Palette` : `Erika ${nummer} Karton`;
    await erstelleEintrag(erika, i % 3 === 1 ? avvB : avvA, freitext);
  }

  const max = await login(baseURL!, MAX.email, MAX.initialpasswort);
  const geaendert = await max.post('/api/v1/auth/passwort-aendern', {
    headers: await csrfHeader(max),
    data: { neuesPasswort: MAX.passwort },
  });
  expect(geaendert.status()).toBe(204);
  for (let i = 1; i <= MAX_EINTRAEGE; i++) {
    await erstelleEintrag(max, avvA, `Max ${String(i).padStart(2, '0')} Palette`);
  }

  await erika.storageState({ path: ERIKA.storageState });
  await max.storageState({ path: MAX.storageState });
  await erika.dispose();
  await max.dispose();
});
