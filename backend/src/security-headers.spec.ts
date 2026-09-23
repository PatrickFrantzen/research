import { describe, expect, it } from 'vitest';
import { buildHelmetOptions } from './security-headers.js';
import type { EnvConfig } from './config/env.js';

function buildEnv(overrides: Partial<EnvConfig['objectStorage']> = {}): EnvConfig {
  return {
    databaseUrl: 'postgresql://localhost/test',
    objectStorage: {
      endpoint: 'http://localhost:9000',
      publicEndpoint: 'http://localhost:9000',
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

  it('loads fonts only from the own origin (bundled, no Google Fonts)', () => {
    const options = buildHelmetOptions(buildEnv());
    const directives = (options.contentSecurityPolicy as { directives: Record<string, string[]> }).directives;

    expect(directives['fontSrc']).toEqual(["'self'"]);
    expect(directives['styleSrc']).not.toContain('https://fonts.googleapis.com');
  });

  it('allows the configured object storage origin for images, derived from the public endpoint', () => {
    const options = buildHelmetOptions(buildEnv({ publicEndpoint: 'https://s3.example.com' }));
    const directives = (options.contentSecurityPolicy as { directives: Record<string, string[]> }).directives;

    expect(directives['imgSrc']).toContain('https://s3.example.com');
    expect(directives['connectSrc']).toContain('https://s3.example.com');
  });

  it('derives the CSP origin from the public endpoint, not the internal one used server-to-server', () => {
    const options = buildHelmetOptions(buildEnv({ endpoint: 'http://minio:9000', publicEndpoint: 'http://localhost:9000' }));
    const directives = (options.contentSecurityPolicy as { directives: Record<string, string[]> }).directives;

    expect(directives['imgSrc']).toContain('http://localhost:9000');
    expect(directives['imgSrc']).not.toContain('http://minio:9000');
  });

  it('allows blob: image sources for the local foto preview before upload', () => {
    const options = buildHelmetOptions(buildEnv());
    const directives = (options.contentSecurityPolicy as { directives: Record<string, string[]> }).directives;

    expect(directives['imgSrc']).toContain('blob:');
  });

  it('sets a strict referrer policy', () => {
    const options = buildHelmetOptions(buildEnv());
    expect(options.referrerPolicy).toEqual({ policy: 'no-referrer' });
  });
});
