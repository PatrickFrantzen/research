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
    httpMock.expectOne('/api/v1/auth/me').flush({ id: 'nutzer-1', mussPasswortSetzen: true });
    await initPromise;

    expect(service.istEingeloggt()).toBe(true);
    expect(service.nutzerId()).toBe('nutzer-1');
    // Nach einem Reload bleibt der Pflicht-Passwortwechsel bestehen (Issue #76).
    expect(service.mussPasswortSetzen()).toBe(true);
  });

  it('clears the initial-password flag after changing the password', async () => {
    const service = TestBed.inject(AuthService);
    const loginPromise = service.login('nutzer@example.com', 'Initial-Passwort-1');
    httpMock.expectOne('/api/v1/auth/login').flush({ mussPasswortSetzen: true, id: 'nutzer-1' });
    await loginPromise;
    expect(service.mussPasswortSetzen()).toBe(true);

    const aendernPromise = service.passwortAendern('Eigenes-Passwort-1');
    const request = httpMock.expectOne('/api/v1/auth/passwort-aendern');
    expect(request.request.body).toEqual({ neuesPasswort: 'Eigenes-Passwort-1' });
    request.flush(null, { status: 204, statusText: 'No Content' });
    await aendernPromise;

    expect(service.mussPasswortSetzen()).toBe(false);
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
