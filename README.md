<!--
  Einstiegspunkt für das RESEARCH-Repo. Details zu Planung/Architektur
  liegen in docs/research/.
-->

# RESEARCH

Firmeninterne, reduzierte Version von
[waste-connect-v2](https://github.com/PatrickFrantzen/waste-connect-v2):
Mitarbeiter registrieren Ware mobil (Foto, AVV-Nummer, Freitext),
Vorgesetzte sichten/filtern/bearbeiten die Einträge am Desktop.

Eigenständiges Repo, da Architektur und Technik-Stack voraussichtlich von
waste-connect-v2 abweichen (Hosting/Datenbank laufen über die Infrastruktur
des Kunden).

## Planungsstand

1. [Projektbeschreibung & Spezifikation](docs/research/01-projektbeschreibung-spezifikation.md) – abgeschlossen
2. [Infrastruktur & Architektur](docs/research/02-architektur.md) – Entwurf, hosting-agnostisch geplant
3. Code – läuft, siehe GitHub Issues

## Lokale Entwicklung

```
docker compose up
```

Startet App-Container (NestJS-API + ausgelieferter Angular-Build), PostgreSQL
und MinIO. Danach:

- App: http://localhost:3000
- Health-Check: http://localhost:3000/api/v1/health
- MinIO-Console: http://localhost:9001

Für Backend-Entwicklung ohne Container siehe `backend/.env.example`
(Datenbank/Objektspeicher-Zugangsdaten für `npm run start:dev`).
