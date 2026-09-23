import { TestBed } from '@angular/core/testing';
import { MatBottomSheet, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { provideRouter, Router } from '@angular/router';
import { EMPTY, Subject } from 'rxjs';
import { AuthService } from '../auth.service.js';
import { ThemeService } from '../theme.service.js';
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

  it('links to the Impressum in the desktop footer', () => {
    const fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('footer.desktop-footer a') as HTMLAnchorElement | null;
    expect(link?.getAttribute('href')).toBe('/impressum');
  });

  it('toggles the color mode from the desktop toolbar', () => {
    const umschaltenSpy = spyOn(TestBed.inject(ThemeService), 'umschalten');
    const fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.desktop-toolbar [data-testid="farbmodus-umschalten"]') as HTMLButtonElement).click();

    expect(umschaltenSpy).toHaveBeenCalled();
  });

  it('opens the Mehr bottom sheet with MehrMenu', () => {
    const bottomSheet = TestBed.inject(MatBottomSheet);
    const openSpy = spyOn(bottomSheet, 'open').and.returnValue({ afterDismissed: () => EMPTY } as unknown as MatBottomSheetRef);
    const fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();

    fixture.componentInstance.mehrOeffnen();

    const arg: unknown = openSpy.calls.mostRecent().args[0];
    expect(arg).toBe(MehrMenu);
  });

  it('returns focus to "Mehr" when the bottom sheet closes without navigation', () => {
    const bottomSheet = TestBed.inject(MatBottomSheet);
    const geschlossen = new Subject<void>();
    const openSpy = spyOn(bottomSheet, 'open').and.returnValue({ afterDismissed: () => geschlossen } as unknown as MatBottomSheetRef);
    const fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);

    fixture.componentInstance.mehrOeffnen();
    (document.activeElement as HTMLElement | null)?.blur();
    geschlossen.next();

    expect(openSpy.calls.mostRecent().args[1]).toEqual({ restoreFocus: false, ariaLabel: 'Weitere Aktionen' });
    expect(document.activeElement?.textContent).toContain('Mehr');
    fixture.nativeElement.remove();
  });

  it('names desktop and mobile navigation distinctly', () => {
    const fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();

    const namen = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('nav')).map((nav) => nav.getAttribute('aria-label'));
    expect(namen).toEqual(['Hauptnavigation', 'Mobile Navigation']);
    expect((fixture.nativeElement as HTMLElement).querySelector('main')).not.toBeNull();
  });

  it('logs out and navigates to /login', async () => {
    const fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();

    await fixture.componentInstance.logout();

    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });
});
