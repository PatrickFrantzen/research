import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service.js';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return authService.istEingeloggt() ? true : router.createUrlTree(['/login']);
};

export const vorgesetzterGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return authService.rolle() === 'VORGESETZTER' ? true : router.createUrlTree(['/']);
};

// Erfassen ist die Kernaufgabe des Mitarbeiters, aber auch der Vorgesetzte
// darf im Vertretungsfall Wareneinträge anlegen.
export const kannWareneintragErfassenGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const rolle = authService.rolle();
  return rolle === 'MITARBEITER' || rolle === 'VORGESETZTER' ? true : router.createUrlTree(['/']);
};

export const startseiteRedirectGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const ziel = authService.rolle() === 'VORGESETZTER' ? '/wareneintraege' : '/wareneintrag-erfassen';
  return router.createUrlTree([ziel]);
};
