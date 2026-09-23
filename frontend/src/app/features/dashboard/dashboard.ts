import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

// Nur auf Mobil-Breite erreichbar (siehe startseiteRedirectGuard) – Desktop
// zeigt an dieser Stelle weiterhin direkt die Wareneintrag-Liste.
@Component({
  selector: 'app-dashboard',
  imports: [MatCardModule, MatIconModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {}
