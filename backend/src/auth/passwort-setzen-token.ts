import { createHash, randomBytes } from 'node:crypto';

// Nur der Hash landet in der DB/den Logs, der Rohwert nur im per Mail bzw.
// direkt übergebenen Link. Verhindert Kontoübernahme bei DB-Leak oder
// Log-Zugriff (Issue #30). SHA-256 reicht, da der Rohwert bereits 256 Bit
// Zufall trägt. Gemeinsam genutzt von AuthService (Passwort-Reset) und
// NutzerService (Initial-Zugang), siehe Prisma-Schema-Kommentar zu
// passwortSetzenToken.
export function erzeugePasswortSetzenToken(): { rawToken: string; hashedToken: string } {
  const rawToken = randomBytes(32).toString('hex');
  return { rawToken, hashedToken: hashPasswortSetzenToken(rawToken) };
}

export function hashPasswortSetzenToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}
