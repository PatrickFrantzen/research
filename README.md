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
