<!--
  Herkunft der hier vendorten Skills, damit Aktualität/Lizenz nachvollziehbar bleiben.
-->

# Vendorte Skills

## ponytail

Übernommen aus `waste-connect-v2` (`backend/.claude/skills/ponytail`), dort
bereits im Einsatz. Erzwingt die schlankeste funktionierende Lösung
(YAGNI, Stdlib/Bordmittel vor Zusatzcode) – repo-weit nützlich, nicht nur
für Backend-Code, deshalb hier auf Repo-Root-Ebene statt unter `backend/`.

## Matt-Pocock-Skills (vendort)

Quelle: [github.com/mattpocock/skills](https://github.com/mattpocock/skills),
Lizenz: MIT (siehe Original-Repo).

Diese 25 Skills sind der aktuelle Stand des offiziellen Claude-Code-Plugins
`mattpocock-skills` (`.claude-plugin/plugin.json`, Version 1.2.3 zum
Zeitpunkt der Übernahme) – Engineering- und Productivity-Skills, ohne die
dortigen `deprecated`- und `in-progress`-Ordner (nicht Teil des
veröffentlichten Plugins).

**Warum als Dateien im Repo statt als Claude-Code-Plugin installiert**:
Ein `claude plugins install` ist eine lokale/Account-Einstellung und
überträgt sich nicht automatisch auf neue Sessions (z.B. Remote-/Web-
Sessions, die jedes Mal frisch aus diesem Repo klonen). Dateien unter
`.claude/skills/` werden dagegen von jeder Claude-Code-Session, die dieses
Repo öffnet, automatisch erkannt und geladen.

**Aktualisierung**: Kein automatisches Update (bewusste Entscheidung, siehe
Projekt-Chat) – bei Bedarf manuell aus dem Quell-Repo neu kopieren.

**Setup**: Einmal pro Repo sollte `/setup-matt-pocock-skills` ausgeführt
werden (fragt u.a. Issue-Tracker-Präferenz ab, GitHub Issues/Linear/lokale
Dateien) – das ist eine Patrick-Entscheidung und wurde hier noch nicht
ausgeführt.

## security-audit (Cloudflare)

Quelle: [github.com/cloudflare/security-audit-skill](https://github.com/cloudflare/security-audit-skill)
(`skills/security-audit`, Commit `c1c8a8c`), Lizenz: MIT (`security-audit/LICENSE`).

Mehrphasiger Security-Audit-Workflow (Recon → Hunting → Validierung →
`findings.json` → unabhängige Verifikation → Report). Aufruf z.B. mit
„security audit this codebase“. Output landet standardmäßig **außerhalb**
des Repos (`~/security-audit-skill/<repo>/run-<N>`); Ziel-Code wird nur in
einer OS-Sandbox ausgeführt, sonst bleibt es bei statischer Analyse.

**Aktualisierung**: manuell aus dem Quell-Repo neu kopieren.
