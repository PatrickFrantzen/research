import { TestBed } from '@angular/core/testing';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../auth.service.js';
import { MehrMenu } from './mehr-menu.js';
import { Shell } from './shell.js';

describe('Shell', () => {
  let authService: { rolle: () => string | null; logout: jasmine.Spy };
  let router: Router;

  beforeEach(async () => {
    authService = { rolle: () => 'MITARBEITER', logout: jasmine.createSpy('logout') };
    await TestBed.configureTestingModule({
      imports: [Shell],
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    }).compileComponents();
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
  });

  it('shows only the slim mobile title bar and the Mitarbeiter bottom nav for role MITARBEITER', () => {
    const fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(fixture.nativeElement.querySelector('.desktop-toolbar')).toBeNull();
    expect(text).toContain('Erfassen');
    expect(text).toContain('Einstellungen');
    expect(text).toContain('Logout');
    expect(text).not.toContain('Mitarbeiter anlegen');
    const logo = fixture.nativeElement.querySelector('.marke') as HTMLImageElement | null;
    expect(logo?.getAttribute('src')).toBe(
      'brand/re-search-header.svg',
    );
  });

  it('shows the desktop toolbar and the Vorgesetzter bottom nav (Liste, Erfassen, Mehr) for role VORGESETZTER', () => {
    authService.rolle = () => 'VORGESETZTER';
    const fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(fixture.nativeElement.querySelector('.desktop-toolbar')).not.toBeNull();
    expect(text).toContain('Wareneinträge');
    expect(text).toContain('Wareneintrag erfassen');
    expect(text).toContain('Mitarbeiter anlegen');
    expect(text).toContain('Mehr');
  });

  it('opens the Mehr bottom sheet with MehrMenu', () => {
    authService.rolle = () => 'VORGESETZTER';
    const bottomSheet = TestBed.inject(MatBottomSheet);
    const openSpy = spyOn(bottomSheet, 'open');
    const fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();

    fixture.componentInstance.mehrOeffnen();

    const arg: unknown = openSpy.calls.mostRecent().args[0];
    expect(arg).toBe(MehrMenu);
  });

  it('logs out and navigates to /login', async () => {
    const fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();

    await fixture.componentInstance.logout();

    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });
});
