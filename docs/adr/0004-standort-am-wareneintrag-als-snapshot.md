---
status: accepted
---

# Standort am Wareneintrag als Snapshot statt Live-Referenz

`wareneintraege.standort_id` wird beim Anlegen als Kopie des aktuellen
Nutzer-Standorts geschrieben, nicht nur über `erfasst_von_id` live
abgeleitet. Ohne diese Notiz würde ein Leser erwarten, dass der Standort
schlicht über den Nutzer nachgeschlagen wird – das wurde bewusst
verworfen: Versetzt ein Vorgesetzter einen Mitarbeiter später an einen
anderen Standort, sollen dessen bereits erfasste Wareneinträge weiterhin
den ursprünglichen Standort zeigen (historisch korrekte Filter/Auswertung).

## Consequences

Kleine Redundanz in der DB (Standort ist an Nutzer und an Wareneintrag
gespeichert); im MVP gibt es keine UI, den Standort eines Wareneintrags
unabhängig vom erfassenden Nutzer manuell zu wählen.
