import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('is not logged in before init() resolves', () => {
    const service = TestBed.inject(AuthService);

    expect(service.istEingeloggt()).toBe(false);
    expect(service.rolle()).toBeNull();
  });

  it('restores the session from GET /auth/me on init()', async () => {
    const service = TestBed.inject(AuthService);

    const initPromise = service.init();
    httpMock.expectOne('/api/v1/auth/me').flush({ rolle: 'VORGESETZTER' });
    await initPromise;

    expect(service.istEingeloggt()).toBe(true);
    expect(service.rolle()).toBe('VORGESETZTER');
  });

  it('treats a 401 from /auth/me as logged out (no valid cookie) on init()', async () => {
    const service = TestBed.inject(AuthService);

    const initPromise = service.init();
    httpMock.expectOne('/api/v1/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    await initPromise;

    expect(service.istEingeloggt()).toBe(false);
    expect(service.rolle()).toBeNull();
  });

  it('sets rolle/istEingeloggt from the login response, without ever seeing a token', async () => {
    const service = TestBed.inject(AuthService);

    const loginPromise = service.login('vorgesetzter@example.com', 'geheim');
    httpMock.expectOne('/api/v1/auth/login').flush({ mussPasswortSetzen: false, rolle: 'VORGESETZTER' });
    const result = await loginPromise;

    expect(result).toEqual({ mussPasswortSetzen: false });
    expect(service.istEingeloggt()).toBe(true);
    expect(service.rolle()).toBe('VORGESETZTER');
  });

  it('clears the session immediately on logout and best-effort notifies the server', async () => {
    const service = TestBed.inject(AuthService);
    const loginPromise = service.login('vorgesetzter@example.com', 'geheim');
    httpMock.expectOne('/api/v1/auth/login').flush({ mussPasswortSetzen: false, rolle: 'VORGESETZTER' });
    await loginPromise;

    service.logout();

    expect(service.istEingeloggt()).toBe(false);
    expect(service.rolle()).toBeNull();
    httpMock.expectOne('/api/v1/auth/logout').flush(null);
  });
});
