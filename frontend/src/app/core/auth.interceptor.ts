import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service.js';

// Nur relative Aufrufe und absolute Same-Origin-Aufrufe unter /api/ gelten
// als eigene API. Verhindert, dass das Bearer-Token versehentlich an
// externe Ziele geschickt wird (Issue #27).
function istEigeneApi(url: string): boolean {
  if (url.startsWith('/api/')) {
    return true;
  }
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin && parsed.pathname.startsWith('/api/');
  } catch {
    return false;
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.accessToken;
  if (!token || !istEigeneApi(req.url)) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
