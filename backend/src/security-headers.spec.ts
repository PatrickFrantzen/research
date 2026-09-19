import { describe, expect, it } from 'vitest';
import { buildHelmetOptions } from './security-headers.js';
import type { EnvConfig } from './config/env.js';

function buildEnv(overrides: Partial<EnvConfig['objectStorage']> = {}): EnvConfig {
  return {
    databaseUrl: 'postgresql://localhost/test',
    objectStorage: {
      endpoint: 'http://localhost:9000',
      region: 'us-east-1',
      accessKeyId: 'access',
      secretAccessKey: 'secret',
      bucket: 'bucket',
      ...overrides,
    },
    auth: { jwtSecret: 'secret', jwtExpiresIn: '8h', jwtIssuer: 'test-issuer', jwtAudience: 'test-audience' },
    redis: { url: 'redis://localhost:6379' },
  };
}

describe('buildHelmetOptions', () => {
  it('restricts default sources to same-origin', () => {
    const options = buildHelmetOptions(buildEnv());
    const directives = (options.contentSecurityPolicy as { directives: Record<string, string[]> }).directives;

    expect(directives['defaultSrc']).toEqual(["'self'"]);
    expect(directives['objectSrc']).toEqual(["'none'"]);
  });

  it('explicitly allows the configured Google Fonts sources', () => {
    const options = buildHelmetOptions(buildEnv());
    const directives = (options.contentSecurityPolicy as { directives: Record<string, string[]> }).directives;

    expect(directives['styleSrc']).toContain('https://fonts.googleapis.com');
    expect(directives['fontSrc']).toContain('https://fonts.gstatic.com');
  });

  it('allows the configured object storage origin for images, derived from env', () => {
    const options = buildHelmetOptions(buildEnv({ endpoint: 'https://s3.example.com' }));
    const directives = (options.contentSecurityPolicy as { directives: Record<string, string[]> }).directives;

    expect(directives['imgSrc']).toContain('https://s3.example.com');
    expect(directives['connectSrc']).toContain('https://s3.example.com');
  });

  it('sets a strict referrer policy', () => {
    const options = buildHelmetOptions(buildEnv());
    expect(options.referrerPolicy).toEqual({ policy: 'no-referrer' });
  });
});
