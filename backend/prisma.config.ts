// Lädt DATABASE_URL aus backend/.env für die Prisma-CLI (migrate/generate/studio).
// Die Laufzeit-Konfiguration der App selbst liest weiterhin direkt aus
// process.env (siehe src/config/env.ts), unabhängig von dieser Datei.
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
