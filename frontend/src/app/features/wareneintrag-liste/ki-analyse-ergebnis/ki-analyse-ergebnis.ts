import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { KiAnalyseErgebnis } from '../../../core/wareneintrag-api.js';

// Urteil nie nur über Farbe: Icon und Text unterscheiden sich immer.
const URTEILE = {
  passt: { icon: 'check_circle', text: 'AVV-Code passt' },
  passt_eher_nicht: { icon: 'warning', text: 'AVV-Code passt eher nicht' },
  nicht_beurteilbar: { icon: 'help', text: 'AVV-Code nicht beurteilbar' },
} as const;

// Feste Palette, Farbe nach Position: gleiche Reihenfolge, gleiche Farben.
const PALETTE = ['#1a73e8', '#e8710a', '#188038', '#d93025', '#9334e6', '#12a4af', '#f9ab00', '#80868b'];

// Darstellung einer KI-Analyse (Issue #93): gestapelter Balken plus Liste.
// Der Balken ist Deko, die Werte stehen vollständig in der Liste.
@Component({
  selector: 'app-ki-analyse-ergebnis',
  imports: [MatIconModule],
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
    <!-- Nur Anzeige: übernommen wird ein Vorschlag über "Bearbeiten" (Issue #95). -->
    <div class="avv-pruefung" [class]="ergebnis().avvPruefung.urteil" data-testid="avv-pruefung">
      <p class="urteil">
        <mat-icon aria-hidden="true">{{ urteil().icon }}</mat-icon>
        {{ urteil().text }}
      </p>
      <p>{{ ergebnis().avvPruefung.begruendung }}</p>
      @if (ergebnis().avvPruefung.vorschlag; as vorschlag) {
        <p data-testid="avv-vorschlag">Vorschlag: {{ vorschlag.code }} – {{ vorschlag.bezeichnung }}</p>
      }
    </div>
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

    .avv-pruefung {
      border-inline-start: 4px solid var(--mat-sys-outline);
      padding-inline-start: 12px;
      margin-bottom: 8px;

      p {
        margin: 0 0 4px;
      }

      &.passt {
        border-color: var(--mat-sys-primary);
      }

      &.passt_eher_nicht {
        border-color: var(--mat-sys-error);
      }
    }

    .urteil {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 500;
    }
  `,
})
export class KiAnalyseErgebnisAnzeige {
  readonly ergebnis = input.required<KiAnalyseErgebnis>();
  protected readonly urteil = computed(() => URTEILE[this.ergebnis().avvPruefung.urteil]);

  protected farbe(index: number): string {
    return PALETTE[index % PALETTE.length];
  }
}
