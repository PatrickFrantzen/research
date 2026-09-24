import { Component, DestroyRef, ElementRef, computed, inject, signal, viewChildren } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormField, form, maxLength, required } from '@angular/forms/signals';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, firstValueFrom, Subject } from 'rxjs';
import { AvvCode, AvvCodeApi } from '../../core/avv-code-api.js';
import { pruefeFoto } from '../../core/foto-validierung.js';
import { extrahiereFehlermeldung } from '../../core/http-fehler.js';
import { FREITEXT_MAX_LAENGE, WareneintragApi } from '../../core/wareneintrag-api.js';
import { FokusBeiAnzeige } from '../../core/fokus-bei-anzeige.js';

// Die drei Ansichten sind optional – der Nutzer entscheidet selbst, wie
// viele Fotos er aufnimmt (0 bis 3), siehe CONTEXT.md.
type FotoAnsicht = 'fotoFern' | 'fotoNah' | 'fotoDetail';

interface FotoKachel {
  ansicht: FotoAnsicht;
  label: string;
}

const FOTO_KACHELN: FotoKachel[] = [
  { ansicht: 'fotoFern', label: 'Fernansicht' },
  { ansicht: 'fotoNah', label: 'Nahansicht' },
  { ansicht: 'fotoDetail', label: 'Detailansicht' },
];

// Verzögerung, bevor die AVV-Suche pro Tastenanschlag ausgelöst wird – die
// Liste hat 834 Einträge (Spezifikation Abschnitt 3.1), Anfragen bei jedem
// Zeichen wären unnötig.
const SUCHE_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-wareneintrag-erfassen',
  imports: [
    FokusBeiAnzeige,
    FormField,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    RouterLink,
  ],
  templateUrl: './wareneintrag-erfassen.html',
  styleUrl: './wareneintrag-erfassen.scss',
})
export class WareneintragErfassen {
  private readonly avvCodeApi = inject(AvvCodeApi);
  private readonly wareneintragApi = inject(WareneintragApi);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly fotoKacheln = FOTO_KACHELN;
  private readonly fotos: Record<FotoAnsicht, File | null> = { fotoFern: null, fotoNah: null, fotoDetail: null };
  private readonly fotoVorschauUrls = signal<Record<FotoAnsicht, string | null>>({
    fotoFern: null,
    fotoNah: null,
    fotoDetail: null,
  });

  protected readonly freitextMaxLaenge = FREITEXT_MAX_LAENGE;
  protected readonly wareneintragDaten = signal({ avvSucheAnzeige: '', freitext: '' });
  protected readonly wareneintragForm = form(this.wareneintragDaten, (pfad) => {
    required(pfad.freitext);
    maxLength(pfad.freitext, FREITEXT_MAX_LAENGE);
  });

  protected ausgewaehlterAvvCode: AvvCode | null = null;
  private readonly avvSucheEingabe = new Subject<string>();
  private readonly suchbegriff = signal('');

