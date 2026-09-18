<!--
  Herkunft und Struktur der AVV-Stammdaten für den Seed-Import (Phase 3).
-->

# AVV-Stammdaten

Quelle: extrahiert aus `waste-connect-v2`
(`frontend/src/app/shared/services/avv-liste.service.ts`), Stand des Exports:
siehe Git-Historie dieser Datei.

`avv-liste.json` enthält die dreistufige Gliederung des Europäischen
Abfallverzeichnisses (Abfallverzeichnisverordnung, AVV):

- **kapitel** (20 Einträge) – 2-stellige Codes, z.B. `"01"`
- **gruppen** (111 Einträge) – 4-stellige Codes, z.B. `"01 01"`
- **codes** (834 Einträge) – 6-stellige Einzelcodes, z.B. `"01 01 01"`,
  je mit `gefaehrlich: true/false` (Codes mit `*` im Original gelten als
  gefährlicher Abfall)

Für RESEARCH relevant ist laut Spezifikation primär `codes` – das ist die
Ebene, aus der Mitarbeiter beim Erfassen eines Wareneintrags auswählen
(Abschnitt 3.3 der Spezifikation, Abschnitt 4.3 der Architektur). `kapitel`
und `gruppen` liegen bei, falls sich eine hierarchische Auswahl/Suche als
sinnvoll erweist.

Import in die `avv_codes`-Tabelle (PostgreSQL) erfolgt in Phase 3 per
Seed-Migration.
