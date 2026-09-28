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
cd frontend && npm run lint && npm run format:check && npm test -- --watch=false --browsers=ChromeHeadlessNoSandbox && npm run build
cd backend && npm run lint && npm run format:check && npm run typecheck && npm test && npm run build
```

- Frontend-Lint: ESLint mit `angular-eslint` für TypeScript und Templates
  inklusive Barrierefreiheitsregeln, ohne Warnungs-Baseline
  (`--max-warnings 0`).
- Formatierung: Prettier, `npm run format:check` in beiden Paketen,
  `npm run format` behebt Abweichungen. Konfiguration getrennt pro Paket
  (Backend `.prettierrc`, Frontend `package.json`).
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
# Dienste starten (Images und Werte wie in der CI, docker-compose.e2e.yml)
docker compose -f docker-compose.e2e.yml up -d --wait

# einmalig im Verzeichnis frontend
npx playwright install chromium

cd backend && npm run build && cd ../frontend && npm run build && npm run e2e

# danach Dienste wieder entfernen
docker compose -f docker-compose.e2e.yml down
```

- Voraussetzung: laufendes Docker (unter Windows Docker Desktop). Die Ports
  5432, 6379 und 9000 müssen frei sein, also vorher das Entwicklungs-Setup
  (`docker-compose.yml`) stoppen.
- `stack.sh` ist ein Bash-Skript, Playwright startet es selbst. Unter Windows
  daher aus Git Bash oder WSL starten, nicht aus PowerShell/cmd.
- Bricht ein Lauf ab, kann der Gemini-Stub auf Port 4010 weiterlaufen; der
  nächste Lauf nutzt ihn dann still weiter. Bei Problemen den Node-Prozess
  auf Port 4010 beenden.
- Abweichende Dienste per `E2E_DATABASE_URL`, `E2E_REDIS_URL`,
  `E2E_OBJECT_STORAGE_*` und `E2E_PORT`. Der Datenbankname muss „e2e“
  enthalten, sonst bricht das Zurücksetzen ab (Schutz vor Datenverlust).
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE` nutzt ein vorhandenes Chromium statt der
  Playwright-Browser.
- Seriell und ohne Retries: Login ist auf 5 Versuche pro Minute begrenzt, das
  Setup nutzt zwei davon, die Login-Spec zwei weitere. Neue Tests verwenden
  die gespeicherten Sessions (`storageState`) statt sich neu anzumelden.
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
