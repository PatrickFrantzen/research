// Impressum-Seite mit Platzhaltern für die Pflichtangaben nach § 5 DDG
// (Issue #18). Öffentlich erreichbar, ohne Login. Die echten Angaben liegen
// noch nicht vor – sie werden später nur im Template ersetzt, das Layout
// bleibt gleich.
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-impressum',
  imports: [MatButtonModule, MatCardModule, RouterLink],
  templateUrl: './impressum.html',
  styleUrl: './impressum.scss',
})
export class Impressum {}
