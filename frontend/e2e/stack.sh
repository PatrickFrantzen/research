#!/usr/bin/env bash
# Startet den deterministischen E2E-Test-Stack (Issue #62): frische
# Datenbank mit Stammdaten und Bootstrap-Nutzer, leerer Rate-Limit-Zähler,
# Foto-Bucket, danach das gebaute Backend, das auch den Frontend-Build
# ausliefert. Wird von playwright.config.ts als webServer gestartet.
#
# Voraussetzungen: Postgres, Redis und MinIO/S3 laufen (Standardwerte siehe
# unten, per E2E_*-Variablen überschreibbar), Backend und Frontend sind
# gebaut (npm run build in beiden Verzeichnissen).
set -euo pipefail
cd "$(dirname "$0")/../../backend"

export NODE_ENV=development
export PORT="${E2E_PORT:-3000}"
# Der Datenbankname muss "e2e" enthalten, sonst bricht e2e-vorbereiten.ts ab.
export DATABASE_URL="${E2E_DATABASE_URL:-postgres://research:research@localhost:5432/research_e2e}"
export REDIS_URL="${E2E_REDIS_URL:-redis://localhost:6379}"
export OBJECT_STORAGE_ENDPOINT="${E2E_OBJECT_STORAGE_ENDPOINT:-http://localhost:9000}"
export OBJECT_STORAGE_ACCESS_KEY_ID="${E2E_OBJECT_STORAGE_ACCESS_KEY_ID:-research}"
export OBJECT_STORAGE_SECRET_ACCESS_KEY="${E2E_OBJECT_STORAGE_SECRET_ACCESS_KEY:-research-secret}"
export OBJECT_STORAGE_BUCKET="${E2E_OBJECT_STORAGE_BUCKET:-research-fotos-e2e}"
export JWT_SECRET=e2e-secret
# Produktiv 5 Logins pro Minute; die Suite meldet mehrere Nutzer an.
export AUTH_THROTTLE_LIMIT=100
# Zugangsdaten wie in e2e/testdaten.ts.
export INITIAL_NUTZER_EMAIL=erika.e2e@example.com
export INITIAL_NUTZER_PASSWORT=e2e-Passwort-Erika-1
export INITIAL_NUTZER_STANDORT=Hauptsitz

npx tsx prisma/e2e-vorbereiten.ts reset
npx prisma migrate deploy
npm run db:seed
npx tsx prisma/e2e-vorbereiten.ts stammdaten
exec node dist/main.js
