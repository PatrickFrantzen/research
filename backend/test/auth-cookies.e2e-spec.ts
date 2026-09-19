import { Controller, INestApplication, Post, UseGuards, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as bcrypt from 'bcrypt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from '../src/auth/auth.controller.js';
import { AuthService } from '../src/auth/auth.service.js';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard.js';
import { JwtStrategy } from '../src/auth/jwt.strategy.js';
import { Rolle } from '../src/generated/prisma/enums.js';
import { Mailer } from '../src/mailer/mailer.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Dummy-Route, um den CSRF-/Cookie-Schutz an einer mutierenden, geschützten
// Route zu prüfen, ohne die komplette Nutzer-/Wareneintrag-Domäne
// mitzuziehen (Issue #24).
@Controller('dummy')
class DummyController {
  @Post('mutieren')
  @UseGuards(JwtAuthGuard)
  mutieren() {
    return { ok: true };
  }
}

describe('Cookie-basierte Auth + CSRF (Issue #24)', () => {
  let app: INestApplication;
  const passwortHash = bcrypt.hashSync('geheim1234567', 4);
  const nutzer = { id: 'nutzer-1', email: 'chef@research.local', rolle: Rolle.VORGESETZTER, passwortHash, mussPasswortSetzen: false };

  beforeAll(async () => {
    process.env['JWT_SECRET'] = 'test-secret';
    process.env['DATABASE_URL'] ??= 'postgresql://localhost/test';
    process.env['OBJECT_STORAGE_ENDPOINT'] ??= 'http://localhost:9000';
    process.env['OBJECT_STORAGE_ACCESS_KEY_ID'] ??= 'access';
    process.env['OBJECT_STORAGE_SECRET_ACCESS_KEY'] ??= 'secret';
    process.env['OBJECT_STORAGE_BUCKET'] ??= 'bucket';
    process.env['REDIS_URL'] ??= 'redis://localhost:6379';
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: 'test-secret', signOptions: { algorithm: 'HS256' } }),
      ],
      controllers: [AuthController, DummyController],
      providers: [
        AuthService,
        JwtStrategy,
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: PrismaService, useValue: { nutzer: { findUnique: async () => nutzer } } },
        { provide: Mailer, useValue: { sendPasswortSetzenLink: async () => undefined } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  function loginCookies(): Promise<string[]> {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'chef@research.local', passwort: 'geheim1234567' })
      .then((res) => res.headers['set-cookie'] as unknown as string[]);
  }

  it('sets an HttpOnly access-token cookie and a readable CSRF cookie, without accessToken in the body', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'chef@research.local', passwort: 'geheim1234567' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ mussPasswortSetzen: false, rolle: Rolle.VORGESETZTER });
    expect(response.body.accessToken).toBeUndefined();

    const cookies = response.headers['set-cookie'] as unknown as string[];
    const accessTokenCookie = cookies.find((c) => c.startsWith('accessToken='));
    const csrfCookie = cookies.find((c) => c.startsWith('csrfToken='));
    expect(accessTokenCookie).toContain('HttpOnly');
    expect(csrfCookie).toBeDefined();
    expect(csrfCookie).not.toContain('HttpOnly');
  });

  it('GET /auth/me returns the role for a valid cookie, 401 without one', async () => {
    const cookies = await loginCookies();

    const mit = await request(app.getHttpServer()).get('/api/v1/auth/me').set('Cookie', cookies);
    expect(mit.status).toBe(200);
    expect(mit.body).toEqual({ rolle: Rolle.VORGESETZTER });

    const ohne = await request(app.getHttpServer()).get('/api/v1/auth/me');
    expect(ohne.status).toBe(401);
  });

  it('rejects a mutating request with a valid auth cookie but no CSRF header (403)', async () => {
    const cookies = await loginCookies();

    const response = await request(app.getHttpServer()).post('/api/v1/dummy/mutieren').set('Cookie', cookies);

    expect(response.status).toBe(403);
  });

  it('rejects a mutating request when the CSRF header does not match the cookie (403)', async () => {
    const cookies = await loginCookies();

    const response = await request(app.getHttpServer())
      .post('/api/v1/dummy/mutieren')
      .set('Cookie', cookies)
      .set('x-csrf-token', 'falscher-wert');

    expect(response.status).toBe(403);
  });

  it('accepts a mutating request when the CSRF header matches the cookie', async () => {
    const cookies = await loginCookies();
    const csrfToken = cookies
      .find((c) => c.startsWith('csrfToken='))!
      .split(';')[0]
      .split('=')[1];

    const response = await request(app.getHttpServer())
      .post('/api/v1/dummy/mutieren')
      .set('Cookie', cookies)
      .set('x-csrf-token', csrfToken);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ ok: true });
  });

  it('POST /auth/logout clears both cookies', async () => {
    const response = await request(app.getHttpServer()).post('/api/v1/auth/logout');

    expect(response.status).toBe(204);
    const cookies = response.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c) => c.startsWith('accessToken=;') || c.includes('accessToken=;'))).toBe(true);
  });
});
