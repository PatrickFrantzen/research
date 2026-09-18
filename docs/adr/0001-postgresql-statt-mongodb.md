---
status: accepted
---

# PostgreSQL statt MongoDB

`waste-connect-v2` nutzt MongoDB/Mongoose; RESEARCH weicht bewusst davon ab.
Das Datenmodell ist stark relational (Nutzer → Standort, Wareneintrag →
AVV-Code, Wareneintrag → Standort) und die geforderte Kombination aus
exaktem AVV-Filter und Volltextsuche im Freitext lässt sich in Postgres mit
Fremdschlüsseln (B-Tree-Index) plus `tsvector`/GIN-Index sauberer und
performanter abbilden als mit Mongoose-Referenzen und Text-Index.

## Considered Options

- MongoDB (wie `waste-connect-v2`, Team-Erfahrung vorhanden)
- PostgreSQL (gewählt)

## Consequences

Kein gemeinsamer DB-Layer/Code mehr mit `waste-connect-v2` – bewusst in
Kauf genommen, da RESEARCH ein eigenständiges Repo mit eigener
Infrastruktur ist.
