import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth.service.js';
import { PasswortVergessen } from './passwort-vergessen.js';

describe('PasswortVergessen', () => {
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['passwortVergessen']);
    await TestBed.configureTestingModule({
      imports: [PasswortVergessen],
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    }).compileComponents();
  });

  it('shows the same confirmation whether or not the request succeeds', async () => {
    authService.passwortVergessen.and.resolveTo();
    const fixture = TestBed.createComponent(PasswortVergessen);
    const component = fixture.componentInstance;
    component.email = 'jemand@example.com';

    await component.submit();

    expect(authService.passwortVergessen).toHaveBeenCalledWith('jemand@example.com');
    expect((component as unknown as { angefordert: () => boolean }).angefordert()).toBe(true);
  });

  it('shows the confirmation without throwing even when the request fails', async () => {
    authService.passwortVergessen.and.rejectWith(new Error('not found'));
    const fixture = TestBed.createComponent(PasswortVergessen);
    const component = fixture.componentInstance;
    component.email = 'jemand@example.com';

    await expectAsync(component.submit()).toBeResolved();

    expect((component as unknown as { angefordert: () => boolean }).angefordert()).toBe(true);
  });
});
