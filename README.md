<!--
  Einstiegspunkt für das RESEARCH-Repo. Details zu Planung/Architektur
  liegen in docs/research/.
-->

# RESEARCH

Firmeninterne, reduzierte Version von
[waste-connect-v2](https://github.com/PatrickFrantzen/waste-connect-v2):
Nutzer registrieren Ware mobil (Fotos, AVV-Nummer, Freitext) und
sichten/filtern die Einträge am Desktop.

Eigenständiges Repo, da Architektur und Technik-Stack voraussichtlich von
waste-connect-v2 abweichen (Hosting/Datenbank laufen über die Infrastruktur
des Kunden).

## Planungsstand

1. [Projektbeschreibung & Spezifikation](docs/research/01-projektbeschreibung-spezifikation.md) – abgeschlossen
2. [Infrastruktur & Architektur](docs/research/02-architektur.md) – Entwurf, hosting-agnostisch geplant
3. Code – läuft, siehe GitHub Issues

## Lokale Entwicklung

Einmalig `.env.example` im Repo-Root als `.env` kopieren und `JWT_SECRET`
sowie den Initial-Zugang für den ersten Nutzer-Account setzen
(ohne `.env` greifen unsichere Platzhalter-Defaults – nur für Wegwerf-Setups
okay).

```
docker compose up
```

Startet App-Container (NestJS-API + ausgelieferter Angular-Build), PostgreSQL
und MinIO, spielt Migrationen + Stammdaten-Seed ein (fester Standort
"Hauptsitz", ein initialer Nutzer-Account). Danach:

- App: http://localhost:3000
- Health-Check: http://localhost:3000/api/v1/health
- MinIO-Console: http://localhost:9001
- Login mit `INITIAL_NUTZER_EMAIL` / `INITIAL_NUTZER_PASSWORT`
  aus der `.env`

Weitere Accounts (Issue #76, noch ohne Mailversand, siehe #63): Jeder
eingeloggte Nutzer legt unter „Nutzer“ Kollegen mit E-Mail, Name, Standort und
**Initialpasswort** an und gibt die Zugangsdaten persönlich weiter. Beim
ersten Login ist ein eigenes Passwort Pflicht, das Backend lehnt bis dahin
alle anderen Endpunkte ab. Hat jemand sein Passwort vergessen, vergibt ein
Kollege unter „Nutzer“ ein neues Initialpasswort. „Passwort vergessen“ ist
bis zur Mail-Anbindung ausgeblendet.

Für Backend-Entwicklung ohne Container siehe `backend/.env.example`
(Datenbank/Objektspeicher/Auth-Zugangsdaten für `npm run start:dev`,
`npx prisma migrate dev`, `npm run db:seed`).

### Hot Reload statt Container-Neustart

Nur die Infrastruktur (Postgres/MinIO/Redis) läuft im Container, App läuft
nativ mit Watch-Modus:

```
docker compose up postgres minio minio-init redis migrate
cd backend && npm run start:dev   # nest --watch, reagiert auf Code-Änderungen
cd frontend && npm start          # ng serve mit Proxy auf localhost:3000/api
```

Frontend erreichbar unter http://localhost:4200, Backend weiter unter
http://localhost:3000. `frontend/proxy.conf.json` leitet `/api`-Requests an
den Nest-Server weiter, damit Cookies/Same-Origin-Verhalten wie im
Produktiv-Setup funktionieren.

## Qualitätschecks

Dieselben Befehle laufen als CI-Gate bei jedem Pull Request und Push auf
`main` (`.github/workflows/ci.yml`):

```
cd frontend && npm run lint && npm test -- --watch=false --browsers=ChromeHeadlessNoSandbox && npm run build
cd backend && npm run lint && npm run typecheck && npm test && npm run build
```

- Frontend-Lint: ESLint mit `angular-eslint` für TypeScript und Templates
  inklusive Barrierefreiheitsregeln, ohne Warnungs-Baseline
  (`--max-warnings 0`).
- Backend: `npm ci --legacy-peer-deps` (wie im Dockerfile) und
  `npx prisma generate` vor Test/Build.
- Backend-Typecheck: `npm run typecheck` (`tsc --noEmit -p tsconfig.json`)
  prüft `src/` **und** `test/` inklusive aller Specs. `nest build` schließt
  Specs aus und Vitest prüft keine Typen, ohne diesen Schritt veralten die
  E2E-Specs unbemerkt.

Bundle-Budget (`frontend/angular.json`, Issue #73): Das Initial-Bundle liegt
bei ~391 kB raw (~104 kB Transfer, Stand September 2026). Die Warnung greift
bei 430 kB (~10 % Luft), damit Wachstum auffällt, der Build bricht bei
500 kB. Das Initial-Bundle enthält nur Angular-Kern, Router, zone.js und den
Service Worker; Material, CDK-Overlay und Forms gehören in die Lazy-Chunks.
Deshalb Material-Provider (z. B. `MatPaginatorIntl`) nicht global in
`app.config.ts` registrieren, sondern in der Komponente, die sie braucht.
Aufschlüsseln mit `npx ng build --stats-json` und der esbuild-Metafile
(`dist/frontend/stats.json`, z. B. im esbuild Bundle Size Analyzer).

### E2E- und Barrierefreiheitstests (Playwright + AXE)

Kritische Nutzerflüsse (Issue #62) und das AXE-Gate (Issue #54) laufen mit
Playwright gegen den **echten Stack**: Das gebaute Backend liefert den
Frontend-Build aus, dahinter liegen Postgres, Redis und MinIO. Vor jedem Lauf
setzt `frontend/e2e/stack.sh` die Datenbank zurück, spielt Migrationen und
Stammdaten ein, leert den Rate-Limit-Zähler und legt den Foto-Bucket an.
`e2e/testdaten.setup.ts` erzeugt die Testdaten über die API (zweiter Nutzer
am Standort „Außenlager“, 26 Wareneinträge).

```
# einmalig: Dienste für den Test-Stack (Werte = Standardwerte in stack.sh)
docker run -d --name e2e-postgres -p 5432:5432 -e POSTGRES_USER=research \
  -e POSTGRES_PASSWORD=research -e POSTGRES_DB=research_e2e postgres:16-alpine
docker run -d --name e2e-redis -p 6379:6379 redis:8.8.2-alpine
docker run -d --name e2e-minio -p 9000:9000 -e MINIO_ROOT_USER=research \
  -e MINIO_ROOT_PASSWORD=research-secret quay.io/minio/minio server /data
npx playwright install chromium   # im Verzeichnis frontend

cd backend && npm run build && cd ../frontend && npm run build && npm run e2e
```

- Abweichende Dienste per `E2E_DATABASE_URL`, `E2E_REDIS_URL`,
  `E2E_OBJECT_STORAGE_*` und `E2E_PORT`. Der Datenbankname muss „e2e“
  enthalten, sonst bricht das Zurücksetzen ab (Schutz vor Datenverlust).
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE` nutzt ein vorhandenes Chromium statt der
  Playwright-Browser.
- Seriell und ohne Retries, weil alle Tests eine Datenbank teilen. Neue
  Tests verwenden nach Möglichkeit die gespeicherten Sessions (`storageState`).
- Login ist produktiv auf 5 Versuche pro Minute begrenzt. Nur der Test-Stack
  hebt das über `AUTH_THROTTLE_LIMIT` an, produktiv bleibt die Variable
  ungesetzt.
- Der Service Worker ist in den Tests blockiert.
- AXE prüft WCAG 2.2 A/AA plus Best-Practices auf allen Seiten in Hell und
  Dunkel, mobil und am Desktop, dazu Fehlerzustände und Dialoge. Jeder Verstoß
  lässt den Test fehlschlagen. AXE ersetzt keinen manuellen Test mit
  Screenreader.
- 403-Pfad: Die UI zeigt für fremde Einträge keinen Lösch-Button. Der Test
  leitet deshalb den eigenen Lösch-Request per `page.route()` auf einen
  fremden Eintrag um; die 403-Antwort kommt vom echten Backend.
- Bei Fehlern lädt die CI Report, Traces und Screenshots als Artefakt
  `playwright-report` hoch.

Architekturregeln, die (noch) kein Linter prüft und daher im Review gelten:
Feature-Komponenten greifen nicht direkt auf `HttpClient` zu, sondern über
die API-Services in `frontend/src/app/core/`; `setTimeout` in Komponenten nur
lebenszyklussicher (z. B. `timer()` mit `takeUntilDestroyed()`).
