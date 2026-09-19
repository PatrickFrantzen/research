import { HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { authInterceptor } from './auth.interceptor.js';
import { AuthService } from './auth.service.js';

describe('authInterceptor', () => {
  function runInterceptor(accessToken: string | null, req: HttpRequest<unknown>) {
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { accessToken } }],
    });
    const next = jasmine.createSpy('next').and.callFake((r: HttpRequest<unknown>) => r);
    const result = TestBed.runInInjectionContext(() => authInterceptor(req, next));
    return { result, next };
  }

  it('adds the Authorization header when a token is present', () => {
    const req = new HttpRequest('GET', '/api/v1/wareneintraege');
    const { next } = runInterceptor('token-123', req);

    const forwarded = next.calls.mostRecent().args[0] as HttpRequest<unknown>;
    expect(forwarded.headers.get('Authorization')).toBe('Bearer token-123');
  });

  it('passes the request through unchanged when no token is present', () => {
    const req = new HttpRequest('GET', '/api/v1/wareneintraege');
    const { next } = runInterceptor(null, req);

    const forwarded = next.calls.mostRecent().args[0] as HttpRequest<unknown>;
    expect(forwarded).toBe(req);
    expect(forwarded.headers.has('Authorization')).toBe(false);
  });

  it('does not attach the token to requests outside the own API (Issue #27)', () => {
    const req = new HttpRequest('GET', 'https://evil.example/steal');
    const { next } = runInterceptor('token-123', req);

    const forwarded = next.calls.mostRecent().args[0] as HttpRequest<unknown>;
    expect(forwarded).toBe(req);
    expect(forwarded.headers.has('Authorization')).toBe(false);
  });

  it('still attaches the token to absolute same-origin API URLs', () => {
    const req = new HttpRequest('GET', `${window.location.origin}/api/v1/wareneintraege`);
    const { next } = runInterceptor('token-123', req);

    const forwarded = next.calls.mostRecent().args[0] as HttpRequest<unknown>;
    expect(forwarded.headers.get('Authorization')).toBe('Bearer token-123');
  });
});
