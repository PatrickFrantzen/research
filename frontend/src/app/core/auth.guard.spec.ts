import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { authGuard, mitarbeiterGuard, vorgesetzterGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';

describe('auth guards', () => {
  let authService: { istEingeloggt: () => boolean; rolle: () => string | null };
  let router: Router;

  beforeEach(() => {
    authService = { istEingeloggt: () => false, rolle: () => null };
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authService }],
    });
    router = TestBed.inject(Router);
  });

  function runGuard(guard: typeof authGuard) {
    return TestBed.runInInjectionContext(() => guard({} as never, {} as never)) as boolean | UrlTree;
  }

  describe('authGuard', () => {
    it('allows access when logged in', () => {
      authService.istEingeloggt = () => true;
      expect(runGuard(authGuard)).toBe(true);
    });

    it('redirects to /login when not logged in', () => {
      authService.istEingeloggt = () => false;
      const result = runGuard(authGuard);
      expect(result).toEqual(router.createUrlTree(['/login']));
    });
  });

  describe('vorgesetzterGuard', () => {
    it('allows access for role VORGESETZTER', () => {
      authService.rolle = () => 'VORGESETZTER';
      expect(runGuard(vorgesetzterGuard)).toBe(true);
    });

    it('redirects to / for any other role', () => {
      authService.rolle = () => 'MITARBEITER';
      const result = runGuard(vorgesetzterGuard);
      expect(result).toEqual(router.createUrlTree(['/']));
    });
  });

  describe('mitarbeiterGuard', () => {
    it('allows access for role MITARBEITER', () => {
      authService.rolle = () => 'MITARBEITER';
      expect(runGuard(mitarbeiterGuard)).toBe(true);
    });

    it('redirects to / for any other role', () => {
      authService.rolle = () => 'VORGESETZTER';
      const result = runGuard(mitarbeiterGuard);
      expect(result).toEqual(router.createUrlTree(['/']));
    });
  });
});
