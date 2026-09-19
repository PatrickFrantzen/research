import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { konfiguriereSecurityHeaders } from '../src/security-headers.js';
import type { EnvConfig } from '../src/config/env.js';

@Controller()
class DummyController {
  @Get('ping')
  ping() {
    return { ok: true };
  }
}

describe('Security-Header (Issue #26)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const env: EnvConfig = {
      databaseUrl: 'postgresql://localhost/test',
      objectStorage: {
        endpoint: 'http://localhost:9000',
        region: 'us-east-1',
        accessKeyId: 'access',
        secretAccessKey: 'secret',
        bucket: 'bucket',
      },
      auth: { jwtSecret: 'secret', jwtExpiresIn: '8h' },
    };
    const moduleRef = await Test.createTestingModule({ controllers: [DummyController] }).compile();
    app = moduleRef.createNestApplication();
    app.use(konfiguriereSecurityHeaders(env));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('sends a restrictive Content-Security-Policy on every response', async () => {
    const response = await request(app.getHttpServer()).get('/ping');

    expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
  });
});
