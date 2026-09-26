// E-Mails werden klein gespeichert und verglichen, sonst scheitert der Login
// an "Thomas@..." vs. "thomas@...".
export function normalisiereEmail(email: string): string {
  return email.trim().toLowerCase();
}
