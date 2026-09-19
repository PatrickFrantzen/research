// Nur relative Aufrufe und absolute Same-Origin-Aufrufe unter /api/ gelten
// als eigene API. Verhindert, dass CSRF-Header/Session-Handling
// versehentlich an externe Ziele geschickt wird (Issue #27).
export function istEigeneApi(url: string): boolean {
  if (url.startsWith('/api/')) {
    return true;
  }
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin && parsed.pathname.startsWith('/api/');
  } catch {
    return false;
  }
}
