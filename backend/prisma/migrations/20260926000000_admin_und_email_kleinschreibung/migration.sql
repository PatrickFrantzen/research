-- AlterTable
ALTER TABLE "nutzer" ADD COLUMN "ist_admin" BOOLEAN NOT NULL DEFAULT false;

-- Bootstrap-Nutzer (ohne Ersteller) wird Admin, siehe ADR-0006.
UPDATE "nutzer" SET "ist_admin" = true WHERE "erstellt_von_id" IS NULL;

-- E-Mails werden ab jetzt klein gespeichert und verglichen.
UPDATE "nutzer" SET "email" = lower(trim("email"));
