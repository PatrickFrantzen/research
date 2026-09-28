// Datenschutzerklärung für den Demo- und Testbetrieb (Issue #107). Öffentlich
// erreichbar, ohne Login. Beschreibt die tatsächliche Verarbeitung im Code;
// ändert sich die (neue Dienste, Logs, Speicherdauer), hier nachziehen. Vor
// dem Echtbetrieb stellt der Kunde eine eigene, juristisch geprüfte Erklärung.
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-datenschutz',
  imports: [MatButtonModule, MatCardModule, RouterLink],
  templateUrl: './datenschutz.html',
  styleUrl: './datenschutz.scss',
})
export class Datenschutz {}
