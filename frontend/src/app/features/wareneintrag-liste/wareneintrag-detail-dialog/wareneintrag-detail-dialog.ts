import { DatePipe } from '@angular/common';
import { Component, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import { extrahiereFehlermeldung } from '../../../core/http-fehler.js';
import { KiAnalyseErgebnis, Wareneintrag, WareneintragApi } from '../../../core/wareneintrag-api.js';
import { KiAnalyseErgebnisAnzeige } from '../ki-analyse-ergebnis/ki-analyse-ergebnis.js';

export interface WareneintragDetailDialogDaten {
  wareneintrag: Wareneintrag;
  startFoto: number;
}

export interface Foto {
  url: string;
  label: string;
}

// Vorhandene Fotos in fester Reihenfolge; Karte und Galerie zählen gleich,
// damit Klick auf Foto N die Galerie bei Foto N öffnet (Issue #92).
export function fotosVon(wareneintrag: Wareneintrag): Foto[] {
  const fotos: (Foto | null)[] = [
    wareneintrag.fotoFernUrl ? { url: wareneintrag.fotoFernUrl, label: 'Fernansicht' } : null,
    wareneintrag.fotoNahUrl ? { url: wareneintrag.fotoNahUrl, label: 'Nahansicht' } : null,
    wareneintrag.fotoDetailUrl ? { url: wareneintrag.fotoDetailUrl, label: 'Detailansicht' } : null,
  ];
  return fotos.filter((foto) => foto !== null);
}

// Galerie nativ: Swipen per CSS scroll-snap, Pfeil-Buttons und ←/→ scrollen
// dieselbe Spur. Die Position folgt dem Scrollstand, egal wodurch er kam.
@Component({
  selector: 'app-wareneintrag-detail-dialog',
  imports: [DatePipe, KiAnalyseErgebnisAnzeige, MatButtonModule, MatDialogModule, MatIconModule, MatProgressBarModule, MatTooltipModule],
  templateUrl: './wareneintrag-detail-dialog.html',
  styleUrl: './wareneintrag-detail-dialog.scss',
  host: {
    '(keydown.arrowleft)': 'zeige(position() - 1); $event.preventDefault()',
    '(keydown.arrowright)': 'zeige(position() + 1); $event.preventDefault()',
  },
})
export class WareneintragDetailDialog {
  protected readonly daten = inject<WareneintragDetailDialogDaten>(MAT_DIALOG_DATA);
  protected readonly wareneintrag = this.daten.wareneintrag;
  protected readonly fotos = fotosVon(this.wareneintrag);
  protected readonly position = signal(this.daten.startFoto);
  private readonly spur = viewChild<ElementRef<HTMLElement>>('spur');
  private readonly wareneintragApi = inject(WareneintragApi);

  // Vorschau, noch nicht gespeichert (Speichern folgt mit Issue #94).
  protected readonly analyse = signal<KiAnalyseErgebnis | null>(null);
  protected readonly analyseLaeuft = signal(false);
  protected readonly analyseFehler = signal<string | null>(null);

  constructor() {
    afterNextRender(() => this.scrolleZu(this.position(), 'instant'));
  }

  protected async analysieren(): Promise<void> {
    this.analyseLaeuft.set(true);
    this.analyseFehler.set(null);
    try {
      this.analyse.set(await firstValueFrom(this.wareneintragApi.analysieren(this.wareneintrag.id)));
    } catch (error) {
      this.analyseFehler.set(extrahiereFehlermeldung(error, 'Die KI-Analyse ist fehlgeschlagen. Bitte später erneut versuchen.'));
    } finally {
      this.analyseLaeuft.set(false);
    }
  }

  protected zeige(index: number): void {
    if (index < 0 || index >= this.fotos.length) return;
    this.position.set(index);
    this.scrolleZu(index, 'smooth');
  }

  protected onScroll(): void {
    const spur = this.spur()?.nativeElement;
    if (spur?.clientWidth) this.position.set(Math.round(spur.scrollLeft / spur.clientWidth));
  }

  private scrolleZu(index: number, behavior: ScrollBehavior): void {
    const spur = this.spur()?.nativeElement;
    spur?.scrollTo({ left: index * spur.clientWidth, behavior });
  }
}
