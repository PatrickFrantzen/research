# Bekannte, akzeptierte Security-Advisories (Backend)

Stand: 2026-09-19, Prisma 7.10.0. Siehe Issue #35.

`npm audit --omit=dev` meldet 4 High-Advisories über transitive
Prisma-Abhängigkeiten:

- **mysql2 <=3.23.0** (GHSA-3f6p-5ww8-9rcr, GHSA-rgwj-5xj2-c3m3)
- **deepmerge-ts <8.0.0** (GHSA-ggr8-5vv4-36mx), gezogen über `@prisma/config`

## Warum nicht einfach `npm audit fix --force`

Der vorgeschlagene Fix installiert `prisma@6.19.3` – eine **Downgrade**
gegenüber der bewusst gewählten, aktuellen `^7.10.0`. Es existiert aktuell
keine Prisma-7.x-Version, die diese transitiven Pakete aktualisiert; der Fix
würde die App auf eine ältere Major-Version zurückstufen, ohne die
Advisories in der Sache zu beheben.

## Warum das Risiko hier vertretbar ist

- **mysql2**: Diese App nutzt ausschließlich PostgreSQL über
  `@prisma/adapter-pg` (siehe ADR-0001). Der MySQL-Treiber-Code von Prisma
  wird zur Laufzeit nie ausgeführt.
- **deepmerge-ts**: Wird nur von `@prisma/config` beim Einlesen/Mergen der
  Prisma-CLI-Konfiguration verwendet (Build-/Migrationszeit mit
  vertrauenswürdiger, lokaler Konfiguration), nicht im
  Anfrage-Verarbeitungspfad der laufenden Anwendung.

## Nachverfolgung

Bei jedem Prisma-Minor/Patch-Update erneut `npm audit --omit=dev prüfen`;
sobald eine Version ohne diese transitiven Pakete verfügbar ist, aktualisieren
und diese Datei entfernen.
