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

export const mitarbeiterGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return authService.rolle() === 'MITARBEITER' ? true : router.createUrlTree(['/']);
};
