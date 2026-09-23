import { describe, expect, it } from 'vitest';
import { assertNichtDefaultBootstrapPasswort } from './seed-initial-nutzer-guard.js';

describe('assertNichtDefaultBootstrapPasswort', () => {
  it('rejects known default bootstrap passwords in production', () => {
    expect(() => assertNichtDefaultBootstrapPasswort('change-me-now', 'production')).toThrow(
      /INITIAL_NUTZER_PASSWORT.*insecure default/i,
    );
    expect(() => assertNichtDefaultBootstrapPasswort('change-me', 'production')).toThrow(
      /INITIAL_NUTZER_PASSWORT.*insecure default/i,
    );
  });

  it('allows the same default bootstrap password outside production', () => {
    expect(() => assertNichtDefaultBootstrapPasswort('change-me-now', 'development')).not.toThrow();
  });

  it('allows a non-default bootstrap password in production', () => {
    expect(() => assertNichtDefaultBootstrapPasswort('ein-echt-starkes-passwort-42', 'production')).not.toThrow();
  });
});
