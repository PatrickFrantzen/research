// Vorbereitung des lokalen E2E-Test-Stacks (Issue #62), aufgerufen von
// frontend/e2e/stack.sh – nie gegen produktive Daten:
//   reset       leert die Datenbank (Schema public) vor den Migrationen
//   stammdaten  zweiter Standort (für Standort-Filter), Redis-Zähler des
//               Rate-Limits leeren, Foto-Bucket anlegen
// Schutz: läuft nur, wenn der Datenbankname "e2e" enthält.
import { CreateBucketCommand, HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaPg } from '@prisma/adapter-pg';
import { Redis } from 'ioredis';
import pg from 'pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

// Muss zu frontend/e2e/testdaten.ts passen.
const ZWEITER_STANDORT = 'Außenlager';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function pruefeE2eDatenbank(databaseUrl: string): void {
  const name = new URL(databaseUrl).pathname.slice(1);
  if (!name.includes('e2e')) {
    throw new Error(`Abbruch: Datenbank "${name}" ist keine E2E-Datenbank (Name muss "e2e" enthalten).`);
  }
}

async function reset(databaseUrl: string): Promise<void> {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
  } finally {
    await client.end();
  }
}

async function stammdaten(databaseUrl: string): Promise<void> {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  try {
    await prisma.standort.upsert({ where: { name: ZWEITER_STANDORT }, update: {}, create: { name: ZWEITER_STANDORT } });
  } finally {
    await prisma.$disconnect();
  }

  // Login ist auf 5 Versuche pro Minute und IP begrenzt, Zähler aus einem
  // vorherigen Lauf würden sonst nachwirken.
  const redis = new Redis(required('REDIS_URL'));
  try {
    await redis.flushdb();
  } finally {
    await redis.quit();
  }

  const s3 = new S3Client({
    endpoint: required('OBJECT_STORAGE_ENDPOINT'),
    region: process.env['OBJECT_STORAGE_REGION'] ?? 'us-east-1',
    credentials: {
      accessKeyId: required('OBJECT_STORAGE_ACCESS_KEY_ID'),
      secretAccessKey: required('OBJECT_STORAGE_SECRET_ACCESS_KEY'),
    },
    forcePathStyle: true,
  });
  const Bucket = required('OBJECT_STORAGE_BUCKET');
  try {
    await s3.send(new HeadBucketCommand({ Bucket }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket }));
  }
}

const databaseUrl = required('DATABASE_URL');
pruefeE2eDatenbank(databaseUrl);

const modus = process.argv[2];
if (modus === 'reset') {
  await reset(databaseUrl);
} else if (modus === 'stammdaten') {
  await stammdaten(databaseUrl);
} else {
  throw new Error('Aufruf: tsx prisma/e2e-vorbereiten.ts reset|stammdaten');
}
