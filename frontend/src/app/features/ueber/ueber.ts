// "Über RE-SEARCH": Idee, Konzept und Umsetzung. Öffentlich erreichbar, ohne
// Login; die Pflichtangaben stehen weiterhin im Impressum.
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-ueber',
  imports: [MatButtonModule, MatCardModule, RouterLink],
  templateUrl: './ueber.html',
  styleUrl: './ueber.scss',
})
export class Ueber {}
