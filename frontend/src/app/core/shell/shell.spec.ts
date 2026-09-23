import { TestBed } from '@angular/core/testing';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../auth.service.js';
import { MehrMenu } from './mehr-menu.js';
import { Shell } from './shell.js';

describe('Shell', () => {
  let authService: { logout: jasmine.Spy };
  let router: Router;

  beforeEach(async () => {
    authService = { logout: jasmine.createSpy('logout') };
    await TestBed.configureTestingModule({
      imports: [Shell],
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    }).compileComponents();
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
  });

  it('shows the same navigation for every Nutzer: desktop toolbar, mobile title bar and bottom nav', () => {
    const fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(fixture.nativeElement.querySelector('.desktop-toolbar')).not.toBeNull();
    expect(text).toContain('Wareneinträge');
    expect(text).toContain('Wareneintrag erfassen');
    expect(text).toContain('Nutzer anlegen');
    expect(text).toContain('Einstellungen');
    expect(text).toContain('Erfassen');
    expect(text).toContain('Mehr');
    const logo = fixture.nativeElement.querySelector('.marke') as HTMLImageElement | null;
    expect(logo?.getAttribute('src')).toBe('brand/re-search-header.svg');
  });

  it('opens the Mehr bottom sheet with MehrMenu', () => {
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
