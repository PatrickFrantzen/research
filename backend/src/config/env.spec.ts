import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadEnv } from './env.js';

const REQUIRED_VARS = {
  DATABASE_URL: 'postgresql://localhost/test',
  OBJECT_STORAGE_ENDPOINT: 'http://localhost:9000',
  OBJECT_STORAGE_ACCESS_KEY_ID: 'access-key',
  OBJECT_STORAGE_SECRET_ACCESS_KEY: 'secret-key',
  OBJECT_STORAGE_BUCKET: 'bucket',
  JWT_SECRET: 'jwt-secret',
};

describe('loadEnv', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    for (const key of Object.keys(process.env)) {
      delete process.env[key];
    }
    Object.assign(process.env, REQUIRED_VARS);
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
  });

  it('reads all required variables', () => {
    const env = loadEnv();

    expect(env.databaseUrl).toBe(REQUIRED_VARS.DATABASE_URL);
    expect(env.objectStorage.endpoint).toBe(REQUIRED_VARS.OBJECT_STORAGE_ENDPOINT);
    expect(env.objectStorage.accessKeyId).toBe(REQUIRED_VARS.OBJECT_STORAGE_ACCESS_KEY_ID);
    expect(env.objectStorage.secretAccessKey).toBe(REQUIRED_VARS.OBJECT_STORAGE_SECRET_ACCESS_KEY);
    expect(env.objectStorage.bucket).toBe(REQUIRED_VARS.OBJECT_STORAGE_BUCKET);
    expect(env.auth.jwtSecret).toBe(REQUIRED_VARS.JWT_SECRET);
  });

  it('defaults OBJECT_STORAGE_REGION to us-east-1 when not set', () => {
    expect(loadEnv().objectStorage.region).toBe('us-east-1');
  });

  it('uses OBJECT_STORAGE_REGION when set', () => {
    process.env['OBJECT_STORAGE_REGION'] = 'eu-central-1';
    expect(loadEnv().objectStorage.region).toBe('eu-central-1');
  });

  it('defaults JWT_EXPIRES_IN to 8h when not set', () => {
    expect(loadEnv().auth.jwtExpiresIn).toBe('8h');
  });

  it('uses JWT_EXPIRES_IN when set', () => {
    process.env['JWT_EXPIRES_IN'] = '1h';
    expect(loadEnv().auth.jwtExpiresIn).toBe('1h');
  });

  it('throws when a required variable is missing', () => {
    delete process.env['DATABASE_URL'];
    expect(() => loadEnv()).toThrow('Missing required environment variable: DATABASE_URL');
  });
});
