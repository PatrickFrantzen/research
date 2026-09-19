// Bekannte Platzhalterwerte aus docker-compose.yml/.env.example. Siehe Issue #29.
const KNOWN_DEFAULT_BOOTSTRAP_PASSWORTS = new Set(['change-me-now', 'change-me']);

export function assertNichtDefaultBootstrapPasswort(passwort: string, nodeEnv: string | undefined): void {
  if (nodeEnv === 'production' && KNOWN_DEFAULT_BOOTSTRAP_PASSWORTS.has(passwort)) {
    throw new Error(
      'Environment variable INITIAL_VORGESETZTER_PASSWORT still has an insecure default value. Set a strong password before running in production.',
    );
  }
}
