# ADR-0006: Admin-Flag am Nutzer und Mailversand per SMTP

## Status

Angenommen, 26.09.2026

## Kontext

Bisher hatte die App keine Rollen, jeder Nutzer durfte Nutzer anlegen, und
Einladungslinks wurden nur angezeigt, nicht verschickt. "Passwort vergessen"
hat ohne Mailversand still nichts bewirkt. Wer sein Passwort nicht mehr
kannte, kam nicht mehr rein.

## Entscheidung

- Neue Spalte `ist_admin` am Nutzer. Die Migration setzt sie für den
  Bootstrap-Nutzer (ohne `erstellt_von_id`), der Seed ebenso. Weitere Admins
  gehen per SQL, eine UI dafür gibt es noch nicht.
- Nur Admins sehen die Nutzerliste, legen Nutzer an und lösen Passwort-Mails
  aus (Link 24 h gültig). Das prüft `AdminGuard` anhand der DB, nicht anhand
  des JWT.
- Mails gehen per SMTP (nodemailer) raus, sobald `SMTP_HOST` gesetzt ist,
  sonst werden sie nur geloggt (ohne Token). Links werden mit `APP_URL`
  absolut gemacht.
- E-Mails werden klein gespeichert und verglichen.

## Konsequenzen

- Abweichung von der Spezifikation (docs/research/01, "kein separater
  Mailversand-Flow").
- Der Hoster muss ausgehendes SMTP (587/465) zulassen, bei netcup über die
  Policy "netcup Mail block".
- Kein offener Einladungslink / Self-Signup: der Admin legt Name, E-Mail und
  Standort an.
