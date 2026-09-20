# Angular AI Agent Skills und Angular CLI MCP Server

**Recherche-Stand: 20.09.2026.** Untersucht wurden ausschließlich offizielle
Angular-Dokumentation und Quelltexte der Angular-Organisation. Der Stand der
Hauptdokumentation war dabei Angular 22.1.7; die Funktionen sind deshalb vor
einer späteren Einrichtung nochmals gegen die installierte CLI-Version zu
prüfen ([Agent Skills](https://angular.dev/ai/agent-skills),
[MCP Server](https://angular.dev/ai/mcp)).

## Kurzfazit

Ja, der Angular CLI MCP Server kann mit Codex verwendet werden. Angular führt
`open-ai-codex` ausdrücklich als Ziel des `ai-config`-Generators; dessen
offizielle Implementierung erzeugt für Codex eine `.codex/config.toml` mit
einem `angular-cli`-MCP-Server
([CLI-Referenz](https://angular.dev/cli/generate/ai-config),
[Implementierung](https://github.com/angular/angular-cli/blob/main/packages/schematics/angular/ai-config/index.ts),
[TOML-Template](https://github.com/angular/angular-cli/blob/main/packages/schematics/angular/ai-config/files/__tomlConfigName__.template)).

Für dieses bestehende Frontend ist `angular-developer` der passende Skill;
`angular-new-app` ist auf das Anlegen neuer Anwendungen ausgerichtet
([Skill-Übersicht](https://angular.dev/ai/agent-skills)). Skills liefern dem
Agenten Angular-spezifische Anweisungen und Referenzen, während der MCP-Server
ausführbare Werkzeuge für Workspace-Analyse, Dokumentationssuche, Migration,
Dev-Server sowie Build- und Testziele bereitstellt
([MCP-Integration](https://angular.dev/ai/mcp)). Die Kombination ist damit
sinnvoll: Skill für die Qualitätsregeln, MCP für Analyse und Verifikation.

In der aktuellen Codex-Sitzung ist der Angular-MCP-Server jedoch **noch nicht
als natives Werkzeug registriert**. Im Repository existiert weder am Root noch
unter `frontend/` eine `.codex/config.toml`. Die lokale Installation ist
grundsätzlich funktionsfähig: `ng mcp --help`, `npx.cmd --version` und ein
echter MCP-Handshake gegen die lokal installierte Angular CLI 22.1.8 waren
erfolgreich. Der Testclient konnte `list_projects` und
`get_best_practices` aufrufen. Für die native Nutzung in Codex fehlt damit nur
die Registrierung und der anschließende Neustart der Codex-Sitzung.

## 1. Offizielle Agent Skills

Angular beschreibt Agent Skills als spezialisierte, domänenspezifische
Anweisungen und Fähigkeiten für Coding-Agenten. Sie sollen Architekturhilfe,
idiomatische Angular-Codegenerierung und modernes Scaffolding liefern; Angular
pflegt sie regelmäßig passend zu Framework-Neuerungen
([Angular: Agent Skills](https://angular.dev/ai/agent-skills)).

### `angular-developer`

Der Skill deckt Komponenten, Services, HTTP, Signals (`signal`, `computed`,
`linkedSignal`, `resource`, `httpResource`), Formulare, Dependency Injection,
Routing und Rendering, Barrierefreiheit, Styling und Animationen, Tests,
CLI-Nutzung und Modernisierung ab
([Skill-Datei](https://github.com/angular/angular/blob/main/skills/dev-skills/angular-developer/SKILL.md)).

Seine übergreifenden Arbeitsregeln sind:

1. Vor Empfehlungen zuerst die Angular-Version des Projekts feststellen, weil
   APIs und Best Practices versionsabhängig sind.
2. Angular Style Guide und Best Practices beachten und für Scaffolding die
   Angular CLI verwenden.
3. Nach Codegenerierung `ng build` ausführen und Fehler vor Abschluss beheben.
4. Bei neuen Projekten standardmäßig die neueste stabile Angular-Version
   verwenden; eine ausdrücklich verlangte Version hat Vorrang.

Diese Regeln stehen direkt in der
[offiziellen Skill-Datei](https://github.com/angular/angular/blob/main/skills/dev-skills/angular-developer/SKILL.md).
Für das vorhandene Frontend bedeutet das insbesondere: vorhandene Angular-
und Formularmuster zuerst erfassen, Änderungen Feature für Feature beurteilen
und jede Änderung mindestens mit Build und passenden Tests verifizieren.

### `angular-new-app`

Dieser Skill ist speziell für neue Angular-Anwendungen gedacht. Er verlangt
Node.js, npm und Internetzugang, prüft die Angular CLI, legt die App
nicht-interaktiv mit `ng new` an und verwendet danach die CLI-Generatoren für
Komponenten, Services, Pipes, Direktiven, Interfaces, Guards, Interceptors,
Resolver, Enums und Klassen
([Skill-Datei](https://github.com/angular/angular/blob/main/skills/dev-skills/angular-new-app/SKILL.md)).
Für dieses bereits bestehende Repository ist er deshalb nicht der primäre
Prüf-Skill.

### Installation und Aktivierung

Angular dokumentiert als generischen Installationsweg:

```powershell
npx skills add https://github.com/angular/skills
```

Die konkrete Aktivierung hängt vom jeweiligen agentischen Werkzeug ab; beim
Aktivieren lädt das Werkzeug die aufgabenbezogenen Anweisungen und Ressourcen
([Angular: Agent Skills](https://angular.dev/ai/agent-skills)). In der hier
laufenden Codex-Umgebung gehören die beiden Angular-Skills derzeit nicht zum
bereitgestellten Skill-Katalog. Sie müssten daher vor einer streng
skill-gesteuerten Frontend-Überarbeitung installiert und in einer neuen
Sitzung verfügbar gemacht werden.

## 2. Angular CLI MCP Server

Der Server ist in die Angular CLI integriert und wird vom MCP-Host mit
`npx @angular/cli mcp` gestartet
([Angular: MCP Server](https://angular.dev/ai/mcp)). Die aktuelle offizielle
Dokumentation listet folgende Standardwerkzeuge:

| Werkzeug | Zweck |
| --- | --- |
| `ai_tutor` | Interaktiven Angular-Tutor laden |
| `devserver.start` | `ng serve` asynchron starten |
| `devserver.stop` | den gestarteten Dev-Server stoppen |
| `devserver.wait_for_build` | Logs des letzten bzw. laufenden Dev-Server-Builds liefern |
| `get_best_practices` | versionsbezogene Angular Best Practices laden |
| `list_projects` | Apps und Libraries anhand von `angular.json` auflisten |
| `onpush_zoneless_migration` | schrittweisen Plan für `OnPush` und Zoneless-Vorbereitung liefern |
| `run_target` | ein konfiguriertes Ziel wie Build, Test, Lint oder E2E ausführen |
| `search_documentation` | die offizielle Dokumentation auf angular.dev durchsuchen |

Quelle für Liste und Beschreibungen:
[Angular CLI MCP Server – Available Tools](https://angular.dev/ai/mcp#available-tools-default).

Typische offizielle Abläufe kombinieren diese Werkzeuge: Für
Feature-Entwicklung nennt Angular Dokumentationssuche,
`get_best_practices`, Dev-Server/Build-Beobachtung, Test-Erstellung und
`run_target`; für die Zoneless-Migration werden Workspace-Erkennung,
signalbezogene Schematics, iterative Migrationsschritte und Tests kombiniert
([Angular: Common Workflows](https://angular.dev/ai/mcp#common-workflows)).

## 3. Voraussetzungen und Codex-Konfiguration

Das Projekt verwendet Angular 22.1.x und Angular CLI 22.1.x
([`frontend/package.json`](../../frontend/package.json)). Angular 22.0.x
unterstützt offiziell Node.js `^22.22.3`, `^24.15.0` oder `^26.0.0`; die lokal
festgestellte Node-Version 24.19.0 liegt damit im unterstützten Bereich
([Angular-Versionskompatibilität](https://angular.dev/reference/versions)).

Angular bietet für bestehende Projekte den Generator
`ng generate ai-config --tool open-ai-codex`; alternativ kann bei einer neuen
App `ng new ... --ai-config open-ai-codex` verwendet werden
([ai-config](https://angular.dev/cli/generate/ai-config),
[ng new](https://angular.dev/cli/new)). Die generierte Codex-Konfiguration ist:

```toml
[mcp_servers.angular-cli]
command = "npx"
args = ["-y", "@angular/cli", "mcp"]
```

Das ist das unveränderte offizielle
[Angular-CLI-Template](https://github.com/angular/angular-cli/blob/main/packages/schematics/angular/ai-config/files/__tomlConfigName__.template).
Der Generator legt für Codex außerdem eine `AGENTS.md` an, überspringt aber
eine bereits vorhandene Datei, statt projektspezifische Anweisungen zu
überschreiben
([Generatorimplementierung](https://github.com/angular/angular-cli/blob/main/packages/schematics/angular/ai-config/index.ts),
[Dateibehandlung](https://github.com/angular/angular-cli/blob/main/packages/schematics/angular/ai-config/file_utils.ts)).

Für dieses Repository ist zusätzlich zu beachten, dass das Angular-Workspace-
Root `frontend/` und nicht das Git-Root ist. Weil `list_projects`
`angular.json` auswertet, sollte die endgültige Codex-Einrichtung nach der
npm/npx-Reparatur aus dem Angular-Workspace heraus erzeugt und anschließend
mit `list_projects` praktisch validiert werden
([Werkzeugbeschreibung](https://angular.dev/ai/mcp#available-tools-default)).

Für eine erste reine Analyse empfiehlt sich:

```toml
[mcp_servers.angular-cli]
command = "npx"
args = ["-y", "@angular/cli", "mcp", "--read-only"]
```

`--read-only` registriert nur nicht verändernde MCP-Werkzeuge;
`--local-only` registriert nur Werkzeuge ohne Internetzugriff
([Angular: Command Options](https://angular.dev/ai/mcp#command-options)). Diese
Schalter beschränken den MCP-Server, nicht automatisch die separaten Datei-
oder Shell-Fähigkeiten des Host-Agenten; die ältere offizielle v21-Dokumentation
stellt diese Abgrenzung ausdrücklich klar
([Angular v21: Command Options](https://v21.angular.dev/ai/mcp#command-options)).

## 4. Reifegrad und Grenzen

- Die Skills erscheinen in der aktuellen Angular-Navigation als „New“, tragen
  in ihren Metadaten Version `1.0` und werden von Angular laufend aktualisiert
  ([Skills-Seite](https://angular.dev/ai/agent-skills),
  [`angular-developer`](https://github.com/angular/angular/blob/main/skills/dev-skills/angular-developer/SKILL.md),
  [`angular-new-app`](https://github.com/angular/angular/blob/main/skills/dev-skills/angular-new-app/SKILL.md)).
- Die aktuelle Angular-22-Seite bezeichnet den MCP-Server nicht mehr als
  experimentell. Die offizielle Angular-21-Seite bezeichnete den Server noch
  ausdrücklich als experimentell und führte mehrere Werkzeuge separat als
  experimentell/Preview
  ([aktuelle Dokumentation](https://angular.dev/ai/mcp),
  [v21-Dokumentation](https://v21.angular.dev/ai/mcp)).
- Die Werkzeugoberfläche ist versionsabhängig: Die aktuelle Seite führt
  `devserver.*` und `run_target` als Standardwerkzeuge, während ältere bzw.
  gespiegelt veröffentlichte Angular-Unterlagen noch andere Aufteilungen und
  experimentelle Schalter zeigen
  ([aktuelle Werkzeugliste](https://angular.dev/ai/mcp#available-tools-default),
  [Skill-Referenz im offiziellen Angular-Skills-Repository](https://github.com/angular/skills/blob/main/angular-developer/references/mcp.md)).
  Deshalb sollte stets die im Projekt installierte CLI-Version maßgeblich sein.
- Skills sind Anleitungskontext und keine statische Codeprüfung; der MCP-Server
  ergänzt ausführbare Werkzeuge, ersetzt aber weder Review noch
  projektspezifische Tests. Angular selbst beschreibt die Skills als
  instruction-level guidance und den MCP-Server als Action-Tools
  ([Angular: Integration with Angular AI Agent Skills](https://angular.dev/ai/mcp#integration-with-angular-ai-agent-skills)).
- Netzwerkzugriff bleibt relevant: `search_documentation` benötigt Internet;
  `--local-only` blendet solche Werkzeuge aus
  ([MCP-Werkzeuge und Optionen](https://angular.dev/ai/mcp)). Der
  `angular-new-app`-Skill nennt Internetzugriff ebenfalls ausdrücklich als
  Voraussetzung
  ([Skill-Datei](https://github.com/angular/angular/blob/main/skills/dev-skills/angular-new-app/SKILL.md)).

## 5. Empfehlung für die Frontend-Analyse

1. npm/npx reparieren und anschließend die vorhandene Angular CLI 22.1.x als
   maßgeblichen Server verwenden; keine unkontrollierte Versionsmischung mit
   einer abweichenden globalen CLI.
2. Den offiziellen `angular-developer`-Skill installieren und für jede
   Feature-Prüfung die jeweils einschlägigen Referenzen laden. Seine
   versionsbezogene Analyse-, CLI- und Build-Regeln sind hierfür direkt
   einschlägig
   ([Skill-Datei](https://github.com/angular/angular/blob/main/skills/dev-skills/angular-developer/SKILL.md)).
3. Den Angular MCP Server zunächst mit `--read-only` anbinden und
   `list_projects`, `get_best_practices`, `search_documentation` sowie bei
   Bedarf `onpush_zoneless_migration` zur Bestandsaufnahme verwenden; diese
   Werkzeuge sind in der aktuellen Standardliste dokumentiert
   ([Angular: Available Tools](https://angular.dev/ai/mcp#available-tools-default)).
4. Schreibende bzw. ausführende Nutzung erst danach gezielt freigeben und
   Änderungen mit `run_target` für Build und Tests verifizieren
   ([Angular: Feature Development & TDD Loop](https://angular.dev/ai/mcp#2-feature-development--tdd-loop)).
5. Die eigentliche Feature-für-Feature-Bewertung weiterhin am vorhandenen
   Produktkontext, an den bestehenden Tests und an den projektspezifischen
   Anweisungen in `AGENTS.md` ausrichten; Angular Skills und MCP ergänzen diese
   Quellen, ersetzen sie aber nicht.

## 6. Prüfstand und Gesamturteil des Frontends

Geprüft wurde der **vollständige Working Tree am 20.09.2026**, einschließlich
der noch nicht committeten Pagination-Änderungen in
`wareneintrag-liste.ts`, `wareneintrag-liste.html` und
`wareneintrag-liste.spec.ts`. Diese Änderungen wurden nicht ausgeklammert und
waren Bestandteil von Build und Tests. Fremde Änderungen wurden bei dieser
reinen Analyse nicht verändert.

Verifikation:

- Produktions-Build: erfolgreich; initiales Bundle 363,37 kB roh bzw.
  99,61 kB geschätzt übertragen und damit innerhalb der konfigurierten Budgets.
- Unit-Tests: **67/67 erfolgreich** in Chrome Headless.
- Angular MCP: echter lokaler Handshake erfolgreich; `list_projects` erkannte
  das Angular-22-Workspace, `get_best_practices` lieferte die
  versionsspezifischen Regeln aus `@angular/core` 22.1.7.
- Keine automatisierte AXE-, E2E- oder visuelle Responsive-Prüfung vorhanden;
  eine WCAG-AA-Freigabe lässt sich deshalb trotz Material-Komponenten und
  semantischer Ansätze nicht ableiten.

Das Grundgerüst ist modern und tragfähig: Standalone-Komponenten, striktes
TypeScript, lazy geladene Feature-Routen, Signals, native Template-Control-
Flow-Syntax, funktionsbasierte Guards/Interceptors, Angular Material und eine
PWA-App-Shell entsprechen weitgehend der Angular-22-Richtung. Das MVP ist
jedoch noch nicht fachlich vollständig. Insbesondere fehlen Bearbeiten und
Löschen von Wareneinträgen in der UI, obwohl Spezifikation und Backend diese
Funktionen vorsehen.

### Prioritäten

| Priorität | Befund | Auswirkung |
| --- | --- | --- |
| P1 | Bearbeiten und Löschen fehlen in der Wareneintrag-Liste | Kernumfang für Vorgesetzte ist unvollständig |
| P1 | `403` wird wie `401` behandelt und meldet den Nutzer ab | Berechtigungsfehler zerstört unnötig die Sitzung |
| P1 | AVV-Autocomplete mischt Objektwert und Stringmodell | verzögerte Suche kann mit einem Objekt statt Suchtext ausgelöst werden |
| P1 | Lade-, Leer- und Fehlerzustände der Ressourcen sind nicht getrennt | Fehler erscheinen als „keine Daten“, Formulare können zu früh bedienbar sein |
| P1 | Keine AXE-/E2E-Prüfung, Statusmeldungen ohne Live-Region | offizielle Angular-Anforderung „WCAG AA / AXE“ ist nicht nachgewiesen |
| P1 | Drei manuelle Debounce-Timer bilden reaktives Verhalten imperativ nach | Cleanup, Abbruch, Typfluss und Request-Rennen werden unnötig selbst verwaltet |
| P2 | Alle Formulare sind template-driven | widerspricht der Angular-22-Empfehlung für Signal Forms bzw. Reactive Forms |
| P2 | Passwort-UI verlangt 8, Backend verlangt 12 Zeichen | vermeidbarer Submit-Fehler und inkonsistentes Feedback |
| P2 | Foto-Object-URLs und Timer werden nicht aufgeräumt | kleine Leaks bzw. verspätete Zustandsänderungen nach Zerstörung |
| P2 | Dokument-Metadaten sind Englisch/generisch, Roboto wird extern geladen | falsche Sprache, schwächere PWA-/Datenschutz-/Offline-Konsistenz |
| P3 | statische Logos ohne `NgOptimizedImage`, Ableitungen als Getter statt `computed()` | Abweichung von den versionsspezifischen Best Practices |

## 7. Feature-für-Feature-Bewertung

### 7.1 App-Start, Routing und Rollensteuerung

**Gut:** `bootstrapApplication`, zentraler `ApplicationConfig`, lazy
`loadComponent`-Routen und funktionsbasierte Guards sind zeitgemäß. Die
Session wird vor der ersten Routenauflösung initialisiert; Mitarbeiter und
Vorgesetzte erhalten passende Startziele. Die Feature-Routen sind klein und
verständlich
([`app.config.ts`](../../frontend/src/app/app.config.ts),
[`app.routes.ts`](../../frontend/src/app/app.routes.ts)).

**Lücken:** Eine Wildcard-/Not-found-Route fehlt. Eine unbekannte URL kann
deshalb in einer leeren Shell enden. `403`-Antworten werden im zentralen
Interceptor wie eine abgelaufene Sitzung behandelt, obwohl die eigene
Fehlerübersetzung `403` korrekt als fehlende Berechtigung versteht. Nur `401`
sollte die Sitzung verwerfen; `403` sollte als fachlicher Berechtigungsfehler
in der aktuellen Ansicht bleiben
([`unauthorized.interceptor.ts`](../../frontend/src/app/core/unauthorized.interceptor.ts),
[`http-fehler.ts`](../../frontend/src/app/core/http-fehler.ts)). Der
Logout-Aufruf sollte außerdem vom Interceptor ausgenommen werden, damit ein
infrastrukturseitiges `401/403` auf `/auth/logout` keine erneute Logout-Kette
starten kann.

**Angular-Bezug:** Lazy Loading, Signals und `inject()` sind erfüllt. Der
abgeleitete Rollenstatus in `Shell` sollte als `computed()` statt als Getter
modelliert werden.

### 7.2 App-Shell und Navigation

**Gut:** Die Shell trennt Desktop-Toolbar und mobile Bottom-Navigation klar,
verwendet rollenabhängige Navigation und bietet sichtbare Textlabels neben
Icons. Das Layout ist einfach und nachvollziehbar
([`shell.html`](../../frontend/src/app/core/shell/shell.html)).

**Lücken:** Aktive Links werden nur visuell ausgezeichnet; `aria-current`
sollte über `ariaCurrentWhenActive` gesetzt werden. Die Navigationsbereiche
brauchen unterscheidbare `aria-label`s. Nach Navigation und Dialog-/Bottom-
Sheet-Aktionen fehlt explizites Fokusmanagement. Die drei statischen Logos
sollten nach offizieller Angular-22-Regel mit `NgOptimizedImage` gerendert
werden.

### 7.3 Login und Session

**Gut:** HttpOnly-Cookie-basierte Authentifizierung, Double-Submit-CSRF,
Same-Origin-Begrenzung der Interceptors, generische Login-Fehler und
rollenbasierte Weiterleitung sind solide. Der Client speichert keinen Token im
Web Storage
([`auth.service.ts`](../../frontend/src/app/core/auth.service.ts),
[`csrf.interceptor.ts`](../../frontend/src/app/core/csrf.interceptor.ts)).

**Lücken:** Das Formular deaktiviert den Submit nur während des Requests,
nicht bei ungültigen Eingaben. Fehlertexte haben weder `role="alert"` noch
`aria-live`; Screenreader erhalten daher keine verlässliche Ankündigung. Eine
erneute Anmeldung bei bereits aktiver Session wird nicht gezielt behandelt.
Die offizielle v22-Best-Practice empfiehlt für neue Singleton-Services
`@Service` und für neue Formulare Signal Forms; aktuell werden
`@Injectable({ providedIn: 'root' })` und `FormsModule` verwendet.

### 7.4 Passwort vergessen / Passwort setzen

**Gut:** Die Vergessen-Funktion schützt vor Account-Enumeration, indem Erfolg
und Fehler dieselbe Bestätigung zeigen. Der Reset-Token wird unmittelbar nach
dem Einlesen aus URL und Browserhistorie entfernt. Das sind gute
Sicherheitsentscheidungen.

**Lücken:** Die UI akzeptiert ab 8 Zeichen, während das Backend mindestens 12
Zeichen verlangt. Die Clientvalidierung muss die tatsächliche Regel spiegeln
und idealerweise konkrete Hinweise vor dem Submit zeigen. Ein fehlender Token
wird erst nach einem API-Fehler sichtbar, statt sofort einen ungültigen Link zu
melden. Der 2-Sekunden-Weiterleitungs-Timer wird beim Zerstören der Komponente
nicht abgeräumt. Auch hier fehlen Live-Region und Fokuswechsel auf Bestätigung
oder Fehler.

### 7.5 Wareneintrag erfassen

**Gut:** Das Feature ist mobile-first, verlangt Foto, gewählten AVV-Code und
Freitext, zeigt eine Vorschau, sendet korrektes `FormData` und bietet direkt
einen weiteren Eintrag an. Die AVV-Suche ist gedrosselt und die erfolgreiche
Erfassung ist getestet
([`wareneintrag-erfassen.ts`](../../frontend/src/app/features/wareneintrag-erfassen/wareneintrag-erfassen.ts)).

**Lücken:** Beim Autocomplete ist `[value]` ein `AvvCode`-Objekt, das
`ngModel` und `onAvvSucheEingabe(wert: string)` aber als String behandeln.
Beim Auswählen kann deshalb noch ein verzögerter Suchlauf mit dem Objektwert
geplant werden. Sauber wäre ein reines String-Control plus separate ID oder
ein typisiertes Control mit `displayWith`; Debouncing sollte über Signal
Forms/Reactive Forms und einen abbrechbaren Ressourcenfluss erfolgen.

`URL.createObjectURL` wird bei Fotoaustausch, Reset und Komponentenabbau nicht
mit `URL.revokeObjectURL` freigegeben. `capture="environment"` könnte auf
Mobilgeräten die Rückkamera bevorzugen; eine Dateityp-/Größenmeldung vor dem
Upload würde die serverseitigen Grenzen nutzerfreundlich spiegeln. Lade- und
Fehlerzustände der AVV-Ressource fehlen. Die Erfolgsmeldung benötigt eine
Live-Region und Fokusmanagement.

### 7.6 Wareneinträge auflisten, suchen und paginieren

**Gut:** Kombinierte AVV-/Freitextfilter, 300-ms-Debounce, Kartenansicht,
deutsche Datumsausgabe und serverseitige Pagination sind vorhanden. Die noch
nicht committete Pagination setzt Seite und Seitengröße korrekt in Query-
Parameter um und springt bei Filteränderungen auf Seite 0 zurück; die neuen
Tests decken diese Abläufe ab
([`wareneintrag-liste.ts`](../../frontend/src/app/features/wareneintrag-liste/wareneintrag-liste.ts),
[`wareneintrag-liste.spec.ts`](../../frontend/src/app/features/wareneintrag-liste/wareneintrag-liste.spec.ts)).

**P1-Lücke:** Die Spezifikation verlangt Bearbeiten und Löschen. Die Liste
zeigt keine Aktionen, keinen Bearbeitungsdialog und keine Löschbestätigung,
obwohl das Backend bereits `PATCH /wareneintraege/:id` und
`DELETE /wareneintraege/:id` bereitstellt. Damit ist das wichtigste
Vorgesetzten-Feature fachlich unvollständig.

**Weitere Lücken:** Der gleiche Objekt/String-Fehler wie im Erfassungsformular
ist im AVV-Autocomplete vorhanden. Beim Fokus wird die sichtbare Auswahl
geleert, der Filter bleibt aber zunächst aktiv; das kann einen unsichtbaren
Filterzustand erzeugen. Während Laden oder bei API-Fehlern zeigt `@empty`
„Keine Wareneinträge gefunden“, wodurch Netzwerkfehler als valides leeres
Ergebnis erscheinen. Es fehlen Retry, Ladeindikator, Fehlerzustand und eine
Ergebnisanzahl. Karten zeigen weder Standort noch erfassenden Mitarbeiter,
obwohl diese Daten für die Verwaltung naheliegend sind. Das generische
Foto-Alt-Attribut unterscheidet die Einträge nicht.

### 7.7 Mitarbeiter anlegen

**Gut:** Die Route ist für Vorgesetzte geschützt, Standorte kommen aus
Stammdaten und der Initial-Zugang wird nach Erfolg angezeigt. API-Fehler werden
nutzbar übersetzt.

**Lücken:** Der Standort-Load hat keinen Lade-/Fehlerzustand; bis zum Laden ist
ein leeres Select sichtbar. Der Submit ist nur während des Requests gesperrt,
nicht bei ungültigem Formular. Der sensible Einladungslink steht als
unformatierter Code ohne Kopieraktion, Ablaufhinweis oder erneute
Anlage-Möglichkeit da. Erfolg und Fehler sind nicht als Live-Region markiert.

### 7.8 Einstellungen

**Gut:** Eigene Daten und Standorte werden getrennt geladen, das Formular wird
reaktiv befüllt und Änderungen werden per `PATCH` gespeichert. Fehler und
Erfolg sind grundsätzlich sichtbar.

**Lücken:** Solange Ressourcen laden oder fehlschlagen, bleibt das Formular
mit leeren Werten bedienbar; dadurch kann ein Nutzer leere Daten absenden. Es
fehlen Lade-, Fehler- und Retry-Zustände sowie eine Dirty-Prüfung. Der
`effect()` schreibt in nicht-signalbasierte Formularfelder; Signal Forms oder
Reactive Forms würden Initialisierung, Validierung und Dirty-/Pending-Status
expliziter und testbarer machen.

### 7.9 PWA, Styling und Dokument-Metadaten

**Gut:** Manifest, Icons, Service Worker, lokale Material-Icons und
Produktions-Budgets sind eingerichtet. Die App-Shell wird gecacht, ohne einen
nicht spezifizierten Offline-Formularpuffer einzuführen.

**Lücken:** `index.html` setzt `lang="en"`, den Titel `Frontend` und einen
englischen Noscript-Text, obwohl die Anwendung rein deutsch ist. Richtig sind
mindestens `lang="de"`, ein Produktname als Titel und deutscher Fallbacktext.
Roboto wird von Google Fonts geladen, obwohl die PWA ansonsten lokale Assets
verwendet; für Datenschutz, CSP und Offline-Konsistenz sollte die Schrift lokal
gebündelt oder durch Systemtypografie ersetzt werden. Die Markenfarben sind
laut eigener Branding-Dokumentation noch Näherungswerte und deshalb nicht
freigabefähig. Eine systematische Dark-/High-Contrast-/Reduced-Motion-Prüfung
fehlt.

### 7.10 Tests und Wartbarkeit

**Gut:** 67 fokussierte Unit-Tests decken Guards, Auth-Service, Interceptors,
Fehlerabbildung, Shell und alle vorhandenen Features ab. Strict Templates und
striktes TypeScript sind aktiv. Build und Tests laufen mit Angular 22.1.x.

**Lücken:** Es gibt keine Tests für Bearbeiten/Löschen, weil die Features
fehlen; keine AXE-Tests, keine E2E-Strecken für Login → Erfassen bzw. Login →
Verwalten und keine PWA-/Offline-Verifikation. Der Autocomplete-Objekt/String-
Randfall, Ressourcenfehler und Interceptor-Verhalten bei `403` sind nicht
abgedeckt. API-Typen (`AvvCode`, `Standort`, Antworten) sind mehrfach lokal
dupliziert; ein kleiner, fachlich benannter API-Layer würde Drift verhindern,
ohne ein schweres globales State-Management einzuführen.

## 8. Abgleich mit den Angular-22-Best-Practices

| Angular-22-Regel | Stand | Bewertung |
| --- | --- | --- |
| striktes TypeScript, kein `any` im Produktivcode | erfüllt | beibehalten |
| Standalone-Komponenten ohne explizites `standalone: true` | erfüllt | idiomatisch |
| lazy geladene Feature-Routen | erfüllt | idiomatisch |
| Signals für lokalen Zustand | überwiegend erfüllt | Getter in `computed()` überführen |
| native `@if`/`@for`-Syntax | erfüllt | idiomatisch |
| `inject()` statt Constructor Injection | im Frontend erfüllt | idiomatisch |
| Signal Forms, sonst Reactive Forms bevorzugen | nicht erfüllt | schrittweise pro Feature migrieren |
| `NgOptimizedImage` für statische Bilder | nicht erfüllt | Logos migrieren; dynamische Uploadbilder separat behandeln |
| kleine, fokussierte Komponenten | weitgehend erfüllt | Listenkarte/Edit-Dialog bei Ausbau auslagern |
| AXE und WCAG AA | nicht nachgewiesen | automatisierte und manuelle A11y-Prüfung ergänzen |
| `computed()` für abgeleiteten Zustand | teilweise | `istVorgesetzter`, `kannAbsenden` umstellen |

## 9. Empfohlene Umsetzungsreihenfolge

1. Wareneinträge bearbeiten/löschen inklusive Bestätigungsdialog, optimistischer
   oder expliziter Ressourcenaktualisierung und Tests ergänzen.
2. Auth-Interceptor auf `401` begrenzen und Logout-Endpunkt ausnehmen; neue
   Tests für `403` und Logout-Fehler hinzufügen.
3. Beide AVV-Autocompletes typisieren und den Objekt/String-Debounce-Fehler
   beseitigen.
4. Ressourcen überall mit klaren Loading-/Error-/Empty-/Retry-Zuständen
   darstellen.
5. Formulare Feature für Feature auf Angular 22 Signal Forms umstellen und
   Client-/Backend-Validierungen angleichen.
6. A11y-Basis ergänzen: Live-Regionen, Fokusmanagement, `aria-current`,
   Navigationslabels; danach AXE- und Tastaturtests.
7. Foto-URL-/Timer-Cleanup, Kamera-Hinweis und clientseitiges Dateifeedback
   ergänzen.
8. deutsche Dokument-Metadaten, lokale Schrift und statische
   `NgOptimizedImage`-Logos korrigieren.
9. Angular MCP projektbezogen registrieren und Build/Test/Dokumentationssuche
   künftig über dessen versionsspezifische Werkzeuge verifizieren.

## 10. Code-Smell- und Wartbarkeits-Audit

Dieser Abschnitt ergänzt die Feature-Prüfung um eine mechanisierte Suche nach
Workarounds, duplizierter Logik, überlappenden Verantwortlichkeiten und
fehlenden Qualitäts-Gates. Die Bewertung bezieht sich ausschließlich auf den
Produktivcode unter `frontend/src`; Tests wurden zur Prüfung der Abdeckung
herangezogen, aber nicht als Produktiv-Smells gezählt.

Mechanisch verifiziert wurden unter anderem:

- 4 direkte `setTimeout`-Aufrufe: drei für Debouncing, einer für eine
  verzögerte Navigation.
- 6 `resource()`-Loader, die `HttpClient` mittels `firstValueFrom()` in ein
  Promise umwandeln.
- 4 Feature-Komponenten mit direktem `HttpClient`-Zugriff.
- 7 Feature-Komponenten mit `FormsModule`.
- Doppelte lokale Deklarationen für `AvvCode`, `Wareneintrag` und `Standort`.
- Kein `lint`-Target, kein ESLint-/anderes Frontend-Linting und kein
  Stylelint-Target im Workspace.
- Größte Feature-Klassen: jeweils 119 Zeilen. Es gibt keine verschachtelten
  Subscriptions, kein `any` im Produktivcode und keine übergroße
  God-Component. Der Code ist daher **noch kein Spaghetti-Code**, zeigt aber
  an den Suchfeatures bereits eine klare Entwicklung in diese Richtung.

### MEDIUM

**M1 — Manuelle Timer implementieren Debouncing außerhalb des reaktiven
Modells.**
[`wareneintrag-erfassen.ts:52`](../../frontend/src/app/features/wareneintrag-erfassen/wareneintrag-erfassen.ts),
[`wareneintrag-erfassen.ts:73`](../../frontend/src/app/features/wareneintrag-erfassen/wareneintrag-erfassen.ts),
[`wareneintrag-liste.ts:60`](../../frontend/src/app/features/wareneintrag-liste/wareneintrag-liste.ts) und
[`wareneintrag-liste.ts:87`](../../frontend/src/app/features/wareneintrag-liste/wareneintrag-liste.ts)
halten Timer-IDs, rufen `clearTimeout()` manuell auf und schreiben nach 300 ms
in ein zweites Signal. Die Timer werden beim Komponentenabbau nicht
abgeräumt. Gleichzeitig kann der bereits dokumentierte Objekt/String-Fehler
des Autocompletes einen falsch typisierten Wert in den verzögerten Callback
tragen.

**Auswirkung:** Der Suchfluss verteilt sich über Template-Event, veränderbares
Anzeigefeld, Timer-ID, Rohsignal, debounced Signal, Auswahlobjekt und
`resource`. Abbruch, Gleichheit, Lebenszyklus und Typfluss müssen manuell
koordiniert werden. Genau diese verteilte Zustandsmaschine ist ein früher
Spaghetti-Indikator.

**Fix:** Für Angular 22 ist bei der ohnehin empfohlenen Formularmigration
Signal Forms mit `debounce(schemaPath.suche, 300)` die direkteste Lösung;
Angular synchronisiert dabei auf Blur/Submit und verwaltet den Timer. Falls
das Formular vorerst signalbasiert ohne Signal Forms bleibt: ein einziges
Roh-Signal mit `toObservable(...).pipe(debounceTime(300),
distinctUntilChanged())`, anschließend `toSignal()` für reaktive Parameter.
HTTP-basierte Ressourcen sollten `rxResource()` verwenden. Wird die Anfrage
direkt im Observable-Fluss ausgeführt, sorgt `switchMap()` für Abbruch der
vorherigen Suche. Manuelle Subscriptions sind mit `takeUntilDestroyed()` zu
begrenzen. Offizielle Referenzen:
[`toObservable`](https://angular.dev/api/core/rxjs-interop/toObservable),
[`debounce`](https://angular.dev/api/forms/signals/debounce),
[`rxResource`](https://angular.dev/api/core/rxjs-interop/rxResource),
[`takeUntilDestroyed`](https://angular.dev/ecosystem/rxjs-interop/take-until-destroyed).

**M2 — `resource()` plus `firstValueFrom(HttpClient)` ist eine unnötige
Observable→Promise-Brücke.** Sechs Loader in
[`einstellungen.ts`](../../frontend/src/app/features/einstellungen/einstellungen.ts),
[`mitarbeiter-anlegen.ts`](../../frontend/src/app/features/mitarbeiter-anlegen/mitarbeiter-anlegen.ts),
[`wareneintrag-erfassen.ts`](../../frontend/src/app/features/wareneintrag-erfassen/wareneintrag-erfassen.ts) und
[`wareneintrag-liste.ts`](../../frontend/src/app/features/wareneintrag-liste/wareneintrag-liste.ts)
wandeln das vom `HttpClient` gelieferte Observable zuerst in ein Promise um.

**Auswirkung:** Der Code verliert die natürliche Observable-Komposition und
die Unsubscription des `HttpClient` bei Parameterwechseln. `resource()` kann
einen Promise-Loader zwar logisch verwerfen, aber der bereits gestartete
HTTP-Observable-Request ist über diese Brücke nicht mehr direkt an die
Ressourcenlebensdauer gekoppelt. Fehler- und Ladebehandlung werden außerdem in
jeder Komponente neu erfunden.

**Fix:** Für Read-Requests `rxResource({ params, stream })` einsetzen und das
`HttpClient`-Observable direkt zurückgeben. `firstValueFrom()` kann bei klar
imperativen Mutationen wie Login oder Submit weiterhin vertretbar sein; eine
pauschale Entfernung wäre unnötig. Angular 22 führt sowohl `resource()` als
auch `rxResource()` stabil und beschreibt `rxResource()` ausdrücklich für
Observable-basierte Loader
([Angular API](https://angular.dev/api/core/rxjs-interop/rxResource)).

**M3 — Suchzustand ist auf zu viele unabhängig veränderbare Felder verteilt.**
Die Wareneintrag-Liste hält `avvCodeId`, `suche`, `seite`, `proSeite`,
`avvSucheAnzeige`, `avvSuchbegriff` und zwei Timer separat. Das
Erfassungsfeature trennt Anzeige, Auswahlobjekt, Suchbegriff und Timer ähnlich.

**Auswirkung:** Ungültige Kombinationen sind möglich, etwa sichtbarer leerer
AVV-Text bei weiterhin aktivem Filter oder ein bereits ausgewählter Code mit
nachlaufender Objektsuche. Neue Filter, Sortierung oder URL-Synchronisierung
würden die Zahl manueller Seiteneffekte weiter erhöhen.

**Fix:** Einen typisierten Formular-/Filterzustand als einzelne Quelle der
Wahrheit definieren. Ableitungen (`kannAbsenden`, Request-Parameter,
Anzeigezustand) werden `computed()`; synchrone Zustandsübergänge aktualisieren
den Filter atomar. Keine generische globale Store-Bibliothek einführen – der
lokale Angular-Signal-/Form-State genügt.

**M4 — Feature-Komponenten mischen UI, API-Verträge, Endpunkte und
Orchestrierung.** Vier Komponenten injizieren `HttpClient` direkt und kennen
ihre URL-Strings, DTO-Form und Ressourcenaufbereitung. AVV- und
Standort-Ladevorgänge sind mehrfach implementiert.

**Auswirkung:** Backend-Vertragsänderungen müssen an mehreren UI-Stellen
nachgezogen werden. Einheitliche Fehler-, Cache- und Abbruchsemantik lässt
sich nicht zentral testen. Mit den noch fehlenden Edit-/Delete-Funktionen
würden Liste und Erfassungsfeature schnell anwachsen.

**Fix:** Kleine fachliche Gateways einführen, beispielsweise
`AvvCodeApi`, `StandortApi` und `WareneintragApi`, die typisierte Observables
liefern. Keine Repository-/Store-Hierarchie und keine abstrakte Base-Class:
Die Services sollen nur den wiederholten fachlichen HTTP-Vertrag kapseln.

**M5 — Es fehlt ein automatisches Smell- und Konsistenz-Gate.**
`frontend/package.json` kennt nur `start`, `build`, `watch` und `test`;
`angular.json` hat kein `lint`-Target. Weder ESLint noch ein vergleichbares
TypeScript-/Template-Linting ist konfiguriert.

**Auswirkung:** Build und Tests erkennen unter anderem manuelle Timer,
Lifecycle-Leaks, unzugängliche Templates, inkonsistente Member-Sichtbarkeit
oder verbotene Architekturmuster nicht. Code-Smells hängen vollständig vom
Review ab.

**Fix:** Angular ESLint mit TypeScript- und Template-Regeln als `npm run lint`
und CI-Gate ergänzen. Projektspezifische Regeln können direkte
`HttpClient`-Nutzung in Features oder ungeklärte `setTimeout`-Nutzung zunächst
als Review-Konvention dokumentieren; erst bei wiederholten Verstößen als
Custom Rule automatisieren.

### LOW

**L1 — Zeitgesteuerte Navigation ist ein weiterer manueller
Lebenszyklus-Workaround.**
[`passwort-setzen.ts:43`](../../frontend/src/app/features/passwort-setzen/passwort-setzen.ts)
navigiert zwei Sekunden nach Erfolg per `setTimeout`, ohne den Timer beim
Komponentenabbau zu stoppen.

**Auswirkung:** Eine bereits verlassene Komponente kann später noch eine
Navigation auslösen. Die Wartezeit ist zudem eine implizite UX-Regel ohne
Steuerungsmöglichkeit.

**Fix:** Bevorzugt sofort navigieren und die Erfolgsmeldung auf der Zielseite
anzeigen. Falls die Verzögerung fachlich gewollt ist, `timer(2000).pipe(
takeUntilDestroyed())` verwenden oder einen sauber über `DestroyRef`
abgeräumten Timer einsetzen.

**L2 — Browser-Ressourcen werden manuell erzeugt, aber nicht symmetrisch
freigegeben.**
[`wareneintrag-erfassen.ts:70`](../../frontend/src/app/features/wareneintrag-erfassen/wareneintrag-erfassen.ts)
erzeugt Object-URLs, ohne die alte URL bei Austausch, Reset oder Destroy zu
revoken.

**Auswirkung:** Wiederholte Fotoauswahl hält Blob-Speicher bis zum Ende des
Dokuments fest.

**Fix:** Vor jedem Ersetzen und in `DestroyRef.onDestroy()` die bisherige URL
mit `URL.revokeObjectURL()` freigeben; die Zuständigkeit in eine kleine lokale
Hilfsmethode kapseln.

**L3 — Duplizierte Typen und Styles erzeugen stille Drift.** `AvvCode`,
`Wareneintrag` und `Standort` sind mehrfach lokal definiert. Login,
Passwort-vergessen und Passwort-setzen duplizieren große Teile ihres
Card-/Form-SCSS; alle Submit-Komponenten wiederholen `fehler`,
`wirdGeladen` und ähnliche `try/catch/finally`-Blöcke.

**Auswirkung:** Kleine Änderungen laufen auseinander; die bereits
abweichenden Passwortlängen zeigen das konkrete Risiko. Zu frühe generische
Basisklassen würden das Problem allerdings nur verlagern.

**Fix:** Fachliche DTO-Typen und wirklich identische Layout-Tokens/Utilities
teilen. Submit-Logik zunächst über Signal Forms und API-Gateways vereinheitlichen.
Erst nach mindestens drei identischen fachlichen Abläufen eine gemeinsame
Abstraktion erwägen.

### Positiver Gegenbefund

Die Suche fand keine klassischen akuten Spaghetti-Merkmale wie lange
prozedurale Methoden, tiefe Bedingungsverschachtelung, globale mutable Stores,
verschachtelte Subscriptions, `any`-Kaskaden oder zyklische Feature-Imports.
Die Komponenten sind derzeit klein. Der richtige Zeitpunkt für die
Bereinigung ist deshalb jetzt: M1 bis M4 verhindern, dass die anstehenden
Edit-/Delete-Funktionen die bereits verstreute Zustands- und API-Logik weiter
vervielfachen.

### Aktualisierte Refactoring-Reihenfolge

1. M1 und den Autocomplete-Typfehler gemeinsam beheben: Signal Forms oder
   `toObservable`/`debounceTime` plus typisiertes Auswahlmodell.
2. M2/M4 bündeln: `rxResource` und kleine fachliche API-Gateways einführen.
3. Danach Bearbeiten/Löschen implementieren, damit neue Funktionalität nicht
   auf dem manuellen Timer-/Direkt-HTTP-Muster aufsetzt.
4. M5 als dauerhaftes Gate ergänzen.
5. L1–L3 zusammen mit der Formular- und A11y-Modernisierung bereinigen.

## 11. GitHub-Issues aus der Analyse

Die Befunde wurden am 20.09.2026 in umsetzbare, mit `ready-for-agent`
markierte GitHub-Issues überführt:

| Bereich | Issue |
| --- | --- |
| Bearbeiten/Löschen fehlt trotz geschlossenem Ticket | [#5 – wieder geöffnet](https://github.com/PatrickFrantzen/research/issues/5) |
| `401` und `403` korrekt unterscheiden | [#49](https://github.com/PatrickFrantzen/research/issues/49) |
| AVV-Suche ohne manuelle Timer | [#50](https://github.com/PatrickFrantzen/research/issues/50) |
| `rxResource` und fachliche API-Gateways | [#51](https://github.com/PatrickFrantzen/research/issues/51) |
| Signal Forms statt template-driven Forms | [#52](https://github.com/PatrickFrantzen/research/issues/52) |
| Loading/Error/Empty/Retry für Resources | [#53](https://github.com/PatrickFrantzen/research/issues/53) |
| WCAG AA und AXE als Gate | [#54](https://github.com/PatrickFrantzen/research/issues/54) |
| Timer-/Object-URL-Cleanup | [#55](https://github.com/PatrickFrantzen/research/issues/55) |
| Angular ESLint als CI-Gate | [#56](https://github.com/PatrickFrantzen/research/issues/56) |
| PWA-Metadaten, Fonts und statische Bilder | [#57](https://github.com/PatrickFrantzen/research/issues/57) |
| Not-found-Route und Shell-Zustände | [#58](https://github.com/PatrickFrantzen/research/issues/58) |
| Mobile Fotoerfassung | [#59](https://github.com/PatrickFrantzen/research/issues/59) |
| Mitarbeiter-Onboarding | [#60](https://github.com/PatrickFrantzen/research/issues/60) |
| Verwaltungsansicht vervollständigen | [#61](https://github.com/PatrickFrantzen/research/issues/61) |
| Kritische E2E-Flows | [#62](https://github.com/PatrickFrantzen/research/issues/62) |

Bereits vorhandene Tickets wurden nicht dupliziert: defekte Foto-URL [#45](https://github.com/PatrickFrantzen/research/issues/45),
Material-Theme [#17](https://github.com/PatrickFrantzen/research/issues/17), Dark Mode
[#19](https://github.com/PatrickFrantzen/research/issues/19) und Firmenlogo
[#22](https://github.com/PatrickFrantzen/research/issues/22).
