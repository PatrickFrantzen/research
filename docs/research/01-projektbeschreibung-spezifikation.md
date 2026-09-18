<!--
  Phase 1 von 3 der RESEARCH-Projektplanung (Projektbeschreibung & Spezifikation).
  Nächste Phasen: 02-architektur.md (Infrastruktur/Architektur), danach Code.
  Status: Abgeschlossen – alle Fragen aus Abschnitt 6 geklärt (siehe dort).
  Einzig offen: konkretes Ziel-Hosting des Kunden (kein Blocker für Phase 2,
  Architektur wird hosting-agnostisch/Docker-fähig geplant).
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

**Registrierung**: kein offener Self-Signup. Der Vorgesetzte legt neue
Mitarbeiter-Accounts direkt an (Name, Standort), das System generiert ein
Initial-Passwort bzw. einen Einladungslink zur ersten Passwortvergabe –
kein separater Mailversand-Flow nötig.

## 3. Funktionen

### 3.1 Mitarbeiter (Mobile)

- Account wird vom Vorgesetzten angelegt, Mitarbeiter vergibt initial eigenes
  Passwort
- Login / Logout
- Ware erfassen:
  - genau ein Pflichtfoto über Smartphone-Kamera aufnehmen
  - AVV-Nummer aus Stammdaten auswählen (Suche/Dropdown, da AVV-Liste groß ist)
  - Freitext-Beschreibung
  - Absenden
- Einstellungen: Vor-/Nachname, Standort ändern (Standort aus fester
  Standortliste, siehe 3.3)

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

- **Nutzer**: Name, Rolle, Standort (Referenz auf Standortliste), Zugangsdaten
- **Standort-Stammdaten**: feste Liste der Firmenstandorte, analog zu den
  AVV-Stammdaten gepflegt (nicht Freitext) – wichtig für saubere Filterung
- **AVV-Stammdaten**: offizielle AVV-Liste (Abfallverzeichnisverordnung),
  importiert als Seed-Daten
- **Wareneintrag**: genau ein Pflichtfoto, AVV-Nummer (Referenz auf
  Stammdaten), Freitext, erfassender Mitarbeiter, Standort, Zeitstempel

Anmerkung aus der Kundenanfrage: Backend-Filter und Datenbankdesign müssen
die Kombination aus AVV-Filter und Volltextsuche im Freitext performant
unterstützen – das ist ein zentraler nicht-funktionaler Punkt für Phase 2
(Architektur/Datenbankwahl, Indexierung). Wichtig: **auch bei kleiner
Datenmenge** hohe Priorität, da es sich um ein reales, bezahltes
Kundenprojekt handelt, nicht um einen Prototyp – siehe Abschnitt 5.

## 4. MVP-Abgrenzung (Nicht-Ziele)

Gegenüber `waste-connect-v2` bewusst **nicht** Teil des MVP:

- Kein öffentlicher Marktplatz / keine Inserat-Buchung zwischen Firmen
- Kein Multi-Tenant-Betrieb (nur eine Firma)
- Kein Status-Workflow pro Wareneintrag (offen/in Bearbeitung/erledigt) –
  reines Anlegen/Bearbeiten/Löschen genügt im MVP
- Keine aktive Benachrichtigung des Vorgesetzten (E-Mail/Push) – reines
  Pull-Prinzip, Vorgesetzter ruft die Liste selbst auf. Kann in einer
  späteren Phase ergänzt werden
- Keine Mehrsprachigkeit – App ist rein auf Deutsch
- Keine Statistik-Auswertung

## 5. Non-funktionale Anforderungen

- Mobile-First für die Erfassungs-Ansicht (Kamera-Zugriff notwendig)
- Desktop-optimiert für die Verwaltungs-Ansicht
- Firmeninterne Daten, ggf. personenbezogene Daten (Mitarbeiter) und Fotos
  vom Firmengelände → Datenschutz/DSGVO-Aspekte in Phase 2 berücksichtigen
- **Skalierung**: kleine Größenordnung erwartet (wenige Standorte, überschaubare
  Mitarbeiterzahl, keine Massendaten), **aber**: reales, bezahltes
  Kundenprojekt – Performance und ein sauber indexiertes Datenbankdesign
  (AVV-Filter + Volltextsuche im Freitext) haben von Anfang an hohe
  Priorität, unabhängig von der aktuell kleinen Datenmenge. Kein
  "Quick-and-dirty"-Ansatz, der bei Wachstum neu gebaut werden müsste
- Nur Deutsch, keine Mehrsprachigkeit im MVP
- Kein aktives Benachrichtigungssystem im MVP (Pull-Prinzip)

## 6. Geklärte Punkte (vormals offene Fragen)

| Thema | Entscheidung |
|---|---|
| Fotos | Genau ein Pflichtfoto pro Wareneintrag |
| Account-Anlage | Vorgesetzter legt Mitarbeiter-Accounts direkt an (kein Self-Signup) |
| Standort | Feste Standort-Stammdaten (kein Freitext) |
| Hosting/Infrastruktur | **Noch offen** – muss vor/in Phase 2 beim Kunden erfragt werden. Architektur wird bis dahin hosting-agnostisch (containerisierbar) geplant |
| Skalierung | Klein, aber mit hohem Anspruch an Performance/Indexierung von Anfang an (siehe Abschnitt 5) |
| Benachrichtigungen | Keine im MVP, reines Pull-Prinzip |
| Sprache | Nur Deutsch |

## 7. Nächste Schritte

- Hosting/Infrastruktur-Vorgaben des Kunden klären (einzig verbliebene offene
  Frage, siehe Abschnitt 6)
- Anschließend Phase 2: `docs/research/02-architektur.md`
  (Infrastruktur, Tech-Stack-Entscheidung, Datenbankdesign inkl. Such-/
  Filterstrategie und Indexierung, Auth/Rollenmodell technisch, Hosting)
- Erst danach Phase 3: Code-Implementierung (hier ggf. Einsatz der
  Matt-Pocock-Skills für AI-gestützte TypeScript-Implementierung)
