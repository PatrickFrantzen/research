import helmet, { type HelmetOptions } from 'helmet';
import type { EnvConfig } from './config/env.js';

// Browser-Security-Header/CSP für die same-origin ausgelieferte Angular-App
// (Issue #26). Google Fonts sind die einzige externe Quelle; der
// konfigurierte Object-Storage-Endpoint wird für zukünftige Foto-Anzeige
// zugelassen, da er je nach Umgebung wechselt (lokal MinIO, produktiv S3).
export function buildHelmetOptions(env: EnvConfig): HelmetOptions {
  const objectStorageOrigin = new URL(env.objectStorage.endpoint).origin;

  return {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', objectStorageOrigin],
        connectSrc: ["'self'", objectStorageOrigin],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'"],
      },
    },
    referrerPolicy: { policy: 'no-referrer' },
  };
}

export function konfiguriereSecurityHeaders(env: EnvConfig) {
  return helmet(buildHelmetOptions(env));
}
