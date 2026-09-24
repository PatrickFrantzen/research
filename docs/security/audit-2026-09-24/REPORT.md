<!-- Security-Audit-Report (Phase 6) des Cloudflare-security-audit-Skills für PatrickFrantzen/research, run-1. Abgeleitet aus findings.json, coverage-ledger.json und den Hardening-Notizen der Hunter. -->

# Security-Audit — PatrickFrantzen/research (run-1)

## 1. Rahmen des Laufs

| | |
|---|---|
| Profil | `standard` (voller Workflow), kein Scope-Filter. `.claude/` (vendorte Skills) ist ausgenommen. |
| Source-Ref | `0512eab` (= `main` @ `ccd0f82` + vendorter Skill), Worktree sauber |
| Budget | keines gesetzt. Verbraucht: 24 Agents (4 Recon, 7 Hunter, 2 Post-Wave-Critics, 1 Final-Clean-Critic, 6 Kandidaten-Verifier, 4 Record-Verifier) |
| Ausführung | **Nur Quellcode.** Es gibt keine `node_modules`, Installation ist laut Skill verboten, und es gibt weder OS-Sandbox noch Postgres/Redis/MinIO/Browser. Deshalb wurde **kein Target-Code ausgeführt**. |
| Frühere Läufe | keine; das ist der erste Ledger |
| Deferred / Out of scope | keine |

**Konsequenz:** `confirmed` setzt ein lokal beobachtetes Ergebnis voraus. Das war in diesem Lauf strukturell nicht erreichbar. Alle belastbaren Leads stehen deshalb als `needs_validation`, ohne Severity. Das bedeutet nicht, dass keine Schwachstellen existieren. Es bedeutet, dass keine lokal reproduziert werden konnte.

## 2. Security-Posture (kurz)

Die Basis ist solide:
- JWT mit gepinntem HS256 und geprüftem iss/aud, im HttpOnly-Cookie mit SameSite=Strict.
- CSRF per Double-Submit.
- Reset-Tokens mit 32 Byte Zufall, als Hash gespeichert und einmalig nutzbar.
- Raw-SQL korrekt parametrisiert.
- Besitzprüfung bei Edit/Delete.
- Object-Keys serverseitig per UUID vergeben.
- Magic-Byte-Prüfung der Uploads.
- Strikte CSP ohne DOM-XSS-Sinks im Angular-Frontend.
- Der Service Worker cacht keine API-Daten.
- CI ohne Secrets und nur mit `contents: read`.

Die Schwächen betreffen **Verfügbarkeit und Lebenszyklus**, nicht Datenzugriff:
- Das Auth-Rate-Limit ist hinter Caddy vermutlich global.
- Initial-Zugangs-Links lassen sich anonym „überschreiben“.
- Multipart- und Freitext-Eingaben sind nicht begrenzt.

## 3. Bestätigte Findings

Keine (siehe Abschnitt 1).

## 4. NEEDS VALIDATION (priorisiert, ohne Severity)

Details, vollständige Traces und Pläne stehen in `NEEDS-VALIDATION.md`.

