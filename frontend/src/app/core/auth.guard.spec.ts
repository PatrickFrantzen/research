import { BreakpointObserver } from '@angular/cdk/layout';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { authGuard, startseiteRedirectGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';

describe('auth guards', () => {
  let authService: { istEingeloggt: () => boolean };
  let breakpointObserver: { isMatched: (query: string) => boolean };
  let router: Router;

  beforeEach(() => {
    authService = { istEingeloggt: () => false };
    breakpointObserver = { isMatched: () => false };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: BreakpointObserver, useValue: breakpointObserver },
      ],
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

  describe('startseiteRedirectGuard', () => {
    it('redirects to /wareneintraege on desktop-width screens', () => {
      breakpointObserver.isMatched = () => true;
      const result = runGuard(startseiteRedirectGuard);
      expect(result).toEqual(router.createUrlTree(['/wareneintraege']));
    });

    it('allows access (renders the Dashboard) on mobile-width screens', () => {
      breakpointObserver.isMatched = () => false;
      expect(runGuard(startseiteRedirectGuard)).toBe(true);
    });
  });
});
