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

// Prüft das Foto und liest es sofort ein. Cloud-Fotos aus der Galerie (Google
// Fotos, OneDrive) sind nur Verweise, die beim späteren Upload ungültig sein
// können; die eigene Kopie im Speicher macht den Upload davon unabhängig und
// zeigt unlesbare Dateien schon bei der Auswahl.
export async function uebernehmeFoto(auswahl: File): Promise<{ datei: File | null; meldung: string | null }> {
  const meldung = pruefeFoto(auswahl);
  if (meldung) return { datei: null, meldung };
  try {
    return { datei: new File([await auswahl.arrayBuffer()], auswahl.name, { type: auswahl.type }), meldung: null };
  } catch {
    return {
      datei: null,
      meldung: 'Foto konnte nicht gelesen werden. Bitte mit der Kamera aufnehmen oder erst auf dem Gerät speichern.',
    };
  }
}
