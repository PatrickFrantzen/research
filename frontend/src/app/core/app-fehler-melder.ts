import { HttpClient } from '@angular/common/http';
import { ErrorHandler, Injectable, Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service.js';

// Meldet Fehler, die nur in der App auftreten (z.B. abgelehntes Foto), ans
// Fehler-Log des Servers (ADR-0007). Best effort: eine gescheiterte Meldung
// wird verschluckt, damit sie keinen weiteren Fehler auslöst.
@Injectable({ providedIn: 'root' })
export class AppFehlerMelder {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  melde(meldung: string): void {
    if (!this.authService.istEingeloggt()) return;
    const seite = this.router.url.split('?')[0].slice(0, 200);
    this.http
      .post<void>('/api/v1/protokoll/app-fehler', { meldung: meldung.slice(0, 500), seite })
      .subscribe({ error: () => undefined });
  }
}

@Injectable()
export class MeldenderErrorHandler implements ErrorHandler {
  // Lazy: der ErrorHandler entsteht vor Router/HttpClient.
  private readonly injector = inject(Injector);

  handleError(error: unknown): void {
    console.error(error);
    this.injector
      .get(AppFehlerMelder)
      .melde(`Unerwarteter Fehler: ${error instanceof Error ? error.message : String(error)}`);
  }
}
