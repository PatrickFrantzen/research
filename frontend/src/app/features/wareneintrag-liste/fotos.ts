// Eigene Datei statt im Detail-Dialog: die Liste braucht fotosVon sofort,
// den Dialog erst beim Öffnen (Lazy Chunk, Issue #116).
import { Wareneintrag } from '../../core/wareneintrag-api.js';

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
