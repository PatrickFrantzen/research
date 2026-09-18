import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth.service.js';

@Component({
  selector: 'app-start',
  templateUrl: './start.html',
  styleUrl: './start.scss',
})
export class Start {
  protected readonly authService = inject(AuthService);
}
