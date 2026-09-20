import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service.js';
import { istEigeneApi } from './eigene-api.js';

// Zentrale Behandlung abgelaufener/ungültiger Tokens: 401 von der
// eigenen API räumt die Session auf und schickt zurück zum Login, statt
// die UI in einem irreführenden "eingeloggt, aber alles schlägt fehl"
// Zustand hängen zu lassen (Issue #28).
export const unauthorizedInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        istEigeneApi(req.url) &&
        !istAuthCleanupRequest(req.url)
      ) {
        authService.logout();
        void router.navigateByUrl('/login');
      }
      return throwError(() => error);
    }),
  );
};

function istAuthCleanupRequest(url: string): boolean {
  const pathname = new URL(url, window.location.origin).pathname;
  return pathname === '/api/v1/auth/logout' || pathname === '/api/v1/auth/login' || pathname === '/api/v1/auth/me';
}
