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
    expect(service.nutzerId()).toBeNull();
  });

  it('restores the session from GET /auth/me on init()', async () => {
    const service = TestBed.inject(AuthService);

    const initPromise = service.init();
    httpMock.expectOne('/api/v1/auth/me').flush({ id: 'nutzer-1' });
    await initPromise;

    expect(service.istEingeloggt()).toBe(true);
    expect(service.nutzerId()).toBe('nutzer-1');
  });

  it('treats a 401 from /auth/me as logged out (no valid cookie) on init()', async () => {
    const service = TestBed.inject(AuthService);

    const initPromise = service.init();
    httpMock.expectOne('/api/v1/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    await initPromise;

    expect(service.istEingeloggt()).toBe(false);
    expect(service.nutzerId()).toBeNull();
  });

  it('sets nutzerId/istEingeloggt from the login response, without ever seeing a token', async () => {
    const service = TestBed.inject(AuthService);

    const loginPromise = service.login('nutzer@example.com', 'geheim');
    httpMock.expectOne('/api/v1/auth/login').flush({ mussPasswortSetzen: false, id: 'nutzer-1' });
    const result = await loginPromise;

    expect(result).toEqual({ mussPasswortSetzen: false });
    expect(service.istEingeloggt()).toBe(true);
    expect(service.nutzerId()).toBe('nutzer-1');
  });

  it('clears the session immediately on logout and best-effort notifies the server', async () => {
    const service = TestBed.inject(AuthService);
    const loginPromise = service.login('nutzer@example.com', 'geheim');
    httpMock.expectOne('/api/v1/auth/login').flush({ mussPasswortSetzen: false, id: 'nutzer-1' });
    await loginPromise;

    service.logout();

    expect(service.istEingeloggt()).toBe(false);
    expect(service.nutzerId()).toBeNull();
    httpMock.expectOne('/api/v1/auth/logout').flush(null);
  });
});
