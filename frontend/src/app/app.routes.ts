import { Routes } from '@angular/router';
import { adminGuard, authGuard, startseiteRedirectGuard } from './core/auth.guard.js';

// Jede Route mit eigenem Seitentitel (WCAG 2.4.2, Issue #54): Screenreader
// sagen ihn beim Seitenwechsel an, Browser-Tabs und Verlauf werden lesbar.
export const routes: Routes = [
  {
    path: 'login',
    title: 'Anmelden – RE-SEARCH',
    loadComponent: () => import('./features/login/login.js').then((m) => m.Login),
  },
  {
    path: 'passwort-vergessen',
    title: 'Passwort vergessen – RE-SEARCH',
    loadComponent: () =>
      import('./features/passwort-vergessen/passwort-vergessen.js').then((m) => m.PasswortVergessen),
  },
  {
    path: 'passwort-setzen',
    title: 'Passwort setzen – RE-SEARCH',
    loadComponent: () => import('./features/passwort-setzen/passwort-setzen.js').then((m) => m.PasswortSetzen),
  },
  {
    path: 'impressum',
    title: 'Impressum – RE-SEARCH',
    loadComponent: () => import('./features/impressum/impressum.js').then((m) => m.Impressum),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./core/shell/shell.js').then((m) => m.Shell),
    children: [
      {
        path: '',
        canActivate: [startseiteRedirectGuard],
        title: 'Startseite – RE-SEARCH',
        loadComponent: () => import('./features/dashboard/dashboard.js').then((m) => m.Dashboard),
      },
      {
        path: 'nutzerverwaltung',
        canActivate: [adminGuard],
        title: 'Nutzerverwaltung – RE-SEARCH',
        loadComponent: () =>
          import('./features/nutzerverwaltung/nutzerverwaltung.js').then((m) => m.Nutzerverwaltung),
      },
      {
        path: 'protokolle',
        canActivate: [adminGuard],
        title: 'Logs – RE-SEARCH',
        loadComponent: () => import('./features/protokolle/protokolle.js').then((m) => m.Protokolle),
      },
      {
        path: 'nutzer-anlegen',
        canActivate: [adminGuard],
        title: 'Nutzer anlegen – RE-SEARCH',
        loadComponent: () => import('./features/nutzer-anlegen/nutzer-anlegen.js').then((m) => m.NutzerAnlegen),
      },
      {
        path: 'wareneintraege',
        title: 'Wareneinträge – RE-SEARCH',
        loadComponent: () =>
          import('./features/wareneintrag-liste/wareneintrag-liste.js').then((m) => m.WareneintragListe),
      },
      {
        path: 'wareneintrag-erfassen',
        title: 'Wareneintrag erfassen – RE-SEARCH',
        loadComponent: () =>
          import('./features/wareneintrag-erfassen/wareneintrag-erfassen.js').then((m) => m.WareneintragErfassen),
      },
      {
        path: 'einstellungen',
        title: 'Einstellungen – RE-SEARCH',
        loadComponent: () => import('./features/einstellungen/einstellungen.js').then((m) => m.Einstellungen),
      },
    ],
  },
  // Bewusst ohne Guard und außerhalb der Shell: unbekannte URLs landen
  // immer hier, mit oder ohne Session (Issue #58).
  {
    path: '**',
    title: 'Seite nicht gefunden – RE-SEARCH',
    loadComponent: () => import('./features/nicht-gefunden/nicht-gefunden.js').then((m) => m.NichtGefunden),
  },
];
