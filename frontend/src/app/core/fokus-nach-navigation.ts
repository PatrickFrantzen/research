// Fokusmanagement nach Seitenwechsel (Issue #54): Bei einer Single-Page-App
// bleibt der Fokus nach einer Navigation sonst auf dem geklickten Link oder
// fällt auf <body> zurück – Screenreader bekommen den Seitenwechsel nicht
// mit, Tastaturnutzer starten wieder oben. Deshalb nach jeder Navigation
// (außer dem ersten Laden) die Hauptüberschrift der neuen Seite fokussieren.
import { DOCUMENT } from '@angular/common';
import { afterNextRender, DestroyRef, inject, Injector } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, skip } from 'rxjs';

export function fokussiereUeberschriftNachNavigation(): void {
  const router = inject(Router);
  const injector = inject(Injector);
  const document = inject(DOCUMENT);

  router.events
    .pipe(
      filter((event) => event instanceof NavigationEnd),
      skip(1),
      takeUntilDestroyed(inject(DestroyRef)),
    )
    .subscribe(() => {
      // Erst nach dem Rendern der neuen (lazy geladenen) Seite.
      afterNextRender(
        () => {
          const ziel = document.querySelector<HTMLElement>('h1') ?? document.querySelector<HTMLElement>('main');
          if (!ziel) return;
          if (!ziel.hasAttribute('tabindex')) ziel.setAttribute('tabindex', '-1');
          ziel.focus();
        },
        { injector },
      );
    });
}
