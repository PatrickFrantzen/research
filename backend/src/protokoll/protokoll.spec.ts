import { mkdtempSync, readdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Protokoll } from './protokoll.js';

describe('Protokoll', () => {
  let verzeichnis: string;
  let jetzt: Date;

  beforeEach(() => {
    verzeichnis = mkdtempSync(path.join(tmpdir(), 'protokoll-'));
    jetzt = new Date('2026-09-26T22:30:00Z'); // 00:30 Uhr in Berlin (Sommerzeit)
  });

  afterEach(() => rmSync(verzeichnis, { recursive: true, force: true }));

  function protokoll() {
    return new Protokoll(verzeichnis, () => jetzt);
  }

  it('schreibt Aktivitäten und Fehler in getrennte Tagesdateien nach Berliner Datum', () => {
    const p = protokoll();

    p.aktivitaet(['max@example.com', 'Wareneintrag erstellt', 'id-1']);
    p.fehler(['400', 'POST /api/v1/wareneintraege', 'max@example.com', 'Datei zu groß']);

    expect(p.lese('aktivitaet', '2026-09-27')).toBe(
      '2026-09-27 00:30:00 | max@example.com | Wareneintrag erstellt | id-1\n',
    );
    expect(p.lese('fehler', '2026-09-27')).toBe(
      '2026-09-27 00:30:00 | 400 | POST /api/v1/wareneintraege | max@example.com | Datei zu groß\n',
    );
    expect(p.tage()).toEqual(['2026-09-27']);
  });

  it('entschärft Zeilenumbrüche, damit niemand Zeilen ins Log einschleusen kann', () => {
    const p = protokoll();

    p.fehler(['App', 'boom\n2026-01-01 00:00:00 | gefälscht\r\nzeile']);

    expect(p.lese('fehler', '2026-09-27')!.split('\n').filter(Boolean)).toHaveLength(1);
  });

  it('liefert null für einen Tag ohne Datei oder ein ungültiges Datum', () => {
    writeFileSync(path.join(verzeichnis, '..', 'geheim.log'), 'geheim');

    expect(protokoll().lese('fehler', '2026-01-01')).toBeNull();
    expect(protokoll().lese('fehler', '../geheim')).toBeNull();
  });

  it('löscht Dateien, die älter als 30 Tage sind, beim ersten Schreiben des Tages', () => {
    const alt = path.join(verzeichnis, 'fehler-2026-08-01.log');
    const frisch = path.join(verzeichnis, 'aktivitaet-2026-09-20.log');
    writeFileSync(alt, 'alt\n');
    writeFileSync(frisch, 'frisch\n');
    const vor31Tagen = new Date(jetzt.getTime() - 31 * 24 * 60 * 60 * 1000);
    utimesSync(alt, vor31Tagen, vor31Tagen);

    protokoll().aktivitaet(['x']);

    expect(readdirSync(verzeichnis).sort()).toEqual(['aktivitaet-2026-09-20.log', 'aktivitaet-2026-09-27.log']);
  });
});
