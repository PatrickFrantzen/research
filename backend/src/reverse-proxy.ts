import type { NestExpressApplication } from '@nestjs/platform-express';

// In Produktion erreicht jede Anfrage die App nur über Caddy. Ohne
// `trust proxy` ist `req.ip` für alle Clients die Caddy-Adresse, womit sich
// alle Nutzer einen Throttle-Bucket teilen (Security-Audit run-1). Genau ein
// Hop wird vertraut, damit Clients die Adresse nicht per eigenem
// X-Forwarded-For-Header fälschen können.
export function vertraueReverseProxy(app: NestExpressApplication): void {
  app.set('trust proxy', 1);
}
