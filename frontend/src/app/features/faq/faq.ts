// Häufige Fragen zu RE-SEARCH. Öffentlich erreichbar, ohne Login.
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-faq',
  imports: [MatButtonModule, MatCardModule, MatExpansionModule, RouterLink],
  templateUrl: './faq.html',
  styleUrl: './faq.scss',
})
export class Faq {}
