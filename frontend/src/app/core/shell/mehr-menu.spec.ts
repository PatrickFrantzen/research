import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../auth.service.js';
import { ThemeService } from '../theme.service.js';
import { MehrMenu } from './mehr-menu.js';

describe('MehrMenu', () => {
  let authService: { logout: jasmine.Spy; istAdmin: WritableSignal<boolean> };
  let bottomSheetRef: { dismiss: jasmine.Spy };
  let router: Router;

  beforeEach(async () => {
    authService = { logout: jasmine.createSpy('logout'), istAdmin: signal(false) };
    bottomSheetRef = { dismiss: jasmine.createSpy('dismiss') };
    await TestBed.configureTestingModule({
      imports: [MehrMenu],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: MatBottomSheetRef, useValue: bottomSheetRef },
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
  });

  it('zeigt die Nutzerverwaltung nur Admins', () => {
    const fixture = TestBed.createComponent(MehrMenu);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('a[href="/nutzerverwaltung"]')).toBeNull();

    authService.istAdmin.set(true);
    fixture.detectChanges();
    expect(element.querySelector('a[href="/nutzerverwaltung"]')).not.toBeNull();
  });

  it('toggles the color mode on mobile via the Mehr menu', () => {
    const umschaltenSpy = spyOn(TestBed.inject(ThemeService), 'umschalten');
    const fixture = TestBed.createComponent(MehrMenu);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('[data-testid="farbmodus-umschalten"]') as HTMLButtonElement).click();

    expect(umschaltenSpy).toHaveBeenCalled();
  });

  it('dismisses the sheet on schliessen()', () => {
    const fixture = TestBed.createComponent(MehrMenu);
    fixture.detectChanges();

    fixture.componentInstance.schliessen();

    expect(bottomSheetRef.dismiss).toHaveBeenCalled();
  });

  it('dismisses the sheet, logs out and navigates to /login', async () => {
    const fixture = TestBed.createComponent(MehrMenu);
    fixture.detectChanges();

    await fixture.componentInstance.logout();

    expect(bottomSheetRef.dismiss).toHaveBeenCalled();
    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });
});
