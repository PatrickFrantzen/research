# ADR-0008: KI-Analyse über Gemini

## Status

Angenommen, 27.09.2026

## Kontext

Nutzer sollen aus den Fotos eines Wareneintrags eine geschätzte
Zusammensetzung des Abfalls bekommen (Fraktionen mit Volumenanteil,
Kurzeinschätzung). Die Fotos liegen im Objektspeicher (ADR-0003), das
Projekt ist ein Prototyp ohne Budget für KI-Dienste.

## Entscheidung

- Google Gemini, Modell per `GEMINI_MODEL` (Standard `gemini-3.8-flash`,
  im Free Tier verfügbar, Stand 09/2026). Ohne `GEMINI_API_KEY` ist die
  Funktion abgeschaltet (503).
- Direkter REST-Aufruf `models/{model}:generateContent` per `fetch`, kein
  SDK. `responseSchema` erzwingt JSON, das Backend prüft die Antwort trotzdem
  vollständig und rundet die Anteile per Largest Remainder auf genau 100.
- Alle Fotos eines Eintrags gehen in einem Request als `inlineData`. Die
  App verkleinert neue Fotos deshalb auf 2000 px (Issue #91); Altfotos über
  14 MB gesamt werden mit einer klaren Meldung abgelehnt.
- Der Key bleibt im Backend und geht per Header `x-goog-api-key`, nie in
  der URL, damit er in keinem Log und keiner Response auftaucht.
- Das Ergebnis ist zuerst eine Vorschau in Redis (pro Eintrag und Nutzer,
  1 h). Speichern übernimmt ausschließlich diese Vorschau, nie Werte aus dem
  Request, in die Tabelle `wareneintrag_analysen` (eine pro Eintrag,
  überschreibbar, Löschen des Eintrags löscht sie mit).
- Limit 5 Analysen pro Minute pro Nutzer, per Redis-Zähler. Der globale
  ThrottlerGuard läuft vor der Anmeldung und kennt nur die IP.
- Die KI prüft auch, ob der erfasste AVV-Code passt (Urteil, Begründung,
  optional ein Vorschlag). Vorgeschlagene Codes gelten nur, wenn sie in
  `avv_codes` existieren. Der Vorschlag wird nur angezeigt; übernommen wird
  er über das normale Bearbeiten durch den Ersteller.
- Jede Analyse steht im Aktivitäts-Log (ADR-0007).

## Konsequenzen

- **Free Tier nur für den Prototyp mit Testfotos.** Google darf Eingaben im
  Free Tier zur Produktverbesserung nutzen, menschliche Reviewer können sie
  sehen. Vor echten Kundendaten Wechsel auf den bezahlten Tier oder Vertex
  AI mit EU-Region, inklusive Auftragsverarbeitungsvertrag.
- Das Tageskontingent des Free Tier kann erschöpft sein, die App sagt das
  dann ausdrücklich (429).
- Die Werte sind Schätzungen eines Sprachmodells, die UI kennzeichnet sie
  als „KI-Schätzung aus den Fotos, keine Messung“.
