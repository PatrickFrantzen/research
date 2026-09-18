// Seed für die festen Standort-Stammdaten (Architektur Abschnitt 4.3).
//
// Platzhalter-Liste: die tatsächlichen Firmenstandorte des Kunden sind noch
// nicht bekannt (siehe docs/research/02-architektur.md Abschnitt 8). Vor dem
// Produktiv-Einsatz durch die echte Standortliste ersetzen.
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const STANDORTE = ['Hauptsitz'];

async function main(): Promise<void> {
  const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] });
  const prisma = new PrismaClient({ adapter });
  try {
    for (const name of STANDORTE) {
      await prisma.standort.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

await main();
