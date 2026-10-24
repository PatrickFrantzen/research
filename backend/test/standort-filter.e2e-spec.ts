import { INestApplication } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { JwtStrategy } from '../src/auth/jwt.strategy.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { StandortController } from '../src/standort/standort.controller.js';

// Läuft gegen eine echte Postgres-DB (DATABASE_URL), nicht gegen die
// Produktiv-DB: der Test legt Daten an und räumt sie wieder weg.
describe('Standort-Filter der Eintragsliste', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookies: string[];

  beforeAll(async () => {
    process.env['JWT_SECRET'] = 'test-secret';
    process.env['JWT_ISSUER'] = 'test-issuer';
    process.env['JWT_AUDIENCE'] = 'test-audience';
    process.env['OBJECT_STORAGE_ENDPOINT'] ??= 'http://localhost:9000';
    process.env['OBJECT_STORAGE_ACCESS_KEY_ID'] ??= 'access';
    process.env['OBJECT_STORAGE_SECRET_ACCESS_KEY'] ??= 'secret';
    process.env['OBJECT_STORAGE_BUCKET'] ??= 'bucket';
    process.env['REDIS_URL'] ??= 'redis://localhost:6379';

    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: 'test-secret',
          signOptions: {
            algorithm: 'HS256',
            issuer: 'test-issuer',
            audience: 'test-audience',
          },
        }),
      ],
      controllers: [StandortController],
      providers: [JwtStrategy, PrismaService],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    await app.init();
    prisma = moduleRef.get(PrismaService);

    const mitEintrag = await prisma.standort.create({
      data: { name: 'Test Mit Eintrag' },
    });
    await prisma.standort.create({ data: { name: 'Test Ohne Eintrag' } });
    const nutzer = await prisma.nutzer.create({
      data: {
        vorname: 'Test',
        nachname: 'Nutzer',
        email: 'standort-filter@research.local',
        passwortHash: 'x',
        standortId: mitEintrag.id,
      },
    });
    const avv = await prisma.avvCode.create({
      data: { code: 'TEST-01', bezeichnung: 'Test', gefaehrlich: false },
    });
    await prisma.wareneintrag.create({
      data: {
        freitext: 'Test',
        avvCodeId: avv.id,
        erfasstVonId: nutzer.id,
        standortId: mitEintrag.id,
      },
    });

    const token = await moduleRef.get(JwtService).signAsync({ sub: nutzer.id });
    cookies = [`accessToken=${token}`, 'csrfToken=csrf-wert'];
  });

  afterAll(async () => {
    await prisma.wareneintrag.deleteMany();
    await prisma.avvCode.deleteMany();
    await prisma.nutzer.deleteMany();
    await prisma.standort.deleteMany();
    await app.close();
  });

  const namen = async (query: string) => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/standorte${query}`)
      .set('Cookie', cookies)
      .expect(200);
    return (res.body as { name: string }[]).map((s) => s.name);
  };

  it('nurMitEintraegen=true liefert nur Standorte mit Eintrag', async () => {
    expect(await namen('?nurMitEintraegen=true')).toEqual(['Test Mit Eintrag']);
  });

  it('ohne Parameter bleibt die volle Liste', async () => {
    expect(await namen('')).toEqual(['Test Mit Eintrag', 'Test Ohne Eintrag']);
  });
});
