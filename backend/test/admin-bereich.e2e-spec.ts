import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
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

// Admin-Bereich: nur Nutzer mit istAdmin sehen die Nutzerliste, legen Nutzer
// an und lösen Passwort-Mails aus. istAdmin kommt aus der DB, nicht aus dem JWT.
describe('Admin-Bereich', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const csrf = 'csrf-wert';

  const nutzer = [
    {
      id: 'admin-1',
      vorname: 'Patrick',
      nachname: 'Admin',
      email: 'admin@research.local',
      standort: { name: 'Hauptsitz' },
      istAdmin: true,
      mussPasswortSetzen: false,
      erstelltAm: new Date('2026-09-25T00:00:00Z'),
      passwortGeaendertAm: new Date(0),
    },
    {
      id: 'nutzer-2',
      vorname: 'Thomas',
      nachname: 'Test',
      email: 'thomas@research.local',
      standort: { name: 'Hauptsitz' },
      istAdmin: false,
      mussPasswortSetzen: true,
      erstelltAm: new Date('2026-09-26T00:00:00Z'),
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

    const prisma = {
      nutzer: {
        findUnique: async ({ where }: { where: { id: string } }) => nutzer.find((n) => n.id === where.id) ?? null,
        findMany: async () => nutzer,
        create: async ({ data }: { data: Record<string, unknown> }) => ({ id: 'neu-1', ...data }),
        update: async () => undefined,
      },
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
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
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    jwt = moduleRef.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  async function cookiesFuer(id: string): Promise<string[]> {
    const token = await jwt.signAsync({ sub: id });
    return [`accessToken=${token}`, `csrfToken=${csrf}`];
  }

  const neuerNutzer = {
    vorname: 'Neu',
    nachname: 'Nutzer',
    email: 'neu@research.local',
    standortId: '5b1e0a8e-7a4c-4a39-9d3e-2f1c7f0b6b11',
  };

  it('GET /auth/me verrät dem Frontend, ob der Nutzer Admin ist', async () => {
    const admin = await request(app.getHttpServer()).get('/api/v1/auth/me').set('Cookie', await cookiesFuer('admin-1'));
    const normal = await request(app.getHttpServer()).get('/api/v1/auth/me').set('Cookie', await cookiesFuer('nutzer-2'));

    expect(admin.body).toEqual({ id: 'admin-1', istAdmin: true });
    expect(normal.body).toEqual({ id: 'nutzer-2', istAdmin: false });
  });

  it('Admin sieht alle Nutzer ohne Passwort- oder Token-Felder', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/nutzer').set('Cookie', await cookiesFuer('admin-1'));

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: 'admin-1',
        vorname: 'Patrick',
        nachname: 'Admin',
        email: 'admin@research.local',
        standort: 'Hauptsitz',
        istAdmin: true,
        einladungOffen: false,
        erstelltAm: '2026-09-25T00:00:00.000Z',
      },
      {
        id: 'nutzer-2',
        vorname: 'Thomas',
        nachname: 'Test',
        email: 'thomas@research.local',
        standort: 'Hauptsitz',
        istAdmin: false,
        einladungOffen: true,
        erstelltAm: '2026-09-26T00:00:00.000Z',
      },
    ]);
  });

  it('Nicht-Admin bekommt 403 auf Nutzerliste, Nutzer anlegen und Passwort-Mail', async () => {
    const cookies = await cookiesFuer('nutzer-2');
    const server = app.getHttpServer();

    const liste = await request(server).get('/api/v1/nutzer').set('Cookie', cookies);
    const anlegen = await request(server)
      .post('/api/v1/nutzer')
      .set('Cookie', cookies)
      .set('x-csrf-token', csrf)
      .send(neuerNutzer);
    const mail = await request(server)
      .post('/api/v1/nutzer/admin-1/passwort-link')
      .set('Cookie', cookies)
      .set('x-csrf-token', csrf);

    expect([liste.status, anlegen.status, mail.status]).toEqual([403, 403, 403]);
  });

  it('Admin darf Nutzer anlegen und Passwort-Mails auslösen', async () => {
    const cookies = await cookiesFuer('admin-1');
    const server = app.getHttpServer();

    const anlegen = await request(server)
      .post('/api/v1/nutzer')
      .set('Cookie', cookies)
      .set('x-csrf-token', csrf)
      .send(neuerNutzer);
    const mail = await request(server)
      .post('/api/v1/nutzer/nutzer-2/passwort-link')
      .set('Cookie', cookies)
      .set('x-csrf-token', csrf);
    const unbekannt = await request(server)
      .post('/api/v1/nutzer/gibt-es-nicht/passwort-link')
      .set('Cookie', cookies)
      .set('x-csrf-token', csrf);

    expect(anlegen.status).toBe(201);
    expect(mail.status).toBe(204);
    expect(unbekannt.status).toBe(404);
  });
});
