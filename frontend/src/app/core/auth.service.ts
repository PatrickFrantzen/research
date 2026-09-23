import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

interface LoginResponse {
  mussPasswortSetzen: boolean;
  id: string;
}

interface MeResponse {
  id: string;
}

// Der Access-Token liegt seit Issue #24 in einem HttpOnly-Cookie und ist für
// dieses Modul nicht lesbar/speicherbar – Login-Status kommt vom Server.
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly nutzerIdSignal = signal<string | null>(null);
  private readonly istEingeloggtSignal = signal(false);

  // Eigene Nutzer-ID, u.a. für Besitz-Checks bei Wareneinträgen (nur der
  // erfassende Nutzer darf seinen eigenen Eintrag bearbeiten/löschen).
  readonly nutzerId = this.nutzerIdSignal.asReadonly();
  readonly istEingeloggt = this.istEingeloggtSignal.asReadonly();

  // Beim App-Start aufgerufen (siehe app.config.ts, provideAppInitializer),
  // bevor die erste Route aufgelöst wird – die Guards lesen danach nur noch
  // die bereits gesetzten Signals.
  async init(): Promise<void> {
    try {
      const response = await firstValueFrom(this.http.get<MeResponse>('/api/v1/auth/me'));
      this.nutzerIdSignal.set(response.id);
      this.istEingeloggtSignal.set(true);
    } catch {
      this.nutzerIdSignal.set(null);
      this.istEingeloggtSignal.set(false);
    }
  }

  async login(email: string, passwort: string): Promise<{ mussPasswortSetzen: boolean }> {
    const response = await firstValueFrom(this.http.post<LoginResponse>('/api/v1/auth/login', { email, passwort }));
    this.nutzerIdSignal.set(response.id);
    this.istEingeloggtSignal.set(true);
    return { mussPasswortSetzen: response.mussPasswortSetzen };
  }

  logout(): void {
    this.nutzerIdSignal.set(null);
    this.istEingeloggtSignal.set(false);
    // Best effort: lokaler Zustand ist sofort weg, unabhängig davon, ob der
    // Request den Server erreicht.
    void firstValueFrom(this.http.post('/api/v1/auth/logout', {})).catch(() => undefined);
  }

  async passwortVergessen(email: string): Promise<void> {
    await firstValueFrom(this.http.post<void>('/api/v1/auth/passwort-vergessen', { email }));
  }

  async passwortSetzen(token: string, neuesPasswort: string): Promise<void> {
    await firstValueFrom(this.http.post<void>('/api/v1/auth/passwort-setzen', { token, neuesPasswort }));
  }
}
