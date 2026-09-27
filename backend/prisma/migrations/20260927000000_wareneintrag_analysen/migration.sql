-- Gespeicherte KI-Analyse, genau eine pro Wareneintrag (Issue #94, ADR-0008).
-- CreateTable
CREATE TABLE "wareneintrag_analysen" (
    "wareneintrag_id" TEXT NOT NULL,
    "ergebnis" JSONB NOT NULL,
    "analysiert_von_id" TEXT NOT NULL,
    "analysiert_am" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wareneintrag_analysen_pkey" PRIMARY KEY ("wareneintrag_id")
);

-- AddForeignKey
ALTER TABLE "wareneintrag_analysen" ADD CONSTRAINT "wareneintrag_analysen_wareneintrag_id_fkey" FOREIGN KEY ("wareneintrag_id") REFERENCES "wareneintraege"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wareneintrag_analysen" ADD CONSTRAINT "wareneintrag_analysen_analysiert_von_id_fkey" FOREIGN KEY ("analysiert_von_id") REFERENCES "nutzer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

