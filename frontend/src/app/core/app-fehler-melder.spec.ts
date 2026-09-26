import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppFehlerMelder, MeldenderErrorHandler } from './app-fehler-melder.js';
import { AuthService } from './auth.service.js';

describe('AppFehlerMelder', () => {
  let httpMock: HttpTestingController;
  const istEingeloggt = signal(true);

  beforeEach(() => {
    istEingeloggt.set(true);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { istEingeloggt } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('meldet einen Fehler mit aktueller Seite an den Server', () => {
    TestBed.inject(AppFehlerMelder).melde('Foto abgelehnt');

    const request = httpMock.expectOne('/api/v1/protokoll/app-fehler');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ meldung: 'Foto abgelehnt', seite: '/' });
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('meldet nichts ohne Login (der Server würde es ablehnen)', () => {
    istEingeloggt.set(false);

    TestBed.inject(AppFehlerMelder).melde('egal');

    httpMock.expectNone('/api/v1/protokoll/app-fehler');
  });

  it('meldet unerwartete Fehler aus der App über den globalen ErrorHandler', () => {
    spyOn(console, 'error');
    const handler = TestBed.runInInjectionContext(() => new MeldenderErrorHandler());

    handler.handleError(new Error('boom'));

    const request = httpMock.expectOne('/api/v1/protokoll/app-fehler');
    expect(request.request.body.meldung).toBe('Unerwarteter Fehler: boom');
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(console.error).toHaveBeenCalled();
  });
});
