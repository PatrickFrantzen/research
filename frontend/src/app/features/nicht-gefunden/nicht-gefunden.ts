// 404-Seite für unbekannte URLs (Issue #58). Liegt außerhalb der geschützten
// Shell, damit es ohne Session keine Redirect-Schleife gibt; der Rückweg
// richtet sich nach dem Login-Status.
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service.js';

@Component({
  selector: 'app-nicht-gefunden',
  imports: [MatButtonModule, MatCardModule, RouterLink],
  templateUrl: './nicht-gefunden.html',
})
export class NichtGefunden {
  protected readonly istEingeloggt = inject(AuthService).istEingeloggt;
}
