import { Component, input } from '@angular/core';
import { KiAnalyseErgebnis } from '../../../core/wareneintrag-api.js';

// Feste Palette, Farbe nach Position: gleiche Reihenfolge, gleiche Farben.
const PALETTE = ['#1a73e8', '#e8710a', '#188038', '#d93025', '#9334e6', '#12a4af', '#f9ab00', '#80868b'];

// Darstellung einer KI-Analyse (Issue #93): gestapelter Balken plus Liste.
// Der Balken ist Deko, die Werte stehen vollständig in der Liste.
@Component({
  selector: 'app-ki-analyse-ergebnis',
  template: `
    @if (ergebnis().fraktionen.length) {
      <p class="beschriftung">Zusammensetzung, geschätzter Volumenanteil</p>
      <div class="balken" aria-hidden="true">
        @for (fraktion of ergebnis().fraktionen; track $index) {
          <span [style.width.%]="fraktion.anteilProzent" [style.background]="farbe($index)"></span>
        }
      </div>
      <ul class="fraktionen">
        @for (fraktion of ergebnis().fraktionen; track $index) {
          <li>
            <span class="punkt" [style.background]="farbe($index)"></span>
            <span class="name">{{ fraktion.name }}</span>
            <span>{{ fraktion.anteilProzent }} %</span>
          </li>
        }
        <li class="gesamt"><span class="name">Gesamt</span><span>100 %</span></li>
      </ul>
    } @else {
      <p data-testid="kein-abfall">Auf den Fotos ist kein Abfall erkennbar.</p>
    }
    <p class="einschaetzung" data-testid="einschaetzung">{{ ergebnis().einschaetzung }}</p>
    <p class="hinweis">KI-Schätzung aus den Fotos, keine Messung.</p>
  `,
  styles: `
    .beschriftung,
    .hinweis {
      font: var(--mat-sys-label-medium);
      color: var(--mat-sys-on-surface-variant);
      margin: 0 0 8px;
    }

    .balken {
      display: flex;
      height: 16px;
      border-radius: var(--mat-sys-corner-full);
      overflow: hidden;
    }

    .fraktionen {
      list-style: none;
      padding: 0;
      margin: 12px 0;

      li {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 0;
      }
    }

    .punkt {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex: none;
    }

    .name {
      flex: 1;
    }

    .gesamt {
      border-top: 1px solid var(--mat-sys-outline-variant);
      font-weight: 500;
    }

    .einschaetzung {
      margin: 0 0 8px;
    }
  `,
})
export class KiAnalyseErgebnisAnzeige {
  readonly ergebnis = input.required<KiAnalyseErgebnis>();

  protected farbe(index: number): string {
    return PALETTE[index % PALETTE.length];
  }
}
