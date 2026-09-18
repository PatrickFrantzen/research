<!--
  Phase 2 von 3 der RESEARCH-Projektplanung (Infrastruktur & Architektur).
  Baut auf 01-projektbeschreibung-spezifikation.md auf.
  Status: Entwurf – hosting-agnostisch geplant, da Ziel-Hosting des Kunden
  noch nicht final geklärt ist (siehe Abschnitt 8).
-->

# RESEARCH – Infrastruktur & Architektur

## 1. Überblick

Ein containerisierter Node-Prozess (NestJS-Backend liefert API + gebauten
Angular-PWA-Build aus), same-origin – analog zum bewährten Muster aus
`waste-connect-v2`, aber als eigenständige, austauschbare Docker-Umgebung
statt fest an einen Hostinger-Slot gebunden.

```
┌─────────────────────────────────────────────────────┐
│                      Reverse Proxy                   │
│         (vom Kunden gestellt: nginx/Traefik/o.ä.)     │
└───────────────────────┬───────────────────────────────┘
                         │ HTTPS
┌───────────────────────▼───────────────────────────────┐
│                  App-Container (Node)                 │
│  NestJS: /api/v1/*  +  statischer Angular-PWA-Build    │
└───────┬───────────────────────────────┬────────────────┘
        │ SQL                           │ S3-kompatibles Objekt-API
┌───────▼──────────┐            ┌────────▼─────────────┐
│   PostgreSQL      │            │  Objektspeicher        │
│ (Nutzer, Standorte,│            │ (Fotos; lokal: MinIO,  │
│  AVV, Wareneinträge)│            │  Kunde: S3/eigener)    │
└────────────────────┘            └─────────────────────┘
```

**Warum dieser Zuschnitt**: Drei austauschbare Bausteine (App, DB,
Objektspeicher) als Docker-Container – lässt sich auf einem einzelnen
Kunden-Server per `docker compose` betreiben oder später 1:1 auf Cloud-Dienste
(managed Postgres, managed S3) umziehen, ohne Code-Änderungen.

## 2. Tech-Stack

Gleicher Stack wie `waste-connect-v2` – Patrick kennt die Patterns bereits,
Wissen und Fehlerquellen (siehe dortige README) sind übertragbar:

- **Backend**: NestJS (Node/TypeScript)
- **Frontend**: Angular, als **PWA** (Progressive Web App)
- **Datenbank**: PostgreSQL (Begründung siehe Abschnitt 4)
- **Fotospeicher**: S3-kompatible Objektspeicher-Abstraktion (Abschnitt 5)

Abweichend von `waste-connect-v2` (dort MongoDB/Mongoose): RESEARCH nutzt
PostgreSQL, weil das Datenmodell stark relational ist (Nutzer → Standort,
Wareneintrag → AVV-Code, Wareneintrag → Standort) und die geforderte
Kombination aus **exaktem AVV-Filter + Volltextsuche im Freitext**
in Postgres mit Fremdschlüsseln + GIN-Index sauberer und performanter
abzubilden ist als mit Mongoose-Referenzen.

## 3. Mobile-Ansatz: PWA statt native App

- Eine Codebasis für Mitarbeiter (mobil) und Vorgesetzte (Desktop) –
  Responsive Design, keine getrennten Plattform-Repos
- Kamera-Zugriff über Standard-Web-APIs (`<input type="file" capture="environment">`
  bzw. `getUserMedia`), kein App-Store-Prozess nötig
- PWA-Manifest + Service Worker für "Zum Homescreen hinzufügen" und
  Basis-Offline-Fähigkeit (z.B. Formular puffern, wenn kurzzeitig kein Netz –
  Detailtiefe hier bewusst noch offen für Phase 3, kein MVP-Blocker)

## 4. Datenbankdesign (PostgreSQL)

### 4.1 Tabellen (fachlich)

```
nutzer            (id, vorname, nachname, rolle, standort_id → standorte,
                    email/username, passwort_hash, erstellt_von_id → nutzer)
standorte         (id, name)
avv_codes         (id, code, bezeichnung)
wareneintraege    (id, foto_url, avv_code_id → avv_codes, freitext,
                    erfasst_von_id → nutzer, standort_id → standorte,
                    erstellt_am)
```

### 4.2 Such-/Filterstrategie (zentraler Performance-Punkt)

Die Kombination "AVV-Filter + Volltextsuche im Freitext" ist explizit als
wichtig markiert (Abschnitt 5 der Spec) – auch bei kleiner Datenmenge, weil
es ein reales Kundenprojekt ist:

