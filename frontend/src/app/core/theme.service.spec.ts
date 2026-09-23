import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service.js';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.removeItem('farbmodus');
    document.documentElement.style.colorScheme = '';
  });

  afterEach(() => {
    localStorage.removeItem('farbmodus');
    document.documentElement.style.colorScheme = '';
  });

  it('follows the system setting as long as nothing was chosen', () => {
    const service = TestBed.inject(ThemeService);
    TestBed.tick();

    const systemDunkel = window.matchMedia('(prefers-color-scheme: dark)').matches;
    expect(service.modus()).toBe(systemDunkel ? 'dunkel' : 'hell');
    expect(document.documentElement.style.colorScheme).toBe('');
  });

  it('toggles the mode, applies it to the document and persists it', () => {
    const service = TestBed.inject(ThemeService);
    const vorher = service.modus();

    service.umschalten();
    TestBed.tick();

    const erwartet = vorher === 'dunkel' ? 'hell' : 'dunkel';
    expect(service.modus()).toBe(erwartet);
    expect(document.documentElement.style.colorScheme).toBe(erwartet === 'dunkel' ? 'dark' : 'light');
    expect(localStorage.getItem('farbmodus')).toBe(erwartet);
  });

  it('restores the stored mode on start', () => {
    localStorage.setItem('farbmodus', 'dunkel');

    const service = TestBed.inject(ThemeService);
    TestBed.tick();

    expect(service.modus()).toBe('dunkel');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });
});
