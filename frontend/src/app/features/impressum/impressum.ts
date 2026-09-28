// Impressum mit den Angaben nach § 5 DDG (Issues #18, #105). Öffentlich
// erreichbar, ohne Login. Die Steuernummer ist keine Pflichtangabe, sie steht
// auf Patricks Wunsch drin.
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
