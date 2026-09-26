import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';

export type ProtokollArt = 'aktivitaet' | 'fehler';

const AUFBEWAHRUNG_TAGE = 30;
export const DATUM = /^\d{4}-\d{2}-\d{2}$/;
const DATEINAME = /^(aktivitaet|fehler)-(\d{4}-\d{2}-\d{2})\.log$/;

// "sv-SE" formatiert als "2026-09-26 11:50:37", Ortszeit Berlin statt UTC.
const zeitFormat = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Berlin',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

// Tagesdateien für Aktivitäten und Fehler, siehe ADR-0007. Synchrones Append
// reicht bei einer Handvoll Nutzer und hält die Zeilen vollständig.
// ponytail: eine Instanz, ein Prozess; bei mehreren App-Containern zentral loggen.
export class Protokoll {
  private aufgeraeumtAm: string | null = null;

  constructor(
    private readonly verzeichnis: string,
    private readonly jetzt: () => Date = () => new Date(),
  ) {}

  aktivitaet(felder: string[]): void {
    this.schreibe('aktivitaet', felder);
  }

  fehler(felder: string[]): void {
    this.schreibe('fehler', felder);
  }

  lese(art: ProtokollArt, datum: string): string | null {
    if (!DATUM.test(datum)) return null;
    const datei = this.pfad(art, datum);
    return existsSync(datei) ? readFileSync(datei, 'utf-8') : null;
  }

  // Alle Tage mit mindestens einer Datei, neueste zuerst.
  tage(): string[] {
    if (!existsSync(this.verzeichnis)) return [];
    const tage = new Set(readdirSync(this.verzeichnis).flatMap((name) => DATEINAME.exec(name)?.[2] ?? []));
    return [...tage].sort().reverse();
  }

  private schreibe(art: ProtokollArt, felder: string[]): void {
    const [datum, uhrzeit] = zeitFormat.format(this.jetzt()).split(' ');
    mkdirSync(this.verzeichnis, { recursive: true });
    if (this.aufgeraeumtAm !== datum) {
      this.raeumeAuf(datum);
      this.aufgeraeumtAm = datum;
    }
    // Zeilenumbrüche raus: sonst ließen sich über Fehlermeldungen oder
    // App-Meldungen gefälschte Zeilen einschleusen.
    const zeile = [`${datum} ${uhrzeit}`, ...felder].map((feld) => feld.replace(/[\r\n]+/g, ' ')).join(' | ');
    appendFileSync(this.pfad(art, datum), `${zeile}\n`);
  }

  private raeumeAuf(heute: string): void {
    const grenze = new Date(`${heute}T00:00:00Z`);
    grenze.setUTCDate(grenze.getUTCDate() - AUFBEWAHRUNG_TAGE);
    const grenzDatum = grenze.toISOString().slice(0, 10);
    for (const name of readdirSync(this.verzeichnis)) {
      const datum = DATEINAME.exec(name)?.[2];
      if (datum && datum < grenzDatum) rmSync(path.join(this.verzeichnis, name));
    }
  }

  private pfad(art: ProtokollArt, datum: string): string {
    return path.join(this.verzeichnis, `${art}-${datum}.log`);
  }
}
