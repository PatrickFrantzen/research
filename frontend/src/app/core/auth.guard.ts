import { BreakpointObserver } from '@angular/cdk/layout';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service.js';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (!authService.istEingeloggt()) return router.createUrlTree(['/login']);
  // Mit Initialpasswort ist nur der Passwortwechsel erreichbar (Issue #76).
  return authService.mussPasswortSetzen() ? router.createUrlTree(['/passwort-aendern']) : true;
};

// Gegenstück für /passwort-aendern: nur eingeloggt und nur solange das
// Initialpasswort noch gesetzt ist.
export const initialpasswortGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (!authService.istEingeloggt()) return router.createUrlTree(['/login']);
  return authService.mussPasswortSetzen() ? true : router.createUrlTree(['/']);
};

// Deckt sich mit $breakpoint-desktop in shell.scss – Mobil/Desktop ist seit
// der Rollen-Entfernung eine reine Bildschirmbreiten-Frage, keine Rollenfrage
// mehr (jeder Nutzer sieht auf Desktop-Breite dieselbe Ansicht).
const DESKTOP_BREAKPOINT = '(min-width: 768px)';

// Root-Route: Desktop zeigt weiterhin direkt die Wareneintrag-Liste als
// Startseite, Mobil rendert stattdessen das Dashboard (Kind-Route rendert
// dann, wenn hier `true` zurückkommt).
export const startseiteRedirectGuard: CanActivateFn = () => {
  const breakpointObserver = inject(BreakpointObserver);
  const router = inject(Router);
  return breakpointObserver.isMatched(DESKTOP_BREAKPOINT) ? router.createUrlTree(['/wareneintraege']) : true;
};
