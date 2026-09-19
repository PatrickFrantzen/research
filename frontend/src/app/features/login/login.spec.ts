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
    component.email = 'vorgesetzter@example.com';
    component.passwort = 'geheim';

    await component.submit();

    expect(authService.login).toHaveBeenCalledWith('vorgesetzter@example.com', 'geheim');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('shows a hint and logs out again when the account still needs a password set', async () => {
    authService.login.and.resolveTo({ mussPasswortSetzen: true });
    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;

    await component.submit();

    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect((component as unknown as { fehler: () => string | null }).fehler()).toContain('Passwort gesetzt werden');
  });

  it('shows an error message when login fails', async () => {
    authService.login.and.rejectWith(new Error('invalid credentials'));
    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;

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
});
