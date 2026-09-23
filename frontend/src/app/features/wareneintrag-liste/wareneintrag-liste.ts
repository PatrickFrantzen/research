import { DatePipe } from '@angular/common';
import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormField, form } from '@angular/forms/signals';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { debounceTime, distinctUntilChanged, firstValueFrom, Subject } from 'rxjs';
import { AuthService } from '../../core/auth.service.js';
import { AvvCodeApi } from '../../core/avv-code-api.js';
import { ConfirmDialog } from '../../core/confirm-dialog/confirm-dialog.js';
import { LadeZustand } from '../../core/lade-zustand/lade-zustand.js';
import { Wareneintrag, WareneintragApi } from '../../core/wareneintrag-api.js';
import { WareneintragBearbeitenDialog } from './wareneintrag-bearbeiten-dialog/wareneintrag-bearbeiten-dialog.js';

// Verzögerung, bevor Filteränderungen die Liste neu laden – analog zur
// AVV-Suche in wareneintrag-erfassen.
const FILTER_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-wareneintrag-liste',
  imports: [
    DatePipe,
    FormField,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    LadeZustand,
  ],
  templateUrl: './wareneintrag-liste.html',
  styleUrl: './wareneintrag-liste.scss',
})
export class WareneintragListe {
  private readonly avvCodeApi = inject(AvvCodeApi);
  private readonly wareneintragApi = inject(WareneintragApi);
  private readonly dialog = inject(MatDialog);
  protected readonly authService = inject(AuthService);

  readonly avvCodeId = signal<string | null>(null);
  readonly suche = signal('');
  readonly seite = signal(0);
  readonly proSeite = signal(20);

  protected readonly filterDaten = signal({ avvSucheAnzeige: '', suche: '' });
  protected readonly filterForm = form(this.filterDaten);
  protected loeschenLaeuft = false;
  private readonly avvSucheEingabe = new Subject<string>();
  private readonly avvSuchbegriff = signal('');
  private readonly sucheEingabe = new Subject<string>();

  private readonly avvSucheSubscription = this.avvSucheEingabe
    .pipe(debounceTime(FILTER_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
    .subscribe((wert) => this.avvSuchbegriff.set(wert));

  private readonly sucheSubscription = this.sucheEingabe
    .pipe(debounceTime(FILTER_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
    .subscribe((wert) => {
      this.seite.set(0);
      this.suche.set(wert);
    });

  protected readonly avvTreffer = rxResource({
    params: () => this.avvSuchbegriff(),
    stream: ({ params }) => this.avvCodeApi.suchen(params),
  });

  protected readonly wareneintraege = rxResource({
    params: () => ({
      avvCodeId: this.avvCodeId(),
      suche: this.suche(),
      seite: this.seite(),
      proSeite: this.proSeite(),
    }),
    stream: ({ params }) => this.wareneintragApi.liste(params),
  });

  // value() wirft im Fehlerzustand – Template und Handler lesen nur hierüber.
  protected readonly avvTrefferListe = computed(() => (this.avvTreffer.hasValue() ? this.avvTreffer.value() : []));

  // Letzte bekannte Gesamtzahl bleibt beim Blättern/Filtern stehen, bis die
  // neue Seite da ist – sonst springt der Paginator kurz auf „0 von 0“.
  protected readonly gesamt = linkedSignal<number | undefined, number>({
    source: () => (this.wareneintraege.hasValue() ? this.wareneintraege.value().gesamt : undefined),
    computation: (neu, vorher) => neu ?? vorher?.value ?? 0,
  });

  protected get avvSucheAnzeige(): string {
    return this.filterDaten().avvSucheAnzeige;
  }

  protected set avvSucheAnzeige(avvSucheAnzeige: string) {
    this.filterDaten.update((daten) => ({ ...daten, avvSucheAnzeige }));
  }

  onAvvSucheEingabe(wert: string): void {
    this.avvCodeId.set(null);
    this.seite.set(0);
    this.avvSucheEingabe.next(wert);
  }

  onAvvCodeAusgewaehlt(event: MatAutocompleteSelectedEvent): void {
    const avvCode = this.avvTrefferListe().find((treffer) => treffer.id === event.option.value);
    if (!avvCode) return;
    this.avvCodeId.set(avvCode.id);
    this.seite.set(0);
    this.avvSucheAnzeige = `${avvCode.code} – ${avvCode.bezeichnung}`;
  }

  onAvvSucheFokus(): void {
    if (!this.avvCodeId()) return;
    this.avvSucheAnzeige = '';
    this.avvSuchbegriff.set('');
    this.avvSucheEingabe.next('');
  }

  onSucheEingabe(wert: string): void {
    this.filterDaten.update((daten) => ({ ...daten, suche: wert }));
    this.sucheEingabe.next(wert);
  }

  onSeitenwechsel(event: PageEvent): void {
    this.seite.set(event.pageIndex);
    this.proSeite.set(event.pageSize);
  }

  // Nur der erfassende Nutzer darf seinen eigenen Wareneintrag
  // bearbeiten/löschen (nicht mehr rollenbasiert, siehe CONTEXT.md). Das
  // Backend erzwingt es zusätzlich – hier nur zur Anzeige der Buttons.
  protected istEigenerEintrag(wareneintrag: Wareneintrag): boolean {
    return wareneintrag.erfasstVon.id === this.authService.nutzerId();
  }

  bearbeitungOeffnen(wareneintrag: Wareneintrag): void {
    this.dialog
      .open(WareneintragBearbeitenDialog, { data: { wareneintrag } })
      .afterClosed()
      .subscribe((gespeichert) => {
        if (gespeichert) this.wareneintraege.reload();
      });
  }

  async loeschen(wareneintrag: Wareneintrag): Promise<void> {
    const bestaetigt = await firstValueFrom(
      this.dialog
        .open(ConfirmDialog, {
          data: {
            titel: 'Wareneintrag löschen',
            nachricht: `Möchten Sie den Wareneintrag „${wareneintrag.freitext}“ (AVV-Code ${wareneintrag.avvCode.code}) wirklich löschen?`,
            bestaetigenLabel: 'Löschen',
          },
        })
        .afterClosed(),
    );
    if (!bestaetigt) return;

    this.loeschenLaeuft = true;
    try {
      await firstValueFrom(this.wareneintragApi.loeschen(wareneintrag.id));
      this.wareneintraege.reload();
    } finally {
      this.loeschenLaeuft = false;
    }
  }
}
