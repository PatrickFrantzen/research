import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export type Rolle = 'MITARBEITER' | 'VORGESETZTER';

interface JwtPayload {
  sub: string;
  rolle: Rolle;
}

interface LoginResponse {
  accessToken: string;
  mussPasswortSetzen: boolean;
}

const TOKEN_STORAGE_KEY = 'research.accessToken';

function decodeJwtPayload(token: string): JwtPayload {
  const [, payload] = token.split('.');
  return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly tokenSignal = signal<string | null>(sessionStorage.getItem(TOKEN_STORAGE_KEY));

  readonly rolle = computed<Rolle | null>(() => {
    const token = this.tokenSignal();
    return token ? decodeJwtPayload(token).rolle : null;
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
