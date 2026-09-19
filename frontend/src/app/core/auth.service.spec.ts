import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service.js';

// Payload: { sub: 'nutzer-1', rolle: 'VORGESETZTER' }
const VORGESETZTER_TOKEN =
  'eyJhbGciOiJub25lIn0.eyJzdWIiOiJudXR6ZXItMSIsInJvbGxlIjoiVk9SR0VTRVRaVEVSIn0.sig';
// Payload: { sub: 'nutzer-1', rolle: 'VORGESETZTER', exp: 1 } – 1970, immer abgelaufen
const ABGELAUFENER_TOKEN =
  'eyJhbGciOiJub25lIn0.eyJzdWIiOiJudXR6ZXItMSIsInJvbGxlIjoiVk9SR0VTRVRaVEVSIiwiZXhwIjoxfQ.sig';

describe('AuthService', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  it('is not logged in when sessionStorage has no token', () => {
    const service = TestBed.inject(AuthService);

    expect(service.istEingeloggt()).toBe(false);
    expect(service.rolle()).toBeNull();
    expect(service.accessToken).toBeNull();
  });

  it('restores the session from a token already in sessionStorage', () => {
    sessionStorage.setItem('research.accessToken', VORGESETZTER_TOKEN);
    const service = TestBed.inject(AuthService);

    expect(service.istEingeloggt()).toBe(true);
    expect(service.rolle()).toBe('VORGESETZTER');
  });

  it('stores the token and decodes the Rolle on successful login', async () => {
    const service = TestBed.inject(AuthService);

    const loginPromise = service.login('vorgesetzter@example.com', 'geheim');
    httpMock
      .expectOne('/api/v1/auth/login')
      .flush({ accessToken: VORGESETZTER_TOKEN, mussPasswortSetzen: false });
    const result = await loginPromise;

    expect(result).toEqual({ mussPasswortSetzen: false });
    expect(service.istEingeloggt()).toBe(true);
    expect(service.rolle()).toBe('VORGESETZTER');
    expect(sessionStorage.getItem('research.accessToken')).toBe(VORGESETZTER_TOKEN);
  });

  it('treats an expired token in sessionStorage as logged out and clears it (Issue #28)', () => {
    sessionStorage.setItem('research.accessToken', ABGELAUFENER_TOKEN);
    const service = TestBed.inject(AuthService);

    expect(service.istEingeloggt()).toBe(false);
    expect(service.rolle()).toBeNull();
    expect(sessionStorage.getItem('research.accessToken')).toBeNull();
  });

  it('treats a malformed token in sessionStorage as logged out instead of throwing (Issue #28)', () => {
    sessionStorage.setItem('research.accessToken', 'kaputter-token');

    expect(() => TestBed.inject(AuthService)).not.toThrow();
    const service = TestBed.inject(AuthService);
    expect(service.istEingeloggt()).toBe(false);
    expect(sessionStorage.getItem('research.accessToken')).toBeNull();
  });

  it('clears the session on logout', () => {
    sessionStorage.setItem('research.accessToken', VORGESETZTER_TOKEN);
    const service = TestBed.inject(AuthService);

    service.logout();

    expect(service.istEingeloggt()).toBe(false);
    expect(service.rolle()).toBeNull();
    expect(sessionStorage.getItem('research.accessToken')).toBeNull();
  });
});
