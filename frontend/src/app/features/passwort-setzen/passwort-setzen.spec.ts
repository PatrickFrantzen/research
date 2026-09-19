import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth.service.js';
import { PasswortSetzen } from './passwort-setzen.js';

describe('PasswortSetzen', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  function setup(token: string | null) {
    return TestBed.configureTestingModule({
      imports: [PasswortSetzen],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(token ? { token } : {}) } },
        },
      ],
    }).compileComponents();
  }

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['passwortSetzen']);
  });

  it('sends the token from the query params along with the new password', async () => {
    authService.passwortSetzen.and.resolveTo();
    await setup('reset-token-123');
    const fixture = TestBed.createComponent(PasswortSetzen);
    const component = fixture.componentInstance;
    component.neuesPasswort = 'neuesGeheimnis1';

    await component.submit();

    expect(authService.passwortSetzen).toHaveBeenCalledWith('reset-token-123', 'neuesGeheimnis1');
    expect((component as unknown as { erfolgreich: () => boolean }).erfolgreich()).toBe(true);
  });

  it('redirects to /login after a short delay on success', fakeAsync(async () => {
    authService.passwortSetzen.and.resolveTo();
    await setup('reset-token-123');
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    const fixture = TestBed.createComponent(PasswortSetzen);

    await fixture.componentInstance.submit();
    tick(2000);

    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  }));

  it('shows an error when the token is invalid or expired', async () => {
    authService.passwortSetzen.and.rejectWith(new Error('invalid token'));
    await setup('abgelaufener-token');
    const fixture = TestBed.createComponent(PasswortSetzen);

    await fixture.componentInstance.submit();

    expect((fixture.componentInstance as unknown as { fehler: () => string | null }).fehler()).toBe(
      'Link ist ungültig oder abgelaufen.',
    );
  });

  it('removes the reset token from the visible URL/browser history right after reading it', async () => {
    authService.passwortSetzen.and.resolveTo();
    await setup('reset-token-123');
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);

    TestBed.createComponent(PasswortSetzen);

    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ queryParams: {}, replaceUrl: true }));
  });
});
