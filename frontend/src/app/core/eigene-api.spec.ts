import { istEigeneApi } from './eigene-api.js';

describe('istEigeneApi', () => {
  it('treats relative /api/ paths as own API', () => {
    expect(istEigeneApi('/api/v1/wareneintraege')).toBe(true);
  });

  it('treats absolute same-origin /api/ URLs as own API', () => {
    expect(istEigeneApi(`${window.location.origin}/api/v1/wareneintraege`)).toBe(true);
  });

  it('does not treat a third-party URL as own API', () => {
    expect(istEigeneApi('https://evil.example/steal')).toBe(false);
  });

  it('does not treat a relative non-/api/ path as own API', () => {
    expect(istEigeneApi('/assets/logo.png')).toBe(false);
  });
});
