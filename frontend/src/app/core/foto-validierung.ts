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
