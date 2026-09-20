import { HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { AuthService } from './auth.service.js';
import { unauthorizedInterceptor } from './unauthorized.interceptor.js';

describe('unauthorizedInterceptor', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  function run(status: number, url = '/api/v1/wareneintraege') {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['logout']);
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
    const req = new HttpRequest('GET', url);
    const next = () => throwError(() => new HttpErrorResponse({ status, url }));
    return TestBed.runInInjectionContext(() => unauthorizedInterceptor(req, next));
  }

  it('logs out and redirects to /login on 401 from the own API', (done) => {
    run(401).subscribe({
      error: () => {
        expect(authService.logout).toHaveBeenCalled();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
        done();
      },
    });
  });

  it('keeps the session on 403 from the own API so the feature can show the permission error', (done) => {
    run(403).subscribe({
      error: () => {
        expect(authService.logout).not.toHaveBeenCalled();
        expect(router.navigateByUrl).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('does not trigger another logout when the logout request itself returns 401', (done) => {
    run(401, '/api/v1/auth/logout').subscribe({
      error: () => {
        expect(authService.logout).not.toHaveBeenCalled();
        expect(router.navigateByUrl).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('does not log out on other error statuses', (done) => {
    run(500).subscribe({
      error: () => {
        expect(authService.logout).not.toHaveBeenCalled();
        expect(router.navigateByUrl).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('does not log out on 401 from a third-party request', (done) => {
    run(401, 'https://evil.example/steal').subscribe({
      error: () => {
        expect(authService.logout).not.toHaveBeenCalled();
        done();
      },
    });
  });
});
