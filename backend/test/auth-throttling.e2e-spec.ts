import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuthController } from '../src/auth/auth.controller.js';
import { AuthService } from '../src/auth/auth.service.js';
import { Mailer } from '../src/mailer/mailer.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Prisma/Mailer sind gemockt, damit dieser e2e-Test ohne echte DB/SMTP läuft
// und ausschließlich die Throttling-Kette (Guard + @Throttle-Dekoratoren)
// end-to-end prüft (Issue #31).
describe('Auth-Endpunkte: Rate-Limiting', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]), JwtModule.register({ secret: 'test-secret' })],
      controllers: [AuthController],
      providers: [
        AuthService,
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: PrismaService, useValue: { nutzer: { findUnique: async () => null, update: async () => ({}) } } },
        { provide: Mailer, useValue: { sendPasswortSetzenLink: async () => undefined } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('blocks login after 5 requests per minute from the same client with 429', async () => {
    const server = app.getHttpServer();
    const payload = { email: 'angreifer@research.local', passwort: 'irrelevant' };

    for (let i = 0; i < 5; i++) {
      const response = await request(server).post('/api/v1/auth/login').send(payload);
      expect(response.status).not.toBe(429);
    }

    const geblockt = await request(server).post('/api/v1/auth/login').send(payload);
    expect(geblockt.status).toBe(429);
  });

  it('blocks passwort-vergessen after 5 requests per minute (enumeration/mass-trigger protection)', async () => {
    const server = app.getHttpServer();
    const payload = { email: 'opfer@research.local' };

    for (let i = 0; i < 5; i++) {
      const response = await request(server).post('/api/v1/auth/passwort-vergessen').send(payload);
      expect(response.status).not.toBe(429);
    }

    const geblockt = await request(server).post('/api/v1/auth/passwort-vergessen').send(payload);
    expect(geblockt.status).toBe(429);
  });
});
