import { describe, expect, it } from 'vitest';
import { csrfIstGueltig } from './csrf.js';

function buildReq(overrides: { method: string; cookies?: Record<string, string>; headers?: Record<string, string> }) {
  return { method: overrides.method, cookies: overrides.cookies ?? {}, headers: overrides.headers ?? {} };
}

describe('csrfIstGueltig', () => {
  it('allows safe methods without any CSRF token', () => {
    expect(csrfIstGueltig(buildReq({ method: 'GET' }))).toBe(true);
    expect(csrfIstGueltig(buildReq({ method: 'HEAD' }))).toBe(true);
    expect(csrfIstGueltig(buildReq({ method: 'OPTIONS' }))).toBe(true);
  });

  it('rejects a mutating request without any CSRF token', () => {
    expect(csrfIstGueltig(buildReq({ method: 'POST' }))).toBe(false);
  });

  it('rejects a mutating request when only the cookie is present', () => {
    expect(csrfIstGueltig(buildReq({ method: 'POST', cookies: { csrfToken: 'abc' } }))).toBe(false);
  });

  it('rejects a mutating request when cookie and header differ', () => {
    expect(
      csrfIstGueltig(
        buildReq({ method: 'POST', cookies: { csrfToken: 'abc' }, headers: { 'x-csrf-token': 'anders' } }),
      ),
    ).toBe(false);
  });

  it('accepts a mutating request when cookie and header match', () => {
    expect(
      csrfIstGueltig(buildReq({ method: 'POST', cookies: { csrfToken: 'abc' }, headers: { 'x-csrf-token': 'abc' } })),
    ).toBe(true);
  });

  it('rejects an empty-string match (empty cookie is not a valid token)', () => {
    expect(
      csrfIstGueltig(buildReq({ method: 'DELETE', cookies: { csrfToken: '' }, headers: { 'x-csrf-token': '' } })),
    ).toBe(false);
  });
});
