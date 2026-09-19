import { TestBed } from '@angular/core/testing';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../auth.service.js';
import { MehrMenu } from './mehr-menu.js';

describe('MehrMenu', () => {
  let authService: { logout: jasmine.Spy };
  let bottomSheetRef: { dismiss: jasmine.Spy };
  let router: Router;

  beforeEach(async () => {
    authService = { logout: jasmine.createSpy('logout') };
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
