// Seed für die AVV-Stammdaten (Architektur Abschnitt 4.3, data/avv/README.md).
//
// Nur die Ebene `codes` wird importiert – das ist die Ebene, aus der
// Mitarbeiter beim Erfassen eines Wareneintrags auswählen (Spezifikation
// Abschnitt 3.1). `kapitel`/`gruppen` liegen in data/avv/avv-liste.json bei,
// werden hier aber nicht benötigt.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

interface AvvCodeEintrag {
  code: string;
  bezeichnung: string;
  gefaehrlich: boolean;
}

const avvListePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../data/avv/avv-liste.json',
);

async function main(): Promise<void> {
  const { codes } = JSON.parse(readFileSync(avvListePath, 'utf-8')) as { codes: AvvCodeEintrag[] };

  const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] });
  const prisma = new PrismaClient({ adapter });
  try {
    for (const { code, bezeichnung, gefaehrlich } of codes) {
      await prisma.avvCode.upsert({
        where: { code },
        update: { bezeichnung, gefaehrlich },
        create: { code, bezeichnung, gefaehrlich },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

await main();
