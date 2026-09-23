// Router-Tests für öffentliche Routen und die Not-found-Route (Issues #18, #58).
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes.js';
import { AuthService } from './core/auth.service.js';
import { Impressum } from './features/impressum/impressum.js';
import { NichtGefunden } from './features/nicht-gefunden/nicht-gefunden.js';

describe('app routes', () => {
  const istEingeloggt = signal(false);

  beforeEach(() => {
    istEingeloggt.set(false);
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), { provide: AuthService, useValue: { istEingeloggt } }],
    });
  });

  it('shows the Impressum without a session', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/impressum', Impressum);

    expect(TestBed.inject(Router).url).toBe('/impressum');
  });

  it('shows the not-found page with a way back to the login for unknown URLs without a session', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/gibt-es-nicht', NichtGefunden);

    expect(TestBed.inject(Router).url).toBe('/gibt-es-nicht');
    const link = harness.routeNativeElement?.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/login');
  });

  it('shows the not-found page with a way back to the start page for unknown URLs with a session', async () => {
    istEingeloggt.set(true);
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/wareneintraege/gibt-es-nicht', NichtGefunden);

    const link = harness.routeNativeElement?.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/');
  });
});
