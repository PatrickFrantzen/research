import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth.service.js';
import { Login } from './login.js';

describe('Login', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['login', 'logout']);
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
  });

  it('navigates to the start page on successful login', async () => {
    authService.login.and.resolveTo({ mussPasswortSetzen: false });
    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;
    (component as unknown as { loginDaten: { set: (value: { email: string; passwort: string }) => void } }).loginDaten.set({
      email: 'vorgesetzter@example.com',
      passwort: 'langes-geheimnis',
    });

    await component.submit();

    expect(authService.login).toHaveBeenCalledWith('vorgesetzter@example.com', 'langes-geheimnis');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('allows existing passwords shorter than the new password policy on login', async () => {
    authService.login.and.resolveTo({ mussPasswortSetzen: false });
    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;
    (component as unknown as { loginDaten: { set: (value: { email: string; passwort: string }) => void } }).loginDaten.set({
      email: 'vorgesetzter@example.com',
      passwort: 'geheim123',
    });

    await component.submit();

    expect(authService.login).toHaveBeenCalledWith('vorgesetzter@example.com', 'geheim123');
  });

  it('handles the native form submit without a browser navigation', () => {
    authService.login.and.resolveTo({ mussPasswortSetzen: false });
    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;
    (component as unknown as { loginDaten: { set: (value: { email: string; passwort: string }) => void } }).loginDaten.set({
      email: 'vorgesetzter@example.com',
      passwort: 'geheim123',
    });
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    const event = new Event('submit', { bubbles: true, cancelable: true });

    form.dispatchEvent(event);

    expect(event.defaultPrevented).toBeTrue();
    expect(authService.login).toHaveBeenCalledWith('vorgesetzter@example.com', 'geheim123');
  });

  it('does not submit an invalid login form', async () => {
    const fixture = TestBed.createComponent(Login);

    await fixture.componentInstance.submit();

    expect(authService.login).not.toHaveBeenCalled();
  });

  it('shows a hint and logs out again when the account still needs a password set', async () => {
    authService.login.and.resolveTo({ mussPasswortSetzen: true });
    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;
    (component as unknown as { loginDaten: { set: (value: { email: string; passwort: string }) => void } }).loginDaten.set({
      email: 'vorgesetzter@example.com',
      passwort: 'langes-geheimnis',
    });

    await component.submit();

    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect((component as unknown as { fehler: () => string | null }).fehler()).toContain('Passwort gesetzt werden');
  });

  it('shows an error message when login fails', async () => {
    authService.login.and.rejectWith(new Error('invalid credentials'));
    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;
    (component as unknown as { loginDaten: { set: (value: { email: string; passwort: string }) => void } }).loginDaten.set({
      email: 'vorgesetzter@example.com',
      passwort: 'langes-geheimnis',
    });

    await component.submit();

    expect((component as unknown as { fehler: () => string | null }).fehler()).toBe('E-Mail oder Passwort ungültig.');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('shows the large RE-SEARCH wordmark above the login form', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();

    const logo = fixture.nativeElement.querySelector('.login-logo') as HTMLImageElement | null;

    expect(logo?.getAttribute('src')).toBe('brand/re-search-large.svg');
    expect(logo?.alt).toBe('RE-SEARCH – Transparente Entsorgungswege');
  });

  it('lets the user toggle password visibility', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('[data-testid="login-passwort"]') as HTMLInputElement;
    const toggle = fixture.nativeElement.querySelector('[data-testid="passwort-sichtbarkeit"]') as HTMLButtonElement;

    expect(input.type).toBe('password');

    toggle.click();
    fixture.detectChanges();

    expect(input.type).toBe('text');
    expect(toggle.getAttribute('aria-label')).toBe('Passwort verbergen');
  });
});
