import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';
import { provideRouter, Router } from '@angular/router';
import { SwUpdate, UnrecoverableStateEvent, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { AppAktualisierung, SEITE_NEU_LADEN } from './app-aktualisierung.js';

@Component({ template: '' })
class Leer {}

const VERSION_BEREIT: VersionEvent = {
  type: 'VERSION_READY',
  currentVersion: { hash: 'alt' },
  latestVersion: { hash: 'neu' },
};

describe('AppAktualisierung', () => {
  let sw: {
    isEnabled: boolean;
    versionUpdates: Subject<VersionEvent>;
    unrecoverable: Subject<UnrecoverableStateEvent>;
    checkForUpdate: jasmine.Spy;
    activateUpdate: jasmine.Spy;
  };
  let neuLaden: jasmine.Spy;

  beforeEach(() => {
    sw = {
      isEnabled: true,
      versionUpdates: new Subject(),
      unrecoverable: new Subject(),
      checkForUpdate: jasmine.createSpy('checkForUpdate').and.resolveTo(false),
      activateUpdate: jasmine.createSpy('activateUpdate').and.resolveTo(true),
    };
    neuLaden = jasmine.createSpy('neuLaden');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'wareneintraege', component: Leer },
          { path: 'wareneintrag-erfassen', component: Leer },
        ]),
        { provide: SwUpdate, useValue: sw },
        { provide: SEITE_NEU_LADEN, useValue: neuLaden },
      ],
    });
  });

  async function gestartetAuf(url: string): Promise<AppAktualisierung> {
    await TestBed.inject(Router).navigateByUrl(url);
    const aktualisierung = TestBed.inject(AppAktualisierung);
    aktualisierung.init();
    return aktualisierung;
  }

  const abwarten = () => new Promise((resolve) => setTimeout(resolve));
  // Die Snackbar wird nachgeladen (dynamischer Import), das dauert ein paar Ticks.
  async function warteBis(bedingung: () => boolean): Promise<void> {
    for (let i = 0; i < 100 && !bedingung(); i++) await new Promise((resolve) => setTimeout(resolve, 10));
  }

  async function neueVersionBereit(): Promise<void> {
    sw.versionUpdates.next(VERSION_BEREIT);
    await abwarten();
  }

  it('prüft beim Start und bei jeder Rückkehr in den Vordergrund auf eine neue Version', async () => {
    await gestartetAuf('/wareneintraege');
    expect(sw.checkForUpdate).toHaveBeenCalledTimes(1);

    document.dispatchEvent(new Event('visibilitychange'));

    expect(sw.checkForUpdate).toHaveBeenCalledTimes(2);
  });

  it('aktiviert eine neue Version und lädt die Seite automatisch neu', async () => {
    await gestartetAuf('/wareneintraege');

    await neueVersionBereit();

    expect(sw.activateUpdate).toHaveBeenCalled();
    expect(neuLaden).toHaveBeenCalled();
  });

  it('fragt auf Formularseiten nach, statt Eingaben durch Neuladen zu verwerfen', async () => {
    const aktion = new Subject<void>();
    const open = spyOn(TestBed.inject(MatSnackBar), 'open').and.returnValue({
      onAction: () => aktion,
    } as unknown as MatSnackBarRef<TextOnlySnackBar>);
    await gestartetAuf('/wareneintrag-erfassen');

    await neueVersionBereit();
    await warteBis(() => open.calls.any());
    expect(neuLaden).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledWith('Neue Version verfügbar.', 'Neu laden', jasmine.anything());

    aktion.next();
    await warteBis(() => neuLaden.calls.any());
    expect(neuLaden).toHaveBeenCalled();
  });

  it('fragt auch bei offenem Dialog nach', async () => {
    const open = spyOn(TestBed.inject(MatSnackBar), 'open').and.returnValue({
      onAction: () => new Subject<void>(),
    } as unknown as MatSnackBarRef<TextOnlySnackBar>);
    await gestartetAuf('/wareneintraege');
    TestBed.inject(MatDialog).open(Leer);

    await neueVersionBereit();
    await warteBis(() => open.calls.any());

    expect(neuLaden).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalled();
    TestBed.inject(MatDialog).closeAll();
  });

  it('lädt neu, wenn der zwischengespeicherte Stand nicht mehr nutzbar ist', async () => {
    await gestartetAuf('/wareneintraege');

    sw.unrecoverable.next({ type: 'UNRECOVERABLE_STATE', reason: 'weg' });

    expect(neuLaden).toHaveBeenCalled();
  });

  it('tut ohne Service Worker (Entwicklung) nichts', async () => {
    sw.isEnabled = false;

    await gestartetAuf('/wareneintraege');

    expect(sw.checkForUpdate).not.toHaveBeenCalled();
  });
});