  private readonly avvSucheSubscription = this.avvSucheEingabe
    .pipe(debounceTime(SUCHE_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
    .subscribe((wert) => this.suchbegriff.set(wert));

  protected readonly avvTreffer = rxResource({
    params: () => this.suchbegriff(),
    stream: ({ params }) => this.avvCodeApi.suchen(params),
  });

  // value() wirft im Fehlerzustand – Template und Handler lesen nur hierüber.
  protected readonly avvTrefferListe = computed(() => (this.avvTreffer.hasValue() ? this.avvTreffer.value() : []));

  get avvSucheAnzeige(): string {
    return this.wareneintragDaten().avvSucheAnzeige;
  }

  set avvSucheAnzeige(avvSucheAnzeige: string) {
    this.wareneintragDaten.update((daten) => ({ ...daten, avvSucheAnzeige }));
  }

  get freitext(): string {
    return this.wareneintragDaten().freitext;
  }

  set freitext(freitext: string) {
    this.wareneintragDaten.update((daten) => ({ ...daten, freitext }));
  }

  constructor() {
    inject(DestroyRef).onDestroy(() => this.fotoVorschauenFreigeben());
  }

  protected readonly fehler = signal<string | null>(null);
  protected readonly fotoFehler = signal<string | null>(null);
  private readonly fotoInputs = viewChildren<ElementRef<HTMLInputElement>>('fotoInput');
  protected readonly wirdGeladen = signal(false);

  fotoVorschau(ansicht: FotoAnsicht): string | null {
    return this.fotoVorschauUrls()[ansicht];
  }

  onFotoAusgewaehlt(ansicht: FotoAnsicht, event: Event): void {
    const input = event.target as HTMLInputElement;
    const auswahl = input.files?.[0] ?? null;
    const meldung = auswahl ? pruefeFoto(auswahl) : null;
    const label = this.fotoKacheln.find((kachel) => kachel.ansicht === ansicht)?.label;
    this.fotoFehler.set(meldung ? `${label}: ${meldung}` : null);
    const datei = meldung ? null : auswahl;
    this.fotos[ansicht] = datei;
    this.setzeFotoVorschau(ansicht, datei);
  }

  // Object-URLs halten die Datei im Speicher, bis sie freigegeben werden –
  // daher alte URL bei Austausch, Reset und Destroy revoken (Issue #55).
  private setzeFotoVorschau(ansicht: FotoAnsicht, datei: File | null): void {
    const alteUrl = this.fotoVorschauUrls()[ansicht];
    if (alteUrl) URL.revokeObjectURL(alteUrl);
    this.fotoVorschauUrls.update((urls) => ({ ...urls, [ansicht]: datei ? URL.createObjectURL(datei) : null }));
  }

  private fotoVorschauenFreigeben(): void {
    for (const { ansicht } of this.fotoKacheln) this.setzeFotoVorschau(ansicht, null);
  }

  onAvvSucheEingabe(wert: string): void {
    this.ausgewaehlterAvvCode = null;
    this.avvSucheEingabe.next(wert);
  }

  onAvvCodeAusgewaehlt(event: MatAutocompleteSelectedEvent): void {
    const avvCode = this.avvTrefferListe().find((treffer) => treffer.id === event.option.value);
    if (!avvCode) return;
    this.ausgewaehlterAvvCode = avvCode;
    this.avvSucheAnzeige = `${avvCode.code} – ${avvCode.bezeichnung}`;
  }

  protected get kannAbsenden(): boolean {
    return (
      this.ausgewaehlterAvvCode !== null &&
      this.freitext.trim().length > 0 &&
      this.freitext.length <= FREITEXT_MAX_LAENGE
    );
  }

  async submit(): Promise<void> {
    if (!this.kannAbsenden || !this.ausgewaehlterAvvCode) {
      return;
    }
    this.fehler.set(null);
    this.wirdGeladen.set(true);
    try {
      const formData = new FormData();
      for (const { ansicht } of this.fotoKacheln) {
        const datei = this.fotos[ansicht];
        if (datei) formData.append(ansicht, datei);
      }
      formData.append('avvCodeId', this.ausgewaehlterAvvCode.id);
      formData.append('freitext', this.freitext);

      await firstValueFrom(this.wareneintragApi.erstellen(formData));
      // Direkt bereit für den nächsten Eintrag, Bestätigung per Snackbar.
      this.weitererEintrag();
      this.snackBar.open('Wareneintrag wurde angelegt.', undefined, { duration: 3000 });
    } catch (error) {
      this.fehler.set(extrahiereFehlermeldung(error, 'Wareneintrag konnte nicht angelegt werden.'));
    } finally {
      this.wirdGeladen.set(false);
    }
  }

  weitererEintrag(): void {
    // Sonst löst die erneute Auswahl derselben Datei kein change aus (Issue #59).
    for (const input of this.fotoInputs()) input.nativeElement.value = '';
    this.fotoFehler.set(null);
    this.fotos.fotoFern = null;
    this.fotos.fotoNah = null;
    this.fotos.fotoDetail = null;
    this.fotoVorschauenFreigeben();
    this.ausgewaehlterAvvCode = null;
    this.wareneintragDaten.set({ avvSucheAnzeige: '', freitext: '' });
    this.avvSucheEingabe.next('');
    this.suchbegriff.set('');
  }
}
