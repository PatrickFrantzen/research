import { signal } from '@angular/core';
import { ResourceStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LadeZustand } from './lade-zustand.js';

describe('LadeZustand', () => {
  function erstelle(status: ResourceStatus) {
    const ressource = {
      status: signal(status),
      isLoading: signal(status === 'loading' || status === 'reloading'),
      reload: jasmine.createSpy('reload').and.returnValue(true),
    };
    const fixture = TestBed.createComponent(LadeZustand);
    fixture.componentRef.setInput('ressource', ressource);
    fixture.componentRef.setInput('meldung', 'Standorte konnten nicht geladen werden.');
    fixture.detectChanges();
    return { fixture, ressource, element: fixture.nativeElement as HTMLElement };
  }

  it('shows a progress bar while loading and reloading, but no error', () => {
    for (const status of ['loading', 'reloading'] as const) {
      const { element } = erstelle(status);
      expect(element.querySelector('mat-progress-bar')).not.toBeNull();
      expect(element.querySelector('[role="alert"]')).toBeNull();
    }
  });

  it('shows the error with a retry action that reloads the resource', () => {
    const { element, ressource } = erstelle('error');

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Standorte konnten nicht geladen werden.');
    (element.querySelector('[data-testid="erneut-laden"]') as HTMLButtonElement).click();

    expect(ressource.reload).toHaveBeenCalled();
  });

  it('renders nothing once the data is there', () => {
    const { element } = erstelle('resolved');

    expect(element.querySelector('mat-progress-bar')).toBeNull();
    expect(element.querySelector('[role="alert"]')).toBeNull();
  });
});
