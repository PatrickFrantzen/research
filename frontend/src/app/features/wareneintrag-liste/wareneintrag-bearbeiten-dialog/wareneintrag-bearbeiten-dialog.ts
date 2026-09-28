import { Component, computed, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormField, form, maxLength, required } from '@angular/forms/signals';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { catchError, debounceTime, distinctUntilChanged, firstValueFrom, of, Subject } from 'rxjs';
import { AvvCodeApi } from '../../../core/avv-code-api.js';
import { AppFehlerMelder } from '../../../core/app-fehler-melder.js';
import { ConfirmDialog } from '../../../core/confirm-dialog/confirm-dialog.js';
import { beschreibeFoto, pruefeDokument, uebernehmeFoto } from '../../../core/foto-validierung.js';
import { extrahiereFehlermeldung } from '../../../core/http-fehler.js';
import {
  FREITEXT_MAX_LAENGE,
  Wareneintrag,
  WareneintragApi,
} from '../../../core/wareneintrag-api.js';
import { FokusBeiAnzeige } from '../../../core/fokus-bei-anzeige.js';

export interface WareneintragBearbeitenDialogDaten {
  wareneintrag: Wareneintrag;
}

// Die drei Ansichten sind optional – wie beim Erfassen ersetzt der Nutzer
// nur, was er neu fotografieren möchte (0 bis 3), siehe CONTEXT.md.
type FotoAnsicht = 'fotoFern' | 'fotoNah' | 'fotoDetail';
// Einzeln löschbare Dateien (Issue #104), wie ENTFERNBARE_DATEIEN im Backend.
type Datei = FotoAnsicht | 'dokument';

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
    FokusBeiAnzeige,
    FormField,
    MatAutocompleteModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
  ],
  templateUrl: './wareneintrag-bearbeiten-dialog.html',
  styles: `
    .fotos-ersetzen {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }

    .datei-zeile {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
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
  private readonly dialog = inject(MatDialog);
  protected readonly daten = inject<WareneintragBearbeitenDialogDaten>(MAT_DIALOG_DATA);

  // Vorbelegt mit dem aktuell zugewiesenen AVV-Code (Issue #66), damit
  // Speichern ohne AVV-Code-Änderung keine erneute Auswahl über die Suche
  // erfordert.
  private readonly avvCodeId = signal<string | null>(this.daten.wareneintrag.avvCode.id);
  protected readonly fotoKacheln = FOTO_KACHELN;
  private readonly fotos = signal<Record<FotoAnsicht, File | null>>({
    fotoFern: null,
    fotoNah: null,
    fotoDetail: null,
  });
  // Neues PDF (Issue #103), ersetzt ein vorhandenes oder kommt neu hinzu.
  protected readonly dokument = signal<File | null>(null);
  // Welche Dateien der Eintrag hat; sofortiges Löschen (Issue #104) nimmt
  // sie hier heraus, danach lässt sich direkt eine neue auswählen.
  private readonly vorhandeneDateien = signal<Record<Datei, boolean>>({
    fotoFern: this.daten.wareneintrag.fotoFernUrl !== null,
    fotoNah: this.daten.wareneintrag.fotoNahUrl !== null,
    fotoDetail: this.daten.wareneintrag.fotoDetailUrl !== null,
    dokument: this.daten.wareneintrag.dokumentUrl !== null,
  });
  protected readonly statusMeldung = signal('');
  // Wurde ein Foto gelöscht, ist die Frage zur KI-Analyse für diesen Dialog
  // beantwortet; ein danach eingesetztes Foto fragt nicht erneut.
  private analyseEntschieden = false;

  protected readonly bearbeitungDaten = signal({
    avvSucheAnzeige: `${this.daten.wareneintrag.avvCode.code} – ${this.daten.wareneintrag.avvCode.bezeichnung}`,
    freitext: this.daten.wareneintrag.freitext,
  });
  protected readonly freitextMaxLaenge = FREITEXT_MAX_LAENGE;
  protected readonly bearbeitenForm = form(this.bearbeitungDaten, (pfad) => {
    required(pfad.freitext);
    maxLength(pfad.freitext, FREITEXT_MAX_LAENGE);
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

  // value() wirft im Fehlerzustand – Template und Handler lesen nur hierüber.
  protected readonly avvTrefferListe = computed(() =>
    this.avvTreffer.hasValue() ? this.avvTreffer.value() : [],
  );

  protected speichernLaeuft = false;
  protected readonly fehler = signal<string | null>(null);
  protected readonly fotoFehler = signal<string | null>(null);
  private readonly fehlerMelder = inject(AppFehlerMelder);

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
    const avvCode = this.avvTrefferListe().find((treffer) => treffer.id === event.option.value);
    if (!avvCode) return;
    this.avvCodeId.set(avvCode.id);
    this.avvSucheAnzeige = `${avvCode.code} – ${avvCode.bezeichnung}`;
  }

  async fotoErsetzen(ansicht: FotoAnsicht, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const auswahl = input.files?.item(0) ?? null;
    const { datei, meldung } = auswahl
      ? await uebernehmeFoto(auswahl)
      : { datei: null, meldung: null };
    const label = this.fotoKacheln.find((kachel) => kachel.ansicht === ansicht)?.label;
    this.fotoFehler.set(meldung ? `${label}: ${meldung}` : null);
    if (meldung && auswahl)
      this.fehlerMelder.melde(`Foto abgelehnt: ${label}: ${meldung} ${beschreibeFoto(auswahl)}`);
    this.fotos.update((fotos) => ({ ...fotos, [ansicht]: datei }));
  }

  dokumentErsetzen(event: Event): void {
    const auswahl = (event.target as HTMLInputElement).files?.item(0) ?? null;
    const meldung = auswahl ? pruefeDokument(auswahl) : null;
    this.fotoFehler.set(meldung ? `Dokument (PDF): ${meldung}` : null);
    this.dokument.set(meldung ? null : auswahl);
  }

  protected vorhanden(datei: Datei): boolean {
    return this.vorhandeneDateien()[datei];
  }

  async dateiLoeschen(datei: Datei, label: string): Promise<void> {
    const bestaetigt = await firstValueFrom(
      this.dialog
        .open(ConfirmDialog, {
          data: {
            titel: `${label} löschen?`,
            nachricht: `${label} wird sofort gelöscht, auch wenn Sie den Dialog danach abbrechen.`,
            bestaetigenLabel: 'Löschen',
          },
        })
        .afterClosed(),
    );
    if (!bestaetigt) return;
    // Das PDF wird nicht analysiert (Issue #103), nur Fotos betreffen die Analyse.
    const analyseLoeschen = datei !== 'dokument' && (await this.frageAnalyseLoeschen());
    this.fehler.set(null);
    try {
      await firstValueFrom(
        this.wareneintragApi.dateiLoeschen(this.daten.wareneintrag.id, datei, analyseLoeschen),
      );
      this.vorhandeneDateien.update((dateien) => ({ ...dateien, [datei]: false }));
      if (datei !== 'dokument') this.analyseEntschieden = true;
      this.statusMeldung.set(`${label} gelöscht.`);
    } catch (error) {
      this.fehler.set(extrahiereFehlermeldung(error, `${label} konnte nicht gelöscht werden.`));
    }
  }

  // Die Analyse gilt für alle Fotos zusammen (ADR-0008). Ändern sich Fotos,
  // entscheidet der Nutzer, ob sie bleibt (Issue #104), ohne Analyse keine Frage. Scheitert das Laden,
  // wird trotzdem gefragt, statt eine veraltete Analyse still zu behalten.
  private async frageAnalyseLoeschen(): Promise<boolean> {
    const analyse = await firstValueFrom(
      this.wareneintragApi
        .gespeicherteAnalyse(this.daten.wareneintrag.id)
        .pipe(catchError(() => of(undefined))),
    );
    if (analyse === null) return false;
    const antwort = await firstValueFrom(
      this.dialog
        .open(ConfirmDialog, {
          // Nur Ja oder Nein, kein versehentliches Schließen per Escape.
          disableClose: true,
          data: {
            titel: 'KI-Analyse ebenfalls löschen?',
            nachricht:
              'Die gespeicherte KI-Analyse beruht auf den bisherigen Fotos und passt nach der Änderung eventuell nicht mehr.',
            bestaetigenLabel: 'Ja',
            abbrechenLabel: 'Nein',
          },
        })
        .afterClosed(),
    );
    return antwort === true;
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
    const dokument = this.dokument();
    if (dokument) formData.set('dokument', dokument);

    try {
      const neueFotos = this.fotoKacheln.some(({ ansicht }) => this.fotos()[ansicht]);
      if (neueFotos && !this.analyseEntschieden && (await this.frageAnalyseLoeschen()))
        formData.set('analyseLoeschen', 'true');
      await firstValueFrom(
        this.wareneintragApi.aktualisieren(this.daten.wareneintrag.id, formData),
      );
      this.dialogRef.close(true);
    } catch (error) {
      this.fehler.set(
        extrahiereFehlermeldung(error, 'Wareneintrag konnte nicht gespeichert werden.'),
      );
    } finally {
      this.speichernLaeuft = false;
    }
  }

  abbrechen(): void {
    this.dialogRef.close();
  }
}
