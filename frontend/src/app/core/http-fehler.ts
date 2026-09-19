import { HttpErrorResponse } from '@angular/common/http';

// Übersetzt eine fehlgeschlagene API-Antwort in eine für den Nutzer
// verständliche, möglichst konkrete Meldung, statt immer denselben
// generischen Text zu zeigen.
export function extrahiereFehlermeldung(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }
  if (error.status === 0) {
    return 'Keine Verbindung zum Server möglich. Bitte Internetverbindung prüfen und erneut versuchen.';
  }
  if (error.status === 401) {
    return 'Sitzung abgelaufen. Bitte erneut einloggen.';
  }
  if (error.status === 403) {
    return 'Keine Berechtigung für diese Aktion.';
  }

  const body = error.error as { message?: string | string[] } | null;
  const serverMessage = Array.isArray(body?.message) ? body.message.join(' ') : body?.message;
  return serverMessage || fallback;
}
