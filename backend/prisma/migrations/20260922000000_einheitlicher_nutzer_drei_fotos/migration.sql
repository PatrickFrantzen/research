-- Rollenmodell entfällt: nur noch ein einheitlicher Nutzer-Typ.
ALTER TABLE "nutzer" DROP COLUMN "rolle";
DROP TYPE "Rolle";

-- Ein Pflichtfoto wird zu bis zu drei optionalen Fotos (Fern-, Nah-,
-- Detailansicht). Bestehendes Foto wird zur Fernansicht, bleibt aber
-- nullable, da Fotos künftig generell optional sind.
ALTER TABLE "wareneintraege" RENAME COLUMN "foto_url" TO "foto_fern_url";
ALTER TABLE "wareneintraege" ALTER COLUMN "foto_fern_url" DROP NOT NULL;
ALTER TABLE "wareneintraege" ADD COLUMN "foto_nah_url" TEXT;
ALTER TABLE "wareneintraege" ADD COLUMN "foto_detail_url" TEXT;
