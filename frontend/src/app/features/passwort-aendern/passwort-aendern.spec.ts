import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service.js';
import { PasswortAendern } from './passwort-aendern.js';

describe('PasswortAendern', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['passwortAendern', 'logout']);
    await TestBed.configureTestingModule({
      imports: [PasswortAendern],
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    }).compileComponents();
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
  });

  it('changes the password and continues to the start page', async () => {
    authService.passwortAendern.and.resolveTo();
    const snackBar = spyOn(TestBed.inject(MatSnackBar), 'open');
    const component = TestBed.createComponent(PasswortAendern).componentInstance;
    component.neuesPasswort = 'Eigenes-Passwort-1';
    component.wiederholung = 'Eigenes-Passwort-1';

    await component.submit();

    expect(authService.passwortAendern).toHaveBeenCalledWith('Eigenes-Passwort-1');
    expect(snackBar).toHaveBeenCalledWith('Passwort geändert.', undefined, { duration: 3000 });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('does not submit when the repetition does not match', async () => {
    const fixture = TestBed.createComponent(PasswortAendern);
    const component = fixture.componentInstance;
    component.neuesPasswort = 'Eigenes-Passwort-1';
    component.wiederholung = 'Eigenes-Passwort-2';
    fixture.detectChanges();

    await component.submit();

    expect(authService.passwortAendern).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="passwort-ungleich"]')).not.toBeNull();
  });

  it('shows the server message, e.g. when the initial password is kept', async () => {
    authService.passwortAendern.and.rejectWith(
      new HttpErrorResponse({ status: 400, error: { message: 'Das neue Passwort muss sich vom Initialpasswort unterscheiden.' } }),
    );
    const fixture = TestBed.createComponent(PasswortAendern);
    const component = fixture.componentInstance;
    component.neuesPasswort = 'Initial-Passwort-1';
    component.wiederholung = 'Initial-Passwort-1';

    await component.submit();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent).toContain(
      'vom Initialpasswort unterscheiden',
    );
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('lets the user log out instead', async () => {
    const component = TestBed.createComponent(PasswortAendern).componentInstance;

    await component.abmelden();

    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });
});
