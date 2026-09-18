-- Generierte tsvector-Spalte für die Volltextsuche im Freitext (deutsche
-- Textsuchkonfiguration), GIN-indiziert statt LIKE-Scan, siehe Issue #4.
ALTER TABLE "wareneintraege" ADD COLUMN "freitext_tsv" tsvector
  GENERATED ALWAYS AS (to_tsvector('german', "freitext")) STORED;

CREATE INDEX "wareneintraege_freitext_tsv_idx" ON "wareneintraege" USING GIN ("freitext_tsv");
