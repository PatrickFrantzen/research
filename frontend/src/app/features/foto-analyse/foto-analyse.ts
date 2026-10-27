import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { firstValueFrom } from 'rxjs';
import { AppFehlerMelder } from '../../core/app-fehler-melder.js';
import { FotoAnalyseApi, FotoAnalyseErgebnis } from '../../core/foto-analyse-api.js';
import { FOTO_ACCEPT, beschreibeFoto, uebernehmeFoto } from '../../core/foto-validierung.js';
import { extrahiereFehlermeldung } from '../../core/http-fehler.js';
import { KiAnalyseErgebnisAnzeige } from '../wareneintrag-liste/ki-analyse-ergebnis/ki-analyse-ergebnis.js';

// Mobile Foto-Analyse (Issue #147): Foto → bestätigen → KI → per Mail an
// die eigene Adresse. Nichts wird gespeichert, Verwerfen setzt alles zurück.
@Component({
  selector: 'app-foto-analyse',
  imports: [
    KiAnalyseErgebnisAnzeige,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './foto-analyse.html',
  styleUrl: './foto-analyse.scss',
})
export class FotoAnalyse {
  private readonly api = inject(FotoAnalyseApi);
  private readonly fehlerMelder = inject(AppFehlerMelder);
  private readonly kamera = viewChild.required<ElementRef<HTMLInputElement>>('kamera');

  protected readonly FOTO_ACCEPT = FOTO_ACCEPT;
  protected readonly foto = signal<File | null>(null);
  protected readonly ergebnis = signal<FotoAnalyseErgebnis | null>(null);
  protected readonly laeuft = signal(false);
  protected readonly fehler = signal<string | null>(null);
  protected readonly gesendet = signal(false);
  // Für "Erneut versuchen" nach einem Fehler.
  private letzteAktion: (() => Promise<void>) | null = null;

  private vorschauUrlAlt: string | null = null;
  protected readonly vorschauUrl = computed(() => {
    if (this.vorschauUrlAlt) URL.revokeObjectURL(this.vorschauUrlAlt);
    const foto = this.foto();
    this.vorschauUrlAlt = foto ? URL.createObjectURL(foto) : null;
    return this.vorschauUrlAlt;
  });

  constructor() {
    // Direkt die Kamera öffnen. Blockiert der Browser das ohne frische
    // Nutzeraktion, bleibt der Button "Foto aufnehmen".
    afterNextRender(() => this.kamera().nativeElement.click());
    inject(DestroyRef).onDestroy(() => {
      if (this.vorschauUrlAlt) URL.revokeObjectURL(this.vorschauUrlAlt);
    });
  }

  protected aufnehmen(): void {
    this.kamera().nativeElement.click();
  }

  protected async fotoGewaehlt(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const auswahl = input.files?.[0];
    input.value = '';
    if (!auswahl) return;
    const { datei, meldung } = await uebernehmeFoto(auswahl);
    this.verwerfen();
    if (meldung) {
      this.fehlerMelder.melde(
        `Foto abgelehnt: Foto-Analyse: ${meldung} ${beschreibeFoto(auswahl)}`,
      );
      this.fehler.set(meldung);
      return;
    }
    this.foto.set(datei);
  }

  protected analysieren(): Promise<void> {
    return this.fuehreAus(async (foto) => {
      this.ergebnis.set(await firstValueFrom(this.api.analysieren(foto)));
    }, 'Die KI-Analyse ist fehlgeschlagen. Bitte später erneut versuchen.');
  }

  protected senden(): Promise<void> {
    return this.fuehreAus(async (foto) => {
      await firstValueFrom(this.api.senden(foto));
      this.gesendet.set(true);
    }, 'Die E-Mail konnte nicht gesendet werden.');
  }

  protected erneutVersuchen(): void {
    void this.letzteAktion?.();
  }

  protected verwerfen(): void {
    this.foto.set(null);
    this.ergebnis.set(null);
    this.fehler.set(null);
    this.gesendet.set(false);
    this.letzteAktion = null;
  }

  private async fuehreAus(
    aktion: (foto: File) => Promise<void>,
    standardFehler: string,
  ): Promise<void> {
    const foto = this.foto();
    if (!foto || this.laeuft()) return;
    this.letzteAktion = () => this.fuehreAus(aktion, standardFehler);
    this.laeuft.set(true);
    this.fehler.set(null);
    try {
      await aktion(foto);
    } catch (error) {
      this.fehler.set(extrahiereFehlermeldung(error, standardFehler));
      return;
    } finally {
      this.laeuft.set(false);
    }
    this.letzteAktion = null;
  }
}
