import { Routes } from '@angular/router';
import { authGuard, mitarbeiterGuard, vorgesetzterGuard } from './core/auth.guard.js';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.js').then((m) => m.Login),
  },
  {
    path: 'passwort-vergessen',
    loadComponent: () =>
      import('./features/passwort-vergessen/passwort-vergessen.js').then((m) => m.PasswortVergessen),
  },
  {
    path: 'passwort-setzen',
    loadComponent: () => import('./features/passwort-setzen/passwort-setzen.js').then((m) => m.PasswortSetzen),
  },
  {
    path: 'mitarbeiter-anlegen',
    canActivate: [authGuard, vorgesetzterGuard],
    loadComponent: () =>
      import('./features/mitarbeiter-anlegen/mitarbeiter-anlegen.js').then((m) => m.MitarbeiterAnlegen),
  },
  {
    path: 'wareneintraege',
    canActivate: [authGuard, vorgesetzterGuard],
    loadComponent: () => import('./features/wareneintrag-liste/wareneintrag-liste.js').then((m) => m.WareneintragListe),
  },
  {
    path: 'wareneintrag-erfassen',
    canActivate: [authGuard, mitarbeiterGuard],
    loadComponent: () =>
      import('./features/wareneintrag-erfassen/wareneintrag-erfassen.js').then((m) => m.WareneintragErfassen),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/start/start.js').then((m) => m.Start),
  },
];
