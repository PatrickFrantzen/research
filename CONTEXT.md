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
Detailansicht), ein optionales Dokument, ein AVV-Code, ein Freitext sowie der Standort des
erfassenden Nutzers als Kopie zum Erfassungszeitpunkt. Bearbeiten/Löschen
ist auf den erfassenden Nutzer beschränkt – andere Nutzer können den
Eintrag nur ansehen.
_Avoid_: Ware, Eintrag, Meldung, Wareneingang

**Dokument**:
Ein optionales PDF an einem Wareneintrag, z. B. Lieferschein oder
Begleitschein. Höchstens eins pro Wareneintrag, fließt nicht in die
KI-Analyse ein.
_Avoid_: Anhang, Datei, Beleg

**AVV-Code**:
Amtliche sechsstellige Abfallkennnummer aus dem Europäischen
Abfallverzeichnis (Abfallverzeichnisverordnung), die die Abfallart eines
Wareneintrags klassifiziert und ein Gefährlich-Flag trägt.
_Avoid_: AVV-Nummer, Abfallschlüssel

**Standort**:
Eine Firmen-Niederlassung, der ein Nutzer zugeordnet ist. Steht sie nicht
in der Liste, kann sie beim Anlegen eines Nutzers oder in den eigenen
Einstellungen als Freitext eingetragen werden und wird dann angelegt
(gleicher Name ohne Rücksicht auf Groß-/Kleinschreibung = derselbe
Standort). Der Standort eines Wareneintrags ist eine
Kopie des Nutzer-Standorts zum Erfassungszeitpunkt – ändert sich nicht
rückwirkend, wenn der Nutzer später versetzt wird (siehe
[ADR-0004](docs/adr/0004-standort-am-wareneintrag-als-snapshot.md)).
_Avoid_: Ort, Filiale, Niederlassung

**Nutzer**:
Ein Firmenaccount – jeder Nutzer kann Wareneinträge anlegen, alle
Wareneinträge ansehen und nur seine eigenen bearbeiten/löschen. Angelegt
ausschließlich durch einen Admin, der Nutzer bekommt per Mail eine
Einladung zum Passwort-Setzen und ist danach direkt angemeldet – kein
Self-Signup. Ist der Link verloren oder abgelaufen, schickt ein Admin über
die Nutzerverwaltung einen neuen.
_Avoid_: User, Benutzer, Account, Mitarbeiter, Vorgesetzter

**Admin**:
Ein Nutzer mit Zugriff auf die Nutzerverwaltung: alle Nutzer sehen, Nutzer
anlegen, Passwort-Mails auslösen. Initial der Bootstrap-Nutzer (siehe
[ADR-0006](docs/adr/0006-admin-flag-und-mailversand.md)). Für Wareneinträge
ohne Sonderrechte.
_Avoid_: Administrator, Superuser, Vorgesetzter

**Mobil-/Desktop-Ansicht**:
Zwei Ansichten derselben App, unterschieden nur nach Bildschirmbreite, nicht
nach Nutzerrolle (die es nicht mehr gibt). Mobil zeigt ein Dashboard mit der
Wahl zwischen Einträge anlegen und Einträge ansehen. Desktop zeigt direkt
die Einträge-ansehen-Liste als Startseite, mit Navigation zu den übrigen
Bereichen.

**KI-Analyse**:
Eine von einer KI aus den Fotos eines Wareneintrags geschätzte
Zusammensetzung: Materialfraktionen mit geschätztem Volumenanteil in Prozent
(Summe 100) und eine Kurzeinschätzung in einem Satz. Eine Schätzung, keine
Messung. Jeder Nutzer kann sie für jeden Wareneintrag mit Foto anstoßen und
bekommt zuerst eine Vorschau, die er speichern oder wiederholen kann. Pro
Wareneintrag gibt es höchstens eine gespeicherte KI-Analyse, jedes Speichern
überschreibt sie (siehe [ADR-0008](docs/adr/0008-ki-analyse-ueber-gemini.md)).
_Avoid_: Bilderkennung, Auswertung, Gutachten
