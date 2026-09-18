<!--
  Glossar für RESEARCH. Reine Begriffsdefinitionen, keine Implementierungsdetails
  (siehe docs/research/ für Spezifikation/Architektur, docs/adr/ für Entscheidungen).
-->

# RESEARCH

Firmeninterne Anwendung zur Erfassung und Verwaltung von Wareneinträgen
(Abfall-Meldungen) durch Mitarbeiter, gesichtet und verwaltet von
Vorgesetzten.

## Language

**Wareneintrag**:
Eine von einem Mitarbeiter erfasste Meldung einer vor Ort vorgefundenen
Abfallmenge: ein Pflichtfoto, ein AVV-Code, ein Freitext sowie der Standort
des erfassenden Nutzers als Kopie zum Erfassungszeitpunkt.
_Avoid_: Ware, Eintrag, Meldung, Wareneingang

**AVV-Code**:
Amtliche sechsstellige Abfallkennnummer aus dem Europäischen
Abfallverzeichnis (Abfallverzeichnisverordnung), die die Abfallart eines
Wareneintrags klassifiziert und ein Gefährlich-Flag trägt.
_Avoid_: AVV-Nummer, Abfallschlüssel

**Standort**:
Eine Firmen-Niederlassung aus einer festen, zentral gepflegten Liste, der
ein Nutzer fest zugeordnet ist. Der Standort eines Wareneintrags ist eine
Kopie des Nutzer-Standorts zum Erfassungszeitpunkt – ändert sich nicht
rückwirkend, wenn der Nutzer später versetzt wird (siehe
[ADR-0004](docs/adr/0004-standort-am-wareneintrag-als-snapshot.md)).
_Avoid_: Ort, Filiale, Niederlassung

**Nutzer**:
Ein Firmenaccount mit fester Rolle (Mitarbeiter oder Vorgesetzter),
angelegt ausschließlich durch einen Vorgesetzten – kein Self-Signup.
_Avoid_: User, Benutzer, Account

**Mitarbeiter** (Rolle):
Nutzerrolle mit Zugriff auf die mobile Erfassungs-Ansicht. Kann eigene
Wareneinträge anlegen sowie Vor-/Nachname und Standort in den eigenen
Einstellungen ändern.

**Vorgesetzter** (Rolle):
Nutzerrolle mit Zugriff auf die Desktop-Verwaltungs-Ansicht. Kann alle
Wareneinträge sichten/filtern/bearbeiten/löschen und neue
Mitarbeiter-Accounts anlegen.
_Avoid_: Admin, Manager
