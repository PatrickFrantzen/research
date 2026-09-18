<!--
  Design-Anhaltspunkte aus dem Kunden-Mockup für den Login-Screen.
  Kein UI-Spec, kein ADR — reine Referenz für spätere UI-Tickets
  (z.B. Angular-Material-Theming). Werte, die im Mockup nicht eindeutig
  ablesbar oder nicht offiziell verifiziert sind, sind als solche markiert.
-->

# Branding & Design-Referenz

Quelle: Login-Mockup vom Kunden (RE-SEARCH), erhalten 2026-09-18.

## Farben

| Verwendung | Wert | Quelle / Sicherheit |
|---|---|---|
| Primärfarbe (Logo, aktive Feld-Border) | Rot (Logo-Rechteck) | aus Mockup abgelesen, exakter Hex-Wert nicht bekannt — mit Original-Assets/Styleguide des Kunden verifizieren |
| Text/Headline-Akzent | dunkles Blaugrau (Claim-Text) | aus Mockup abgelesen, exakter Hex-Wert nicht bekannt |
| Link-Farbe | Blau ("Forgot password") | aus Mockup abgelesen, exakter Hex-Wert nicht bekannt |
| Hintergrund | RAL 9007 "Graualuminium" | vom Kunden explizit als RAL-Code angegeben. RAL-Codes sind offiziell nur als physische Farbmuster definiert, keine offizielle Hex-Umrechnung — kursierende Näherungen liegen bei ca. `#8C8C86`–`#8F8B81`. **Nicht ungeprüft übernehmen**, sondern per Colorpicker aus Original-Datei oder RAL-Farbkarte verifizieren |
| Dekor-Motiv | Grün (Blatt-/Kreis-Linienzeichnungen) | aus Mockup abgelesen, exakter Hex-Wert nicht bekannt |

## Logo & Typografie

- Logo "RE-SEARCH®": weiße, fette serifenlose Schrift auf rotem Rechteck
- Claim darunter: "TRANSPARENTE ENTSORGUNGSWEGE", Großbuchstaben, dunkles Blaugrau
- Footer-Zeile im Mockup ("© PrintByPatrickDE 2026") ist vermutlich ein Wasserzeichen des Mockup-Erstellers, kein Produkt-Bestandteil

## Layout-Elemente (Login-Card)

- Zentrierte Card auf grauem/metallischem Hintergrund, dezenter Schatten
- Aktives Eingabefeld: rot umrahmt
- Inaktives Eingabefeld: neutral grau umrahmt
- "Forgot password"-Link (blau) unterhalb der Felder — siehe Issue #2 (Passwort-Reset-Flow ergänzt)
- Login-Button: im gezeigten Zustand grau/disabled (leere Felder) — Annahme: wird bei gültiger Eingabe aktiv, vermutlich in Primärfarbe Rot
- Dekorative, handgezeichnet wirkende Blatt-/Kreis-Linien (grün) oben rechts und unten links — passt zum Entsorgungs-/Recycling-Thema der Anwendung

## Offene Punkte

- Exakte Hex-Werte für Rot/Blaugrau/Blau/Grün und den verifizierten RAL-9007-Wert vom Kunden bzw. aus Original-Assets einholen, bevor ein Angular-Material-Theme daraus abgeleitet wird
- Klären, ob das Dekor-Motiv (Blätter) durchgängig im gesamten UI verwendet werden soll oder nur auf dem Login-Screen
