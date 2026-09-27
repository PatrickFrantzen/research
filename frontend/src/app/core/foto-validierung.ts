// Clientseitige Vorprüfung von Foto-Uploads (Issue #59): spiegelt die
// Backend-Regeln, damit ungültige Dateien vor dem Request verständlich
// abgelehnt werden. Verbindliche Sicherheitsgrenze bleibt das Backend
// (Magic-Byte-Prüfung in wareneintrag.controller.ts).
export const ERLAUBTE_FOTO_TYPEN = ['image/jpeg', 'image/png', 'image/webp'];
export const FOTO_MAX_GROESSE_BYTES = 10 * 1024 * 1024; // wie im Backend

export function pruefeFoto(datei: File): string | null {
  if (!ERLAUBTE_FOTO_TYPEN.includes(datei.type)) return 'Nur JPEG, PNG oder WebP erlaubt.';
  if (datei.size > FOTO_MAX_GROESSE_BYTES) return 'Datei ist größer als 10 MB.';
  return null;
}

// Für das Fehler-Log: woran genau ist das Foto gescheitert?
export function beschreibeFoto(datei: File): string {
  return `(Typ ${datei.type || 'unbekannt'}, ${(datei.size / 1024 / 1024).toFixed(1)} MB)`;
}

export const FOTO_MAX_KANTE_PX = 2000;
const FOTO_JPEG_QUALITAET = 0.85;

// Zielmaße für die Verkleinerung (Issue #91): längste Kante höchstens
// FOTO_MAX_KANTE_PX, Seitenverhältnis bleibt, nie hochskalieren.
export function zielMasse(breite: number, hoehe: number): { breite: number; hoehe: number } {
  const faktor = Math.min(1, FOTO_MAX_KANTE_PX / Math.max(breite, hoehe));
  return { breite: Math.round(breite * faktor), hoehe: Math.round(hoehe * faktor) };
}

// Rechnet das Foto per Canvas auf JPEG 85 % um, damit drei Fotos zusammen
// unter dem Inline-Limit der KI-Analyse bleiben. Kann der Browser das Bild
// nicht dekodieren, bleibt das Original; das Backend prüft ohnehin.
async function verkleinereFoto(datei: File): Promise<File> {
  let bild: ImageBitmap;
  try {
    bild = await createImageBitmap(datei);
  } catch {
    return datei;
  }
  const { breite, hoehe } = zielMasse(bild.width, bild.height);
  const canvas = document.createElement('canvas');
  canvas.width = breite;
  canvas.height = hoehe;
  canvas.getContext('2d')?.drawImage(bild, 0, 0, breite, hoehe);
  bild.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', FOTO_JPEG_QUALITAET));
  if (!blob) return datei;
  return new File([blob], datei.name.replace(/\.[^.]*$/, '') + '.jpg', { type: 'image/jpeg' });
}

// Prüft das Foto, liest es sofort ein und verkleinert es. Cloud-Fotos aus der
// Galerie (Google Fotos, OneDrive) sind nur Verweise, die beim späteren Upload
// ungültig sein können; die eigene Kopie im Speicher macht den Upload davon
// unabhängig und zeigt unlesbare Dateien schon bei der Auswahl. Die Größe wird
// erst nach dem Verkleinern geprüft, damit große Kamerafotos durchgehen.
export async function uebernehmeFoto(auswahl: File): Promise<{ datei: File | null; meldung: string | null }> {
  if (!ERLAUBTE_FOTO_TYPEN.includes(auswahl.type)) return { datei: null, meldung: 'Nur JPEG, PNG oder WebP erlaubt.' };
  let kopie: File;
  try {
    kopie = new File([await auswahl.arrayBuffer()], auswahl.name, { type: auswahl.type });
  } catch {
    return {
      datei: null,
      meldung: 'Foto konnte nicht gelesen werden. Bitte mit der Kamera aufnehmen oder erst auf dem Gerät speichern.',
    };
  }
  const datei = await verkleinereFoto(kopie);
  const meldung = pruefeFoto(datei);
  return meldung ? { datei: null, meldung } : { datei, meldung: null };
}
