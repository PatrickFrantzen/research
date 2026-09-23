<!--
  Glossar für RESEARCH. Reine Begriffsdefinitionen, keine Implementierungsdetails
  (siehe docs/research/ für Spezifikation/Architektur, docs/adr/ für Entscheidungen).
-->

# RESEARCH

Firmeninterne Anwendung zur Erfassung und Verwaltung von Wareneinträgen
(Abfall-Meldungen) durch Nutzer, mit einer mobilen Erfassungs-Ansicht und
einer Desktop-Ansicht zum Sichten/Filtern aller Einträge.

## Language

**Wareneintrag**:
Eine von einem Nutzer erfasste Meldung einer vor Ort vorgefundenen
Abfallmenge: bis zu drei optionale Fotos (Fernansicht, Nahansicht,
Detailansicht), ein AVV-Code, ein Freitext sowie der Standort des
erfassenden Nutzers als Kopie zum Erfassungszeitpunkt. Bearbeiten/Löschen
ist auf den erfassenden Nutzer beschränkt – andere Nutzer können den
Eintrag nur ansehen.
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
Ein Firmenaccount ohne feste Rolle – jeder Nutzer kann Wareneinträge
anlegen, alle Wareneinträge ansehen, nur seine eigenen bearbeiten/löschen
und neue Nutzer-Accounts anlegen. Angelegt ausschließlich durch einen
bereits eingeloggten Nutzer – kein Self-Signup.
_Avoid_: User, Benutzer, Account, Mitarbeiter, Vorgesetzter

**Mobil-/Desktop-Ansicht**:
Zwei Ansichten derselben App, unterschieden nur nach Bildschirmbreite, nicht
nach Nutzerrolle (die es nicht mehr gibt). Mobil zeigt ein Dashboard mit der
Wahl zwischen Einträge anlegen und Einträge ansehen. Desktop zeigt direkt
die Einträge-ansehen-Liste als Startseite, mit Navigation zu den übrigen
Bereichen.
