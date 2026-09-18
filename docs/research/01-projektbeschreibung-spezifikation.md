<!--
  Phase 1 von 3 der RESEARCH-Projektplanung (Projektbeschreibung & Spezifikation).
  Nächste Phasen: 02-architektur.md (Infrastruktur/Architektur), danach Code.
  Status: Entwurf – offene Fragen in Abschnitt 6 sind vor Phase 2 zu klären.
-->

# RESEARCH – Projektbeschreibung & Spezifikation

## 1. Kontext

RESEARCH ist eine **firmeninterne** Anwendung für die Erfassung und Verwaltung
von Wareneingängen, angelehnt an das bestehende `waste-connect-v2`, aber
deutlich reduziert im Funktionsumfang. Im Unterschied zum Vorgänger:

- Kein öffentlicher Zwei-Seiten-Marktplatz (Entsorger ↔ Logistiker), sondern
  eine geschlossene App für Mitarbeiter einer einzelnen Firma.
- Datenbank und Hosting laufen über die Infrastruktur des Kunden, nicht über
  eine gemeinsame Plattform.
- Zwei feste Rollen mit unterschiedlicher UI: **Mitarbeiter** (mobil) und
  **Vorgesetzter** (Desktop).

## 2. Rollen & Berechtigungen

Die Rolle ist ein festes Attribut am Nutzerkonto (nicht geräteabhängig).

| Rolle | Zugriff | Kernaufgabe |
|---|---|---|
| Mitarbeiter | Mobile-UI | Ware vor Ort registrieren |
| Vorgesetzter | Desktop-UI | Registrierte Ware sichten, filtern, bearbeiten, löschen |

**Registrierung**: kein offener Self-Signup. Neue Nutzer werden durch einen
Vorgesetzten eingeladen bzw. freigeschaltet (Detailmechanismus – Einladungslink
vs. manuelle Freischaltung bestehender Accounts – wird in Phase 2 entschieden).

## 3. Funktionen

### 3.1 Mitarbeiter (Mobile)

- Registrierung mit Vor-/Nachname, Standort, Zugangsdaten (nach Einladung/
  Freischaltung)
- Login / Logout
- Ware erfassen:
  - Foto(s) über Smartphone-Kamera aufnehmen
  - AVV-Nummer aus Stammdaten auswählen (Suche/Dropdown, da AVV-Liste groß ist)
  - Freitext-Beschreibung
  - Absenden
- Einstellungen: Vor-/Nachname, Standort ändern

### 3.2 Vorgesetzter (Desktop)

- Login / Logout
- Liste aller registrierten Waren, Angebotsportal-artig (Karten/Tabelle)
- Filter oberhalb der Liste:
  - nach AVV-Nummer
  - Volltextsuche im Freitext
- Wareneintrag bearbeiten
- Wareneintrag löschen
- Einstellungen: Vor-/Nachname, Standort ändern
- Menü mit Logout

### 3.3 Datenmodell (fachlich, nicht technisch)

- **Nutzer**: Name, Rolle, Standort, Zugangsdaten
- **AVV-Stammdaten**: offizielle AVV-Liste (Abfallverzeichnisverordnung),
  importiert als Seed-Daten
- **Wareneintrag**: Foto(s), AVV-Nummer (Referenz auf Stammdaten), Freitext,
  erfassender Mitarbeiter, Standort, Zeitstempel

Anmerkung aus der Kundenanfrage: Backend-Filter und Datenbankdesign müssen
die Kombination aus AVV-Filter und Volltextsuche im Freitext performant
unterstützen – das ist ein zentraler nicht-funktionaler Punkt für Phase 2
(Architektur/Datenbankwahl, Indexierung).

## 4. MVP-Abgrenzung (Nicht-Ziele)

Gegenüber `waste-connect-v2` bewusst **nicht** Teil des MVP:

- Kein öffentlicher Marktplatz / keine Inserat-Buchung zwischen Firmen
- Kein Multi-Tenant-Betrieb (nur eine Firma)
- Kein Status-Workflow pro Wareneintrag (offen/in Bearbeitung/erledigt) –
  reines Anlegen/Bearbeiten/Löschen genügt im MVP
- Kein Mailing-/Benachrichtigungsmodul (offen für spätere Phase, siehe unten)
- Keine Statistik-Auswertung

## 5. Non-funktionale Anforderungen (vorläufig)

- Mobile-First für die Erfassungs-Ansicht (Kamera-Zugriff notwendig)
- Desktop-optimiert für die Verwaltungs-Ansicht
- Firmeninterne Daten, ggf. personenbezogene Daten (Mitarbeiter) und Fotos
  vom Firmengelände → Datenschutz/DSGVO-Aspekte in Phase 2 berücksichtigen
- Backend-Suche/Filter muss auch bei wachsender Datenmenge performant bleiben

## 6. Offene Fragen für Phase 2 (Architektur)

Diese Punkte sind für die Beschreibung/Spezifikation nicht blockierend,
beeinflussen aber die technische Umsetzung direkt und sollten vor Phase 2
geklärt werden:

1. **Fotos**: Wie viele Fotos pro Eintrag (genau eins, mehrere, ein Limit)?
   Pflichtfeld oder optional?
2. **Einladungsmechanismus**: Einladungslink per Mail, oder legt der
   Vorgesetzte Accounts direkt mit Initial-Passwort an?
3. **Standort**: Freitext oder Auswahl aus einer festen Liste der
   Firmenstandorte (Stammdaten wie bei AVV)?
4. **Hosting/Infrastruktur des Kunden**: Welche Zielumgebung (eigener Server,
   Cloud-Anbieter, vorhandene DB), gibt es Vorgaben/Restriktionen?
5. **Skalierung**: Grobe Größenordnung – Anzahl Mitarbeiter, Standorte,
   erwartete Wareneinträge/Monat?
6. **Benachrichtigungen**: Soll der Vorgesetzte bei neuer Ware informiert
   werden (E-Mail/Push), oder rein Pull (Liste selbst aufrufen)?
7. **Mehrsprachigkeit**: Erforderlich oder nur Deutsch?

## 7. Nächste Schritte

- Kunde/Patrick klärt offene Fragen aus Abschnitt 6
- Anschließend Phase 2: `docs/research/02-architektur.md`
  (Infrastruktur, Tech-Stack-Entscheidung, Datenbankdesign inkl. Such-/
  Filterstrategie, Auth/Rollenmodell technisch, Hosting)
- Erst danach Phase 3: Code-Implementierung (hier ggf. Einsatz der
  Matt-Pocock-Skills für AI-gestützte TypeScript-Implementierung)
