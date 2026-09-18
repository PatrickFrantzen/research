import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AppShell } from './app-shell.js';
import { AuthService, Rolle } from '../auth.service.js';

describe('AppShell', () => {
  let authService: { rolle: () => Rolle | null; logout: () => void };

  beforeEach(async () => {
    authService = { rolle: () => null, logout: () => {} };
    await TestBed.configureTestingModule({
      imports: [AppShell],
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    }).compileComponents();
  });

  it('shows navigation for VORGESETZTER', () => {
    authService.rolle = () => 'VORGESETZTER';
    const fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Mitarbeiter anlegen');
    expect(text).toContain('Wareneinträge');
    expect(text).not.toContain('Wareneintrag erfassen');
  });

  it('shows navigation for MITARBEITER', () => {
    authService.rolle = () => 'MITARBEITER';
    const fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Wareneintrag erfassen');
    expect(text).not.toContain('Mitarbeiter anlegen');
    expect(text).not.toContain('Wareneinträge');
  });

  it('shows Einstellungen and Logout for every role', () => {
    authService.rolle = () => 'MITARBEITER';
    const fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Einstellungen');
    expect(text).toContain('Logout');
  });

  it('logs out and navigates to /login', async () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl');
    spyOn(authService, 'logout');
    const fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();

    await fixture.componentInstance.logout();

    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });
});
