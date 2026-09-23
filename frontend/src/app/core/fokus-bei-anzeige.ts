// Fokussiert das Element, sobald es erscheint (Issue #54). Für Meldungen, die
// ein Formular ersetzen oder nach fehlgeschlagenem Submit auftauchen: Der
// Submit-Button ist während des Requests deaktiviert und verliert dabei den
// Fokus, Tastatur- und Screenreader-Nutzer landen sonst auf <body>.
import { afterNextRender, Directive, ElementRef, inject } from '@angular/core';

@Directive({
  selector: '[appFokusBeiAnzeige]',
  host: { tabindex: '-1' },
})
export class FokusBeiAnzeige {
  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    afterNextRender(() => element.focus());
  }
}
