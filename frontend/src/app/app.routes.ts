import { Routes } from '@angular/router';
import { authGuard, startseiteRedirectGuard } from './core/auth.guard.js';

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
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./core/shell/shell.js').then((m) => m.Shell),
    children: [
      {
        path: '',
        canActivate: [startseiteRedirectGuard],
        loadComponent: () => import('./features/dashboard/dashboard.js').then((m) => m.Dashboard),
      },
      {
        path: 'nutzer-anlegen',
        loadComponent: () => import('./features/nutzer-anlegen/nutzer-anlegen.js').then((m) => m.NutzerAnlegen),
      },
      {
        path: 'wareneintraege',
        loadComponent: () =>
          import('./features/wareneintrag-liste/wareneintrag-liste.js').then((m) => m.WareneintragListe),
      },
      {
        path: 'wareneintrag-erfassen',
        loadComponent: () =>
          import('./features/wareneintrag-erfassen/wareneintrag-erfassen.js').then((m) => m.WareneintragErfassen),
      },
      {
        path: 'einstellungen',
        loadComponent: () => import('./features/einstellungen/einstellungen.js').then((m) => m.Einstellungen),
      },
    ],
  },
];