- **AVV-Filter**: `avv_code_id` ist Fremdschlüssel mit Standard-B-Tree-Index
  → exakte/IN-Filterung ist konstant schnell, auch bei Wachstum
- **Volltextsuche Freitext**: `freitext` bekommt eine generierte
  `tsvector`-Spalte (deutsche Textsuchkonfiguration) mit **GIN-Index** –
  Postgres-Standardlösung für performante Volltextsuche, deutlich schneller
  als `LIKE '%...%'` sobald die Tabelle wächst
- **Kombinierter Filter** (AVV + Freitext gleichzeitig): Postgres kombiniert
  Index-Scans über beide Indexe effizient – kein Sequential Scan nötig
- Optional für Tippfehler-Toleranz/Teilwort-Suche: `pg_trgm`-Extension
  (Trigram-Index) als spätere Ergänzung, kein MVP-Blocker

### 4.3 AVV- und Standort-Stammdaten

- Beide als Seed-Migration eingespielt (nicht editierbar über die App im
  MVP), Referenzintegrität über Fremdschlüssel
- AVV-Liste: offizielle AVV-Kennnummern (Abfallverzeichnisverordnung) –
  Quelle/Import-Format wird in Phase 3 konkretisiert

## 5. Fotospeicher

- Kein direktes Speichern im App-Container oder in der Datenbank (Blobs in
  Postgres skalieren schlecht und erschweren Backups)
- App spricht gegen eine **S3-kompatible Schnittstelle** (z.B. über ein
  dünnes Abstraktionslayer im Backend)
- Lokal/Docker-Compose: **MinIO** als S3-kompatibler Container
- Beim Kunden: wahlweise MinIO weiterbetreiben oder auf echten
  Cloud-Objektspeicher (AWS S3, o.ä.) zeigen – reine Konfigurationsfrage,
  kein Code-Umbau
- `wareneintraege.foto_url` speichert nur die Objekt-Referenz, nicht die
  Binärdaten selbst

## 6. Auth & Rollenmodell (technisch)

- JWT-basierte Authentifizierung (wie in `waste-connect-v2` bereits etabliert)
- Rolle (`mitarbeiter` / `vorgesetzter`) als Claim im Token, per NestJS Guard
  auf Endpunkte gemappt (z.B. Bearbeiten/Löschen nur für `vorgesetzter`)
- Account-Anlage: Endpunkt, den nur `vorgesetzter`-Rolle aufrufen darf
  (Nutzer anlegen inkl. Initial-Passwort/Einladungslink) – kein offener
  Registrierungs-Endpunkt

## 7. Datenschutz (DSGVO-Aspekte)

- Personenbezogene Daten: Mitarbeiternamen, ggf. Standortzuordnung, Fotos
  vom Firmengelände (potenziell Personen im Bild)
- Objektspeicher und Datenbank laufen ausschließlich in der
  Kunden-Infrastruktur (keine Drittanbieter-Plattform wie bei
  `waste-connect-v2`) – vereinfacht die datenschutzrechtliche Verantwortung
- Zugriff auf Fotos/Einträge nur für authentifizierte Nutzer der Firma
  (keine öffentlichen URLs)
- Löschkonzept (Aufbewahrungsfristen für Wareneinträge/Fotos) ist mit dem
  Kunden zu klären – aktuell kein Bestandteil des MVP-Funktionsumfangs

## 8. Offene Punkte

1. **Ziel-Hosting des Kunden** (einzige verbliebene offene Frage aus Phase 1):
   sobald bekannt, prüfen ob Docker-Compose direkt lauffähig ist oder
   Anpassungen nötig sind (z.B. verwalteter Postgres-Dienst statt
   Container, vorhandener S3-Zugang statt MinIO)
2. Exakte AVV-Datenquelle/-Format für den Seed-Import
3. Details zum PWA-Offline-Verhalten (kann in Phase 3 iterativ entschieden
   werden, kein Architektur-Blocker)

## 9. Nächste Schritte

- Architektur mit Patrick/Kunde final abstimmen
- Phase 3: Code-Implementierung
  - NestJS-Module analog `waste-connect-v2`-Struktur (Nutzer, Standorte,
    AVV, Wareneinträge), Angular-PWA-Grundgerüst
  - Docker-Compose-Setup (App, Postgres, MinIO) für lokale Entwicklung
  - Hier bietet sich der Einsatz der Matt-Pocock-Skills
    (github.com/mattpocock/skills) an, wo sie zur TypeScript-Implementierung
    passen (z.B. Typsicherheit, Patterns) – konkrete Auswahl beim Start von
    Phase 3
