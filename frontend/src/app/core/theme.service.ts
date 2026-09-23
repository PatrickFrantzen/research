// Hell/Dunkel-Umschaltung (Issue #19). Ohne eigene Wahl folgt die App der
// Systemeinstellung (color-scheme: light dark in styles.scss); nach dem
// Umschalten gilt die gespeicherte Wahl. Material leitet alle --mat-sys-*-
// Tokens per light-dark() aus color-scheme ab, daher reicht es, diese eine
// Eigenschaft am <html> zu setzen.
import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';

export type Farbmodus = 'hell' | 'dunkel';

const SPEICHER_SCHLUESSEL = 'farbmodus';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly systemAbfrage = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');

  private readonly gewaehlt = signal<Farbmodus | null>(this.leseGespeichert());
  private readonly systemDunkel = signal(this.systemAbfrage?.matches ?? false);

  readonly modus = computed<Farbmodus>(() => this.gewaehlt() ?? (this.systemDunkel() ? 'dunkel' : 'hell'));

  constructor() {
    this.systemAbfrage?.addEventListener('change', (event) => this.systemDunkel.set(event.matches));
    effect(() => {
      const gewaehlt = this.gewaehlt();
      this.document.documentElement.style.colorScheme = gewaehlt === null ? '' : gewaehlt === 'dunkel' ? 'dark' : 'light';
    });
  }

  umschalten(): void {
    const neu: Farbmodus = this.modus() === 'dunkel' ? 'hell' : 'dunkel';
    this.gewaehlt.set(neu);
    try {
      localStorage.setItem(SPEICHER_SCHLUESSEL, neu);
    } catch {
      // Speicher gesperrt (z. B. privater Modus) – gilt dann nur für diese Sitzung.
    }
  }

  private leseGespeichert(): Farbmodus | null {
    try {
      const wert = localStorage.getItem(SPEICHER_SCHLUESSEL);
      return wert === 'hell' || wert === 'dunkel' ? wert : null;
    } catch {
      return null;
    }
  }
}
