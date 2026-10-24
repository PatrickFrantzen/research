# ADR-0009: KI-Analyse über die KI-Zentrale

## Status

Angenommen, 24.10.2026. Ergänzt ADR-0008.

## Kontext

Der kostenlose Gemini-Key (ADR-0008) ist unzuverlässig (503 "model overloaded",
Tageskontingent). Auf dem Server gibt es inzwischen den zentralen KI-Dienst
`ki-zentrale` (Repo PatrickFrantzen/ki-zentrale), der Patricks ChatGPT/Codex-Abo
für alle Apps verwaltet.

## Entscheidung

- Ist `KI_ZENTRALE_TOKEN` gesetzt, geht die Analyse an `http://ki-zentrale:8080`
  im Docker-Netz `ki`, immer über Patricks Abo (alle Nutzer, wie zuvor der eine
  Gemini-Key). Sonst bleibt Gemini aktiv: Rückweg ohne Code-Änderung und für den
  Gemini-Stub der Playwright-Tests.
- Beide Wege hinter `KiClient`; Prompt, Prüfung (`pruefeAntwort`) und Vorschau
  bleiben gleich. Das Gemini-Schema wird für Codex in striktes JSON-Schema
  übersetzt (`alsJsonSchema`).
- Fotos zusammen höchstens 10 MB (vorher 14 MB): Die KI-Zentrale nimmt 15 MB
  pro Anfrage, Base64 bläht um 4/3 auf.
- Die Notbremse der KI-Zentrale (Aufrufe pro App und Tag) kommt als 429 an und
  erscheint wie das erschöpfte Gemini-Kontingent.
