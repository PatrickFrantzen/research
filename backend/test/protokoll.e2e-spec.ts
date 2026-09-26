import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Global, INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuthController } from '../src/auth/auth.controller.js';
import { AuthService } from '../src/auth/auth.service.js';
import { JwtStrategy } from '../src/auth/jwt.strategy.js';
import { Mailer } from '../src/mailer/mailer.js';
import { NutzerController } from '../src/nutzer/nutzer.controller.js';
import { NutzerService } from '../src/nutzer/nutzer.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { Protokoll } from '../src/protokoll/protokoll.js';
import { ProtokollModule } from '../src/protokoll/protokoll.module.js';

// Wie im AuthModule: Passport global, damit JwtAuthGuard auch im
// ProtokollModule auflösbar ist.
const passportModule = PassportModule.register({ defaultStrategy: 'jwt' });
@Global()
@Module({ imports: [passportModule], exports: [passportModule] })
class PassportGlobal {}

// Jede Änderung mit fachlicher Bedeutung landet im Aktivitäts-Log, jeder
// Fehler (4xx/5xx) im Fehler-Log. Admins lesen beide über die API (ADR-0007).
describe('Protokoll', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let verzeichnis: string;
  let protokoll: Protokoll;
  const csrf = 'csrf-wert';
  const heute = '2026-09-26';

  const nutzer = [
    {
      id: 'admin-1',
      email: 'admin@research.local',
      istAdmin: true,
      mussPasswortSetzen: false,
      passwortHash: bcrypt.hashSync('richtiges-passwort', 4),
      passwortGeaendertAm: new Date(0),
    },
    {
      id: 'nutzer-2',
      email: 'thomas@research.local',
      istAdmin: false,
      mussPasswortSetzen: false,
      passwortHash: bcrypt.hashSync('richtiges-passwort', 4),
      passwortGeaendertAm: new Date(0),
    },
  ];

  beforeAll(async () => {
    process.env['JWT_SECRET'] = 'test-secret';
    process.env['JWT_ISSUER'] = 'test-issuer';
    process.env['JWT_AUDIENCE'] = 'test-audience';
    process.env['DATABASE_URL'] ??= 'postgresql://localhost/test';
    process.env['OBJECT_STORAGE_ENDPOINT'] ??= 'http://localhost:9000';
    process.env['OBJECT_STORAGE_ACCESS_KEY_ID'] ??= 'access';
    process.env['OBJECT_STORAGE_SECRET_ACCESS_KEY'] ??= 'secret';
    process.env['OBJECT_STORAGE_BUCKET'] ??= 'bucket';
    process.env['REDIS_URL'] ??= 'redis://localhost:6379';

    verzeichnis = mkdtempSync(path.join(tmpdir(), 'protokoll-e2e-'));
    protokoll = new Protokoll(verzeichnis, () => new Date(`${heute}T10:00:00Z`));

    const prisma = {
      nutzer: {
        findUnique: async ({ where }: { where: { id?: string; email?: string } }) =>
          nutzer.find((n) => n.id === where.id || n.email === where.email) ?? null,
        findMany: async () => [],
        create: async ({ data }: { data: Record<string, unknown> }) => ({ id: 'neu-1', ...data }),
        update: async () => undefined,
      },
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        ProtokollModule,
        PassportGlobal,
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { algorithm: 'HS256', issuer: 'test-issuer', audience: 'test-audience' },
        }),
      ],
      controllers: [AuthController, NutzerController],
      providers: [
        AuthService,
        NutzerService,
        JwtStrategy,
        { provide: PrismaService, useValue: prisma },
        {
          provide: Mailer,
          useValue: { sendPasswortSetzenLink: async () => undefined, sendEinladung: async () => undefined },
        },
      ],
    })
      .overrideProvider(Protokoll)
      .useValue(protokoll)
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    jwt = moduleRef.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
    rmSync(verzeichnis, { recursive: true, force: true });
  });

  async function cookiesFuer(id: string): Promise<string[]> {
    return [`accessToken=${await jwt.signAsync({ sub: id })}`, `csrfToken=${csrf}`];
  }

  function log(art: 'aktivitaet' | 'fehler'): string {
    return protokoll.lese(art, heute) ?? '';
  }

  it('schreibt "Nutzer angelegt" mit Admin und neuer ID ins Aktivitäts-Log, Lesezugriffe nicht', async () => {
    const cookies = await cookiesFuer('admin-1');

    await request(app.getHttpServer())
      .post('/api/v1/nutzer')
      .set('Cookie', cookies)
      .set('x-csrf-token', csrf)
      .send({ vorname: 'Neu', nachname: 'N', email: 'neu@research.local', standortId: '5b1e0a8e-7a4c-4a39-9d3e-2f1c7f0b6b11' })
      .expect(201);
    await request(app.getHttpServer()).get('/api/v1/nutzer').set('Cookie', cookies).expect(200);

    expect(log('aktivitaet')).toContain('| admin@research.local | Nutzer angelegt | neu-1');
    expect(log('aktivitaet')).not.toContain('GET');
  });

  it('schreibt verweigerten Zugriff mit Status, Pfad, Nutzer und Grund ins Fehler-Log', async () => {
    await request(app.getHttpServer()).get('/api/v1/nutzer').set('Cookie', await cookiesFuer('nutzer-2')).expect(403);

    expect(log('fehler')).toContain('| 403 | GET /api/v1/nutzer | thomas@research.local | Nur für Admins.');
  });

  it('lässt den erwarteten 401 beim App-Start ohne Login (/auth/me) aus dem Fehler-Log', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);

    expect(log('fehler')).not.toContain('/auth/me');
  });

  it('schreibt Validierungsfehler mit der konkreten Meldung ins Fehler-Log', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/nutzer')
      .set('Cookie', await cookiesFuer('admin-1'))
      .set('x-csrf-token', csrf)
      .send({ vorname: 'Neu', nachname: 'N', email: 'keine-mail', standortId: '5b1e0a8e-7a4c-4a39-9d3e-2f1c7f0b6b11' })
      .expect(400);

    expect(log('fehler')).toMatch(/\| 400 \| POST \/api\/v1\/nutzer \| admin@research\.local \| .*email must be an email/);
  });

  it('protokolliert fehlgeschlagene Logins mit versuchter E-Mail und IP, nie mit Passwort', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'thomas@research.local', passwort: 'falsches-geheimnis' })
      .expect(401);

    const zeile = log('fehler').split('\n').find((z) => z.includes('/auth/login'))!;
    expect(zeile).toContain('| 401 | POST /api/v1/auth/login | versucht: thomas@research.local |');
    expect(zeile).toMatch(/IP \S+/);
    expect(log('fehler')).not.toContain('falsches-geheimnis');
  });

  it('nimmt Fehlermeldungen der App von eingeloggten Nutzern an', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/protokoll/app-fehler')
      .send({ meldung: 'Foto abgelehnt', seite: '/wareneintrag-erfassen' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/protokoll/app-fehler')
      .set('Cookie', await cookiesFuer('nutzer-2'))
      .set('x-csrf-token', csrf)
      .send({ meldung: 'Foto zu groß (12 MB)', seite: '/wareneintrag-erfassen' })
      .expect(204);

    expect(log('fehler')).toContain('| App | /wareneintrag-erfassen | thomas@research.local | Foto zu groß (12 MB)');
  });

  it('lässt nur Admins die Tage und Logdateien lesen und prüft Art und Datum', async () => {
    const admin = await cookiesFuer('admin-1');
    const server = app.getHttpServer();

    const tage = await request(server).get('/api/v1/protokoll').set('Cookie', admin);
    const datei = await request(server).get(`/api/v1/protokoll/fehler/${heute}`).set('Cookie', admin);
    const leer = await request(server).get('/api/v1/protokoll/fehler/2020-01-01').set('Cookie', admin);
    const falscheArt = await request(server).get(`/api/v1/protokoll/passwoerter/${heute}`).set('Cookie', admin);
    const falschesDatum = await request(server).get('/api/v1/protokoll/fehler/..%2F..%2Fetc').set('Cookie', admin);
    const nichtAdmin = await request(server).get(`/api/v1/protokoll/fehler/${heute}`).set('Cookie', await cookiesFuer('nutzer-2'));

    expect(tage.body).toEqual({ tage: [heute] });
    expect(datei.status).toBe(200);
    expect(datei.headers['content-type']).toContain('text/plain');
    expect(datei.text).toContain('| 403 | GET /api/v1/nutzer |');
    expect(leer.text).toBe('');
    expect([falscheArt.status, falschesDatum.status, nichtAdmin.status]).toEqual([400, 400, 403]);
  });
});
