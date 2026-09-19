import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { Test } from '@nestjs/testing';
import Redis from 'ioredis';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuthController } from '../src/auth/auth.controller.js';
import { AuthService } from '../src/auth/auth.service.js';
import { Mailer } from '../src/mailer/mailer.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const REDIS_URL = process.env['TEST_REDIS_URL'] ?? 'redis://localhost:16379';

// Beweist die Akzeptanzkriterien aus Issue #41: zwei unabhängige App-
// "Instanzen" (zwei separate Nest-Testmodule, wie zwei Container hinter
// einem Load Balancer) mit jeweils eigenem In-Prozess-State, aber
// gemeinsamem Redis-Storage, teilen sich EIN Rate-Limit statt jede für
// sich zu zählen. Braucht einen echten Redis (siehe Testbefehl/CI).
describe.skipIf(!process.env['RUN_REDIS_TESTS'])('Rate-Limiting über mehrere Instanzen (Redis-Storage, Issue #41)', () => {
  let instanzA: INestApplication;
  let instanzB: INestApplication;

  async function buildInstanz(): Promise<INestApplication> {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRootAsync({
          useFactory: () => ({
            throttlers: [{ ttl: 60_000, limit: 60 }],
            storage: new ThrottlerStorageRedisService(REDIS_URL),
          }),
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: 'test-secret' }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: PrismaService, useValue: { nutzer: { findUnique: async () => null } } },
        { provide: Mailer, useValue: { sendPasswortSetzenLink: async () => undefined } },
      ],
    }).compile();

    const app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
    return app;
  }

  beforeAll(async () => {
    // Der Throttler-Tracker schlüsselt standardmäßig nach Client-IP, nicht
    // nach Request-Inhalt – ein frischer Redis-Testlauf braucht daher einen
    // sauberen Stand, sonst wirken Zähler aus vorherigen Testläufen nach.
    const redis = new Redis(REDIS_URL);
    await redis.flushdb();
    await redis.quit();

    instanzA = await buildInstanz();
    instanzB = await buildInstanz();
  });

  afterAll(async () => {
    await instanzA.close();
    await instanzB.close();
  });

  it('shares the login rate limit across two separate app instances via Redis', async () => {
    // Eindeutig pro Testlauf: der Redis-Key lebt bis zu 60s über den
    // Testlauf hinaus, ein fester Wert würde bei wiederholten Läufen
    // mit noch aktivem TTL fälschlich sofort blocken.
    const payload = { email: `angreifer-${Date.now()}@research.local`, passwort: 'irrelevant' };

    // 3 Requests gegen Instanz A, 2 gegen Instanz B – zusammen 5, das
    // konfigurierte Limit von @Throttle auf /auth/login.
    for (let i = 0; i < 3; i++) {
      const res = await request(instanzA.getHttpServer()).post('/api/v1/auth/login').send(payload);
      expect(res.status).not.toBe(429);
    }
    for (let i = 0; i < 2; i++) {
      const res = await request(instanzB.getHttpServer()).post('/api/v1/auth/login').send(payload);
      expect(res.status).not.toBe(429);
    }

    // Der 6. Request insgesamt, egal auf welcher Instanz, muss blockiert sein –
    // wäre das Limit pro Instanz in-memory, hätte Instanz B hier noch Kapazität.
    const geblockt = await request(instanzB.getHttpServer()).post('/api/v1/auth/login').send(payload);
    expect(geblockt.status).toBe(429);
  });
});
