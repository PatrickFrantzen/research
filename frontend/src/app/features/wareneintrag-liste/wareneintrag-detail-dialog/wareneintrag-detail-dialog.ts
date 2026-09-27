import { DatePipe } from '@angular/common';
import { Component, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Wareneintrag } from '../../../core/wareneintrag-api.js';

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
  imports: [DatePipe, MatButtonModule, MatDialogModule, MatIconModule],
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

  constructor() {
    afterNextRender(() => this.scrolleZu(this.position(), 'instant'));
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
