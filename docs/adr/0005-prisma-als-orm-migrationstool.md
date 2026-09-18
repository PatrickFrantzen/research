---
status: accepted
---

# Prisma als ORM & Migrationstool

Die Architektur-Doku (Phase 2) legt PostgreSQL als Datenbank fest, lässt aber
offen, mit welchem Tool Schema/Migrationen/Zugriff in NestJS umgesetzt
werden. Für Phase 3 fällt die Wahl auf **Prisma**:

- Migrations-CLI (`prisma migrate`) deckt die in der Architektur geforderten
  Strukturen ab, inkl. generierter `tsvector`-Spalte + GIN-Index für die
  Freitext-Volltextsuche (Abschnitt 4.2) über eine SQL-Migration
- Typsicherer generierter Client passt zum bestehenden TypeScript-Stack
- Einfaches Seeding für die festen Stammdaten (Standorte, AVV-Codes)

## Consequences

- `backend/prisma/schema.prisma` ist die Quelle der Wahrheit fürs
  DB-Schema, nicht Entity-Klassen wie bei TypeORM
- Migrationen liegen versioniert unter `backend/prisma/migrations/`
