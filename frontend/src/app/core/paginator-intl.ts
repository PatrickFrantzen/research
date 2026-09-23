// Deutsche Texte für mat-paginator (Material liefert nur Englisch). Bewusst
// nicht global registriert, sondern in der Komponente mit Paginator
// (wareneintrag-liste.ts), damit der Paginator lazy bleibt (Issue #73).
import { Injectable } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';

@Injectable()
export class DeutscherPaginatorIntl extends MatPaginatorIntl {
  override itemsPerPageLabel = 'Einträge pro Seite:';
  override nextPageLabel = 'Nächste Seite';
  override previousPageLabel = 'Vorherige Seite';
  override firstPageLabel = 'Erste Seite';
  override lastPageLabel = 'Letzte Seite';

  override getRangeLabel = (seite: number, proSeite: number, gesamt: number): string => {
    if (gesamt === 0 || proSeite === 0) return `0 von ${gesamt}`;
    const start = seite * proSeite;
    const ende = Math.min(start + proSeite, gesamt);
    return `${start + 1} – ${ende} von ${gesamt}`;
  };
}
