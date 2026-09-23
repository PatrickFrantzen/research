import { Component, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormField, form, required } from '@angular/forms/signals';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { debounceTime, distinctUntilChanged, firstValueFrom, Subject } from 'rxjs';
import { AvvCodeApi } from '../../../core/avv-code-api.js';
import { extrahiereFehlermeldung } from '../../../core/http-fehler.js';
import { Wareneintrag, WareneintragApi } from '../../../core/wareneintrag-api.js';

export interface WareneintragBearbeitenDialogDaten {
  wareneintrag: Wareneintrag;
}

// Die drei Ansichten sind optional – wie beim Erfassen ersetzt der Nutzer
// nur, was er neu fotografieren möchte (0 bis 3), siehe CONTEXT.md.
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

// Eigene Debounce-Verzögerung statt einer geteilten Konstante mit der
// Liste: der Dialog hat eine eigene, vom Listenfilter entkoppelte
// AVV-Suche (siehe Kommentar in wareneintrag-liste.ts).
const AVV_SUCHE_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-wareneintrag-bearbeiten-dialog',
  imports: [
    FormField,
    MatAutocompleteModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './wareneintrag-bearbeiten-dialog.html',
  styles: `
    .fotos-ersetzen {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }

    .dateiname {
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class WareneintragBearbeitenDialog {
  private readonly avvCodeApi = inject(AvvCodeApi);
  private readonly wareneintragApi = inject(WareneintragApi);
  private readonly dialogRef = inject(MatDialogRef<WareneintragBearbeitenDialog>);
  protected readonly daten = inject<WareneintragBearbeitenDialogDaten>(MAT_DIALOG_DATA);

  // Vorbelegt mit dem aktuell zugewiesenen AVV-Code (Issue #66), damit
  // Speichern ohne AVV-Code-Änderung keine erneute Auswahl über die Suche
  // erfordert.
  private readonly avvCodeId = signal<string | null>(this.daten.wareneintrag.avvCode.id);
  protected readonly fotoKacheln = FOTO_KACHELN;
  private readonly fotos = signal<Record<FotoAnsicht, File | null>>({ fotoFern: null, fotoNah: null, fotoDetail: null });

  protected readonly bearbeitungDaten = signal({
    avvSucheAnzeige: `${this.daten.wareneintrag.avvCode.code} – ${this.daten.wareneintrag.avvCode.bezeichnung}`,
    freitext: this.daten.wareneintrag.freitext,
  });
  protected readonly bearbeitenForm = form(this.bearbeitungDaten, (pfad) => {
    required(pfad.freitext);
  });

  private readonly avvSucheEingabe = new Subject<string>();
  private readonly avvSuchbegriff = signal('');
  private readonly avvSucheSubscription = this.avvSucheEingabe
    .pipe(debounceTime(AVV_SUCHE_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
    .subscribe((wert) => this.avvSuchbegriff.set(wert));

  protected readonly avvTreffer = rxResource({
    params: () => this.avvSuchbegriff(),
    stream: ({ params }) => this.avvCodeApi.suchen(params),
  });

  protected speichernLaeuft = false;
  protected readonly fehler = signal<string | null>(null);

  get freitext(): string {
    return this.bearbeitungDaten().freitext;
  }

  protected get avvSucheAnzeige(): string {
    return this.bearbeitungDaten().avvSucheAnzeige;
  }

  protected set avvSucheAnzeige(avvSucheAnzeige: string) {
    this.bearbeitungDaten.update((daten) => ({ ...daten, avvSucheAnzeige }));
  }

  protected get kannSpeichern(): boolean {
    return this.avvCodeId() !== null && this.bearbeitenForm().valid() && !this.speichernLaeuft;
  }

  onAvvSucheEingabe(wert: string): void {
    this.avvCodeId.set(null);
    this.avvSucheEingabe.next(wert);
  }

  onAvvCodeAusgewaehlt(event: MatAutocompleteSelectedEvent): void {
    const avvCode = this.avvTreffer.value()?.find((treffer) => treffer.id === event.option.value);
    if (!avvCode) return;
    this.avvCodeId.set(avvCode.id);
    this.avvSucheAnzeige = `${avvCode.code} – ${avvCode.bezeichnung}`;
  }

  fotoErsetzen(ansicht: FotoAnsicht, event: Event): void {
    const input = event.target as HTMLInputElement;
    const datei = input.files?.item(0) ?? null;
    this.fotos.update((fotos) => ({ ...fotos, [ansicht]: datei }));
  }

  protected dateiname(ansicht: FotoAnsicht): string | null {
    return this.fotos()[ansicht]?.name ?? null;
  }

  async speichern(): Promise<void> {
    const avvCodeId = this.avvCodeId();
    if (!avvCodeId || !this.bearbeitenForm().valid()) return;
    this.fehler.set(null);
    this.speichernLaeuft = true;
    const formData = new FormData();
    formData.set('avvCodeId', avvCodeId);
    formData.set('freitext', this.freitext.trim());
    for (const { ansicht } of this.fotoKacheln) {
      const datei = this.fotos()[ansicht];
      if (datei) formData.set(ansicht, datei);
    }

    try {
      await firstValueFrom(this.wareneintragApi.aktualisieren(this.daten.wareneintrag.id, formData));
      this.dialogRef.close(true);
    } catch (error) {
      this.fehler.set(extrahiereFehlermeldung(error, 'Wareneintrag konnte nicht gespeichert werden.'));
    } finally {
      this.speichernLaeuft = false;
    }
  }

  abbrechen(): void {
    this.dialogRef.close();
  }
}
