# ADR-0007: Tages-Logs für Aktivitäten und Fehler, einsehbar für Admins

## Status

Angenommen, 26.09.2026

## Kontext

Ein Nutzer meldete einen Fehler beim Anlegen eines Wareneintrags, in den
Server-Logs war nichts zu finden: Nest loggt nur 5xx, Caddy ohne `log`
keine Zugriffe, und Fehler, die nur in der App auftreten (abgelehntes Foto),
erreichen den Server gar nicht.

## Entscheidung

- Zwei Tagesdateien im Docker-Volume `app-logs` (`/app/backend/logs`):
  `aktivitaet-JJJJ-MM-TT.log` und `fehler-JJJJ-MM-TT.log`, eine Zeile pro
  Ereignis, Zeit und Tagesgrenze in Europe/Berlin.
- Aktivität: nur Endpunkte mit `@Aktivitaet('...')` (Nutzer angelegt,
  Passwort-Mail ausgelöst, Wareneintrag erstellt/geändert/gelöscht). Keine
  Lesezugriffe, keine Logins.
- Fehler: globaler Exception-Filter, jeder 4xx/5xx mit Status, Pfad (ohne
  Query), Nutzer und Grund. Ausnahme: 401 auf `/auth/me` (App-Start ohne
  Login). Bei Login-Fehlern versuchte E-Mail und IP, nie das Passwort.
- App-Fehler: abgelehnte Fotos (mit Typ und Größe) und unerwartete Abstürze
  meldet die App an `POST /protokoll/app-fehler`, nur eingeloggt.
- Zeilenumbrüche in Feldern werden ersetzt (keine eingeschleusten Zeilen).
- Aufbewahrung 30 Tage, die App löscht ältere Dateien beim ersten Schreiben
  eines Tages.
- Admins lesen und laden die Dateien unter „Logs“ (Nutzerverwaltung).

## Konsequenzen

- Logs enthalten E-Mail-Adressen und bei Login-Fehlern IPs (personenbezogen),
  daher die kurze Aufbewahrung.
- Dateien statt DB-Tabelle: einfach und direkt lesbar, aber nur für einen
  App-Container. Bei mehreren Instanzen zentral loggen.
- Die Logs sind nicht Teil des nächtlichen Backups.
