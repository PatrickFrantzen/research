import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuthModule } from '../src/auth/auth.module.js';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard.js';
import { JwtStrategy } from '../src/auth/jwt.strategy.js';
import { PrismaModule } from '../src/prisma/prisma.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { ACCESS_TOKEN_COOKIE } from '../src/auth/auth-cookies.js';

const JWT_SECRET = 'test-secret';
const JWT_ISSUER = 'research-backend';
const JWT_AUDIENCE = 'research-frontend';

// Dummy-Route, um die passport-jwt-Verify-Pipeline (inkl. Issuer-/Audience-
// Prüfung) unabhängig von der Nutzer-/Wareneintrag-Domäne zu testen (Issue #34).
@Controller('dummy')
class DummyController {
  @Get('geschuetzt')
  @UseGuards(JwtAuthGuard)
  geschuetzt() {
    return { ok: true };
  }
}

describe('JWT Issuer/Audience-Prüfung (Issue #34)', () => {
  let app: INestApplication;
  const nutzer = {
    id: 'nutzer-1',
    passwortGeaendertAm: new Date(0),
  };

  beforeAll(async () => {
    process.env['JWT_SECRET'] = JWT_SECRET;
    process.env['JWT_ISSUER'] = JWT_ISSUER;
    process.env['JWT_AUDIENCE'] = JWT_AUDIENCE;
    process.env['DATABASE_URL'] ??= 'postgresql://localhost/test';
    process.env['OBJECT_STORAGE_ENDPOINT'] ??= 'http://localhost:9000';
    process.env['OBJECT_STORAGE_ACCESS_KEY_ID'] ??= 'access';
    process.env['OBJECT_STORAGE_SECRET_ACCESS_KEY'] ??= 'secret';
    process.env['OBJECT_STORAGE_BUCKET'] ??= 'bucket';
    process.env['REDIS_URL'] ??= 'redis://localhost:6379';

    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: JWT_SECRET, signOptions: { algorithm: 'HS256' } }),
      ],
      controllers: [DummyController],
      providers: [JwtStrategy, { provide: PrismaService, useValue: { nutzer: { findUnique: async () => nutzer } } }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  function token(overrides: { issuer?: string; audience?: string } = {}): string {
    return jwt.sign({ sub: nutzer.id }, JWT_SECRET, {
      algorithm: 'HS256',
      issuer: overrides.issuer ?? JWT_ISSUER,
      audience: overrides.audience ?? JWT_AUDIENCE,
    });
  }

  it('rejects a token with an unexpected issuer', async () => {
    const response = await request(app.getHttpServer())
      .get('/dummy/geschuetzt')
      .set('Cookie', `${ACCESS_TOKEN_COOKIE}=${token({ issuer: 'fremder-issuer' })}`);

    expect(response.status).toBe(401);
  });

  it('rejects a token with an unexpected audience', async () => {
    const response = await request(app.getHttpServer())
      .get('/dummy/geschuetzt')
      .set('Cookie', `${ACCESS_TOKEN_COOKIE}=${token({ audience: 'fremde-audience' })}`);

    expect(response.status).toBe(401);
  });

  it('accepts a token with the correct issuer and audience', async () => {
    const response = await request(app.getHttpServer())
      .get('/dummy/geschuetzt')
      .set('Cookie', `${ACCESS_TOKEN_COOKIE}=${token()}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});

// Regressionstest: das reale AuthModule muss die Tokens, die es selbst beim
// Login ausstellt, mit Issuer/Audience versehen – sonst würde die eigene
// JwtStrategy-Prüfung (siehe oben) frisch eingeloggte Nutzer aussperren.
describe('Login über das reale AuthModule stellt vom eigenen JwtStrategy akzeptierte Tokens aus (Issue #34)', () => {
  let app: INestApplication;
  const passwortHash = bcrypt.hashSync('geheim1234567', 4);
  const nutzer = {
    id: 'nutzer-1',
    email: 'chef@research.local',
    passwortHash,
    mussPasswortSetzen: false,
    passwortGeaendertAm: new Date(0),
  };

  beforeAll(async () => {
    process.env['JWT_SECRET'] = JWT_SECRET;
    process.env['JWT_ISSUER'] = JWT_ISSUER;
    process.env['JWT_AUDIENCE'] = JWT_AUDIENCE;

    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, AuthModule],
      controllers: [DummyController],
    })
      .overrideProvider(PrismaService)
      .useValue({ nutzer: { findUnique: async () => nutzer } })
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts the cookie from a freshly issued login token on a protected route', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: nutzer.email, passwort: 'geheim1234567' });
    const cookies = login.headers['set-cookie'] as unknown as string[];

    const response = await request(app.getHttpServer()).get('/dummy/geschuetzt').set('Cookie', cookies);

    expect(response.status).toBe(200);
  });
});
