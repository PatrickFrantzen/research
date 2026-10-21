-- Optionale Kontaktdaten am Nutzer (Issue #129).
-- AlterTable
ALTER TABLE "nutzer" ADD COLUMN "telefon" TEXT,
ADD COLUMN "position" TEXT;
