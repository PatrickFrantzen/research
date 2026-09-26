// Bootstrap: legt den ersten Nutzer-Account an, falls noch keiner
// existiert. Ohne "offenen" Registrierungs-Endpunkt (siehe Ticket #2) braucht
// es diesen einmaligen Weg, damit überhaupt jemand sich einloggen und
// weitere Accounts anlegen kann.
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { assertNichtDefaultBootstrapPasswort } from './seed-initial-nutzer-guard.js';

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
    const bestehenderNutzer = await prisma.nutzer.findFirst();
    if (bestehenderNutzer) {
      console.log('Es existiert bereits ein Nutzer-Account, überspringe Bootstrap.');
      return;
    }

    const email = required('INITIAL_NUTZER_EMAIL').trim().toLowerCase();
    const passwort = required('INITIAL_NUTZER_PASSWORT');
    assertNichtDefaultBootstrapPasswort(passwort, process.env['NODE_ENV']);
    const standortName = process.env['INITIAL_NUTZER_STANDORT'] ?? 'Hauptsitz';

    const standort = await prisma.standort.findUniqueOrThrow({ where: { name: standortName } });
    const passwortHash = await bcrypt.hash(passwort, 12);

    await prisma.nutzer.create({
      data: {
        vorname: 'Erster',
        nachname: 'Nutzer',
        email,
        standortId: standort.id,
        passwortHash,
        mussPasswortSetzen: false,
        istAdmin: true,
      },
    });
    console.log(`Initialer Nutzer-Account angelegt: ${email}`);
  } finally {
    await prisma.$disconnect();
  }
}

await main();
