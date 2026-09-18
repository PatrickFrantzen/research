---
status: accepted
---

# S3-kompatible Objektspeicher-Abstraktion für Fotos

Fotos werden nicht als Blob in PostgreSQL und nicht direkt im
App-Container-Dateisystem gespeichert, sondern über eine S3-kompatible
Schnittstelle abgelegt (lokal/Docker: MinIO). `wareneintraege.foto_url`
speichert nur die Objekt-Referenz. Grund: Blobs in Postgres skalieren
schlecht und erschweren Backups; ein lokales Dateisystem bindet die
Anwendung an den jeweiligen Server – beides widerspricht dem Ziel,
hosting-agnostisch zu bleiben, da das Ziel-Hosting des Kunden zum
Zeitpunkt dieser Entscheidung noch nicht feststand.

## Considered Options

- Blob-Speicherung in PostgreSQL
- Lokales Dateisystem im App-Container
- S3-kompatible Objektspeicher-Schnittstelle (gewählt)

## Consequences

Zusätzlicher Container/Dienst (MinIO oder echter S3-Zugang) in jeder
Umgebung nötig, dafür beliebig gegen den späteren Kunden-Objektspeicher
austauschbar, ohne Code-Änderung.
