// Einheitliche Lade- und Fehleranzeige für Resource-basierte Ansichten
// (Issue #53): Fortschrittsbalken während Laden/Reload, Fehlermeldung mit
// Retry über reload(). Leer- und Datenzustand rendert die Ansicht selbst,
// geschützt über hasValue() – value() wirft im Fehlerzustand.
import { Component, Signal, input } from '@angular/core';
import { ResourceStatus } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';

export interface LadbareRessource {
  isLoading: Signal<boolean>;
  status: Signal<ResourceStatus>;
  reload(): boolean;
}

@Component({
  selector: 'app-lade-zustand',
  imports: [MatButtonModule, MatProgressBarModule],
  template: `
    @if (ressource().isLoading()) {
      <mat-progress-bar mode="indeterminate" aria-label="Wird geladen" />
    }
    @if (ressource().status() === 'error') {
      <div class="ladefehler" role="alert">
        <p>{{ meldung() }}</p>
        <button matButton="outlined" type="button" data-testid="erneut-laden" (click)="ressource().reload()">
          Erneut versuchen
        </button>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .ladefehler {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 16px;
      margin-bottom: 16px;
      color: var(--mat-sys-error);
    }

    p {
      margin: 0;
    }
  `,
})
export class LadeZustand {
  readonly ressource = input.required<LadbareRessource>();
  readonly meldung = input('Daten konnten nicht geladen werden.');
}
