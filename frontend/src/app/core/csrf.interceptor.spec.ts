import { HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { csrfInterceptor } from './csrf.interceptor.js';

describe('csrfInterceptor', () => {
  afterEach(() => {
    document.cookie = 'csrfToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
  });

  function run(req: HttpRequest<unknown>) {
    const next = jasmine.createSpy('next').and.callFake((r: HttpRequest<unknown>) => r);
    TestBed.runInInjectionContext(() => csrfInterceptor(req, next));
    return next.calls.mostRecent().args[0] as HttpRequest<unknown>;
  }

  it('does not attach a CSRF header to safe methods', () => {
    document.cookie = 'csrfToken=abc123; path=/';
    const forwarded = run(new HttpRequest('GET', '/api/v1/wareneintraege'));

    expect(forwarded.headers.has('X-CSRF-Token')).toBe(false);
  });

  it('attaches the CSRF cookie value as a header on mutating requests to the own API', () => {
    document.cookie = 'csrfToken=abc123; path=/';
    const forwarded = run(new HttpRequest('POST', '/api/v1/wareneintraege', {}));

    expect(forwarded.headers.get('X-CSRF-Token')).toBe('abc123');
  });

  it('does not attach a CSRF header when there is no CSRF cookie (e.g. logged out)', () => {
    const forwarded = run(new HttpRequest('POST', '/api/v1/auth/login', {}));

    expect(forwarded.headers.has('X-CSRF-Token')).toBe(false);
  });

  it('does not attach the CSRF header to a third-party request', () => {
    document.cookie = 'csrfToken=abc123; path=/';
    const forwarded = run(new HttpRequest('POST', 'https://evil.example/steal', {}));

    expect(forwarded.headers.has('X-CSRF-Token')).toBe(false);
  });
});
