---
status: accepted
---

# PWA statt native App für die mobile Erfassung

Die mobile Erfassungs-Ansicht (Kamera-Zugriff für das Pflichtfoto) wird als
responsive Angular-PWA gebaut, nicht als native iOS/Android-App. Eine
Codebasis für Mitarbeiter (mobil) und Vorgesetzte (Desktop), Kamera über
Standard-Web-APIs (`<input type="file" capture>` / `getUserMedia`), kein
App-Store-Prozess. Für ein firmeninternes MVP mit überschaubarer
Nutzerzahl überwiegt der Aufwand einer nativen App (zwei Plattformen,
Store-Freigabe) den Vorteil besserer Kamera-/Offline-Integration.

## Consequences

Feinere Kamera-Steuerung (z.B. Mehrfachaufnahme, Bildkompression vor
Upload) und Offline-Fähigkeit sind mit Web-APIs eingeschränkter als nativ
möglich – für das MVP (ein Pflichtfoto, kein Offline-Anspruch) ausreichend.
