import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { MeldenderErrorHandler } from './core/app-fehler-melder';
import { AuthService } from './core/auth.service';
import { csrfInterceptor } from './core/csrf.interceptor';
import { fokussiereUeberschriftNachNavigation } from './core/fokus-nach-navigation';
import { ThemeService } from './core/theme.service';
import { unauthorizedInterceptor } from './core/unauthorized.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Unerwartete Fehler zusätzlich ans Fehler-Log des Servers (ADR-0007).
    { provide: ErrorHandler, useClass: MeldenderErrorHandler },
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withXhr(), withInterceptors([csrfInterceptor, unauthorizedInterceptor])),
    // Login-Status kommt aus dem HttpOnly-Cookie (Issue #24) und muss vor der
    // ersten Routen-Auflösung feststehen, damit die Auth-Guards synchron
    // entscheiden können.
    provideAppInitializer(() => inject(AuthService).init()),
    // Fokus nach Seitenwechsel auf die neue Hauptüberschrift (Issue #54).
    provideAppInitializer(() => fokussiereUeberschriftNachNavigation()),
    // Gespeicherten Farbmodus vor dem ersten Rendern anwenden (kein Aufblitzen).
    provideAppInitializer(() => void inject(ThemeService)),
    // Cached App-Shell-Build für wiederholte Aufrufe, siehe Issue #7. Bewusst
    // ohne Offline-Formular-Puffer – siehe docs/research/02-architektur.md
    // Abschnitt 8, Punkt 3.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