| # | Titel | Trace (Kern) | Blocker | Lokaler nächster Schritt | Owner-Check (Deployment) |
|---|---|---|---|---|---|
| 1 | Anonymes „Passwort vergessen“ überschreibt den 7-Tage-Initial-Zugangs-Token eines neuen Nutzers mit einem nie zugestellten Link. Die Aktivierung ist dann blockiert. | `auth.controller.ts:78` → `auth.service.ts:32,39` (überschreibt ohne Bedingung) → `mailer.ts:16` (ConsoleMailer verwirft den Link). Gemeinsamer Token-Slot: `schema.prisma:38` | Nicht ausgeführt. Unklar, ob in Produktion ein zustellender Mailer bzw. ein Reissue-Prozess existiert. | Unit-Test: `createNutzer`, dann `passwortVergessen(email)`, dann `passwortSetzen(alterToken)`. Erwartet wird HTTP 400. | Welcher Mailer ist gebunden? Gibt es ein Runbook zum Neuausstellen? |
| 2 | Das Auth-Rate-Limit (5/min) ist auf die Caddy-Peer-IP geschlüsselt. Ein anonymer Client kann damit Login, Passwort-Reset und Passwort-Setzen für alle sperren. | `Caddyfile:7` → `main.ts:9` (kein `trust proxy`) → `app.module.ts:47` (Default-Tracker) → `auth.controller.ts:53` | Nicht ausgeführt. Die Peer-IP im Compose-Netz ist ein Deployment-Fakt. | Supertest mit 5 Requests und anschließend einem mit anderem `X-Forwarded-For`. Erwartet wird 429. Danach mit `trust proxy 1` gegenprüfen. | Redis-Throttler-Keys bzw. `req.ip` bei zwei Nutzern aus verschiedenen Netzen vergleichen, ohne das Limit auszureizen. |
| 3 | Der Multipart-Parser für Fotos begrenzt weder Anzahl noch Größe der Textfelder. Das kann den Speicher des einzigen App-Prozesses erschöpfen (nur für authentifizierte Nutzer). | `wareneintrag.controller.ts:115` → `:38` (nur `fileSize`) → `:119` (`req.body` im RAM, Whitelist-Prüfung erst danach) | Nicht ausgeführt. Die effektiven multer-2.4.0-Defaults sowie Heap- und Body-Limits in Produktion sind unbekannt. | Unter einem 128-MB-Heap 200 × 1-MiB-Felder senden und das Heap-Wachstum messen. Danach mit `limits.fields/fieldSize/parts` gegenprüfen. | Body-Cap vor Caddy, Container-Memory-Limit und Node-Heap-Limit prüfen. |
| 4 | `freitext` hat keine Maximallänge. Ein Nutzer kann Einträge von etwa 1 MiB speichern, die jede Standard-Liste an alle Nutzer ausliefert. | `wareneintrag.controller.ts:119` → `create-wareneintrag.dto.ts:9` (kein `@MaxLength`) → `wareneintrag.service.ts:143` → `:66` (Liste) | Nicht ausgeführt. Feldlimit, tsvector-Verhalten und Antwortgröße sind nicht beobachtet. | 20 Einträge mit je 1 MiB anlegen, danach die Antwortgröße von `GET /wareneintraege` messen. | Per SQL `length(freitext)` prüfen, außerdem Proxy-Caps und Memory-Limits. |

**Kleinste Fixes (Vorschlag, noch nicht umgesetzt):**

1. In `passwortVergessen` nicht überschreiben, solange `mussPasswortSetzen` gilt und der Token gültig ist, oder getrennte Token-Slots verwenden. Zusätzlich eine authentifizierte Route zum Neuausstellen von Links.
2. In `main.ts` `app.set('trust proxy', 1)` setzen (genau ein Hop).
3. In `FOTO_UPLOAD_OPTIONS` `limits: { fields, fieldSize, parts, files }` setzen, optional zusätzlich `request_body max_size` in Caddy.
4. `@MaxLength` für `freitext` in beiden DTOs.

## 5. Hardening-Hinweise (keine Findings)

