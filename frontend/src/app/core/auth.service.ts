import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export type Rolle = 'MITARBEITER' | 'VORGESETZTER';

interface JwtPayload {
  sub: string;
  rolle: Rolle;
  exp?: number;
}

interface LoginResponse {
  accessToken: string;
  mussPasswortSetzen: boolean;
}

const TOKEN_STORAGE_KEY = 'research.accessToken';

// Robust gegen kaputte/manipulierte Tokens: liefert null statt zu werfen
// (Issue #28) – ein defektes Token darf die App nicht abstürzen lassen.
function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) {
      return null;
    }
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

function istTokenGueltig(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload) {
    return false;
  }
  return payload.exp === undefined || payload.exp * 1000 > Date.now();
}

function initialesToken(): string | null {
  const gespeichert = sessionStorage.getItem(TOKEN_STORAGE_KEY);
  if (gespeichert && istTokenGueltig(gespeichert)) {
    return gespeichert;
  }
  if (gespeichert) {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  }
  return null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly tokenSignal = signal<string | null>(initialesToken());

  readonly rolle = computed<Rolle | null>(() => {
    const token = this.tokenSignal();
    return token ? (decodeJwtPayload(token)?.rolle ?? null) : null;
  });

  readonly istEingeloggt = computed(() => this.tokenSignal() !== null);

  get accessToken(): string | null {
    return this.tokenSignal();
  }

  async login(email: string, passwort: string): Promise<{ mussPasswortSetzen: boolean }> {
    const response = await firstValueFrom(
      this.http.post<LoginResponse>('/api/v1/auth/login', { email, passwort }),
    );
    sessionStorage.setItem(TOKEN_STORAGE_KEY, response.accessToken);
    this.tokenSignal.set(response.accessToken);
    return { mussPasswortSetzen: response.mussPasswortSetzen };
  }

  logout(): void {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    this.tokenSignal.set(null);
  }

  async passwortVergessen(email: string): Promise<void> {
    await firstValueFrom(this.http.post<void>('/api/v1/auth/passwort-vergessen', { email }));
  }

  async passwortSetzen(token: string, neuesPasswort: string): Promise<void> {
    await firstValueFrom(this.http.post<void>('/api/v1/auth/passwort-setzen', { token, neuesPasswort }));
  }
}
