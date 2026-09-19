// Bootstrap: legt den ersten Vorgesetzter-Account an, falls noch keiner
// existiert. Ohne "offenen" Registrierungs-Endpunkt (siehe Ticket #2) braucht
// es diesen einmaligen Weg, damit überhaupt jemand sich einloggen und
// weitere Accounts anlegen kann.
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { Rolle } from '../src/generated/prisma/enums.js';
import { assertNichtDefaultBootstrapPasswort } from './seed-initial-vorgesetzter-guard.js';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main(): Promise<void> {
  const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] });
  const prisma = new PrismaClient({ adapter });
  try {
    const bestehenderVorgesetzter = await prisma.nutzer.findFirst({ where: { rolle: Rolle.VORGESETZTER } });
    if (bestehenderVorgesetzter) {
      console.log('Es existiert bereits ein Vorgesetzter-Account, überspringe Bootstrap.');
      return;
    }

    const email = required('INITIAL_VORGESETZTER_EMAIL');
    const passwort = required('INITIAL_VORGESETZTER_PASSWORT');
    assertNichtDefaultBootstrapPasswort(passwort, process.env['NODE_ENV']);
    const standortName = process.env['INITIAL_VORGESETZTER_STANDORT'] ?? 'Hauptsitz';

    const standort = await prisma.standort.findUniqueOrThrow({ where: { name: standortName } });
    const passwortHash = await bcrypt.hash(passwort, 12);

    await prisma.nutzer.create({
      data: {
        vorname: 'Erste',
        nachname: 'Vorgesetzte',
        email,
        rolle: Rolle.VORGESETZTER,
        standortId: standort.id,
        passwortHash,
        mussPasswortSetzen: false,
      },
    });
    console.log(`Initialer Vorgesetzter-Account angelegt: ${email}`);
  } finally {
    await prisma.$disconnect();
  }
}

await main();