- **Logout** löscht nur die Cookies. Das JWT bleibt serverseitig bis zu 8 h gültig. Vorschlag: eine Session-Epoche pro Nutzer. Zusätzlich fehlt ein Deaktivieren-Flag für Offboarding. (Als Kandidat geprüft und abgelehnt, siehe Abschnitt 7.)
- **MinIO:** `{$FILES_DOMAIN}` proxyt die komplette MinIO-S3-API. Sie ist SigV4-geschützt, trotzdem sollte Caddy nur `GET`/`HEAD` auf `/research-fotos/wareneintraege/*` durchlassen. (Als Kandidat geprüft und abgelehnt, siehe Abschnitt 7.)
- **Timing-Orakel:** Login und Passwort-Reset überspringen bcrypt bzw. den DB-Write bei unbekannter E-Mail. Die Existenz eines Accounts ist dadurch über die Antwortzeit ableitbar.
- **E-Mail-Case:** E-Mails werden nicht normalisiert, `Max@x` und `max@x` sind getrennte Accounts.
- **Login-CSRF:** Öffentliche `POST /auth/login` akzeptiert urlencoded Cross-Site-Formulare. Vorschlag: JSON-Content-Type oder Origin-Prüfung erzwingen.
- **Nicht-atomare Abläufe:** `passwortSetzen` und `pruefeBesitz` sind find-then-update. Heute nicht ausnutzbar, besser wäre `updateMany` mit Bedingung im `where`.
- **`ersetzeFoto`:** löscht alte Objekte, bevor das DB-Update committed ist. Schlägt das Update fehl, entstehen tote Keys, allerdings nur im eigenen Eintrag.
- **Query-Parameter** (`avvCodeId`, `standortId`, `suche`, `seite`) und `:id` sind nicht validiert. Arrays oder ungültige UUIDs führen zu 500. Vorschlag: Query-DTO und `ParseUUIDPipe`.
- **Passwortlänge:** Das Maximum von 128 Zeichen überschreitet die 72-Byte-Grenze von bcrypt. `LoginDto.passwort` hat kein `MaxLength`.
- **JWT ohne `iat`** überspringt die Prüfung gegen `passwortGeaendertAm`. Das ist nur mit dem Secret erreichbar. Tokens ohne `iat` sollten abgelehnt werden.
- **`env.ts`:** lehnt nur zwei Platzhalter-Secrets ab. Eine Mindestlänge sollte ergänzt werden.
- **Dev-Compose** veröffentlicht 3000 und 9000 auf allen Interfaces mit Default-Secrets. Vorschlag: an `127.0.0.1` binden.
- **Build und CI:** `npm install` statt `npm ci` im Dockerfile; Actions nur per Tag statt per SHA gepinnt; `.dockerignore` schließt `.env` nicht aus; `mc admin user add … || true` verschluckt Fehler.
- **Caching:** Kein `Cache-Control: no-store` auf authentifizierten API-Antworten.
- **CSP:** `style-src 'unsafe-inline'`, `frame-ancestors 'self'` statt `'none'`.
- **Repo-Hygiene:** `.angular/cache` ist eingecheckt, enthält aber keine Secrets.

**Positive Muster:** Parametrisiertes `$queryRaw` mit tsquery-sicherem Präfix-Builder. Konsequente `whitelist` und `forbidNonWhitelisted`. Serverseitige Standort-Snapshots. Guards laufen vor dem Upload-Parsing. Der Reset-Token wird per `replaceUrl` aus der URL entfernt, dazu `Referrer-Policy: no-referrer`. Default-Secrets werden in Produktion abgelehnt.

## 6. Coverage

- **17 Units:** 11 `covered`, 6 `candidate`, 0 `blocked`, 0 `deferred`, 0 `out_of_scope`.
- **Wave 1:** 16 Units, verteilt auf 6 Hunter.
- Der Post-Wave-Critic ergänzte eine Unit (Logout/Offboarding), die in Wave 2 abgearbeitet wurde.
- Post-Wave-Critic 2 und der separate Final-Clean-Critic fanden beide nichts mehr.
- **Nicht ausgewählte Companions:** Memory-Safety (kein Native-Code), AI/LLM (keine Modell-Integration), RPC/Messaging (keine Queues oder Webhooks), Desktop/IPC (nur PWA).
- **Grenze der Aussage:** Ein einzelner Lauf erschöpft das Target nicht. Laut Skill-Autoren findet ein Lauf etwa die Hälfte dessen, was wiederholte Läufe finden.

## 7. Abgelehnte Kandidaten (zur Nachvollziehbarkeit)

- `caddy-files-domain-proxies-full-minio-api-incl-admin`: Jeder Nicht-GET-Zugriff braucht Root- oder App-Credentials, die ohnehin volle Macht geben. Die Admin-Konsole (Port 9001) wird nicht geproxyt. Damit bleibt es ein Hardening-Thema.
- `backend/src/auth/auth.controller.ts:logout:no-server-side-token-revocation`: Voraussetzung ist ein bereits gestohlenes Token, das auch ohne Logout vollen Zugriff gäbe. Logout verkürzt die Kompromittierung nur nicht. Es wird dabei keine neue Grenze überschritten.
