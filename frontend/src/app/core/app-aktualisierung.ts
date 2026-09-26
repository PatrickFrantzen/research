import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, InjectionToken, Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';

export const SEITE_NEU_LADEN = new InjectionToken<() => void>('SEITE_NEU_LADEN', {
  providedIn: 'root',
  factory: () => {
    const document = inject(DOCUMENT);
    return () => document.location.reload();
  },
});

// Hier würde ein automatisches Neuladen Eingaben verwerfen.
const FORMULAR_SEITEN = ['/wareneintrag-erfassen', '/nutzer-anlegen', '/einstellungen'];

// Holt neue Versionen ohne manuelles Schließen der App: prüft beim Start und
// bei jeder Rückkehr in den Vordergrund, lädt bei neuer Version neu bzw.
// fragt auf Formularseiten nach.
@Injectable({ providedIn: 'root' })
export class AppAktualisierung {
  private readonly sw = inject(SwUpdate);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  private readonly neuLaden = inject(SEITE_NEU_LADEN);
  private readonly destroyRef = inject(DestroyRef);

  init(): void {
    if (!this.sw.isEnabled) return;
    this.sw.versionUpdates
      .pipe(filter((event) => event.type === 'VERSION_READY'))
      .subscribe(() => void this.neueVersionBereit());
    // Cache kaputt (z.B. vom Browser geräumt): nur ein Neuladen hilft.
    this.sw.unrecoverable.subscribe(() => this.neuLaden());
    this.pruefe();
    const beiRueckkehr = () => {
      if (this.document.visibilityState === 'visible') this.pruefe();
    };
    this.document.addEventListener('visibilitychange', beiRueckkehr);
    this.destroyRef.onDestroy(() => this.document.removeEventListener('visibilitychange', beiRueckkehr));
  }

  private pruefe(): void {
    this.sw.checkForUpdate().catch(() => undefined);
  }

  private async neueVersionBereit(): Promise<void> {
    const pfad = this.router.url.split('?')[0];
    // Dialog per DOM statt MatDialog und Snackbar erst bei Bedarf laden: der
    // Dienst läuft beim App-Start, Material hier sprengt das Start-Bundle.
    const dialogOffen = this.document.querySelector('mat-dialog-container') !== null;
    if (FORMULAR_SEITEN.includes(pfad) || dialogOffen) {
      const { MatSnackBar } = await import('@angular/material/snack-bar');
      this.injector
        .get(MatSnackBar)
        .open('Neue Version verfügbar.', 'Neu laden', { duration: 0 })
        .onAction()
        .subscribe(() => void this.aktivierenUndNeuLaden());
      return;
    }
    await this.aktivierenUndNeuLaden();
  }

  private async aktivierenUndNeuLaden(): Promise<void> {
    await this.sw.activateUpdate().catch(() => undefined);
    this.neuLaden();
  }
}
