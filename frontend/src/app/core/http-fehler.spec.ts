import { HttpErrorResponse } from '@angular/common/http';
import { extrahiereFehlermeldung } from './http-fehler.js';

describe('extrahiereFehlermeldung', () => {
  it('returns the fallback for a non-HTTP error', () => {
    expect(extrahiereFehlermeldung(new Error('irgendwas'), 'Fallback')).toBe('Fallback');
  });

  it('returns a network-specific message for status 0', () => {
    const error = new HttpErrorResponse({ status: 0 });
    expect(extrahiereFehlermeldung(error, 'Fallback')).toContain('Keine Verbindung');
  });

  it('returns a session-expired message for status 401', () => {
    const error = new HttpErrorResponse({ status: 401 });
    expect(extrahiereFehlermeldung(error, 'Fallback')).toContain('Sitzung abgelaufen');
  });

  it('returns a permission message for status 403, ignoring the generic server message', () => {
    const error = new HttpErrorResponse({ status: 403, error: { message: 'Forbidden resource' } });
    expect(extrahiereFehlermeldung(error, 'Fallback')).toBe('Keine Berechtigung für diese Aktion.');
  });

  it('returns the server message when present as a string', () => {
    const error = new HttpErrorResponse({ status: 400, error: { message: 'AVV-Code ist ungültig.' } });
    expect(extrahiereFehlermeldung(error, 'Fallback')).toBe('AVV-Code ist ungültig.');
  });

  it('joins the server message when present as an array (class-validator)', () => {
    const error = new HttpErrorResponse({ status: 400, error: { message: ['Feld A fehlt', 'Feld B ist ungültig'] } });
    expect(extrahiereFehlermeldung(error, 'Fallback')).toBe('Feld A fehlt Feld B ist ungültig');
  });

  it('falls back when the server sends no message', () => {
    const error = new HttpErrorResponse({ status: 500, error: {} });
    expect(extrahiereFehlermeldung(error, 'Fallback')).toBe('Fallback');
  });
});
