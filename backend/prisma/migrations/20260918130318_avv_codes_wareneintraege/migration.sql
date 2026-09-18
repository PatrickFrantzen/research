-- CreateTable
CREATE TABLE "avv_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "gefaehrlich" BOOLEAN NOT NULL,

    CONSTRAINT "avv_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wareneintraege" (
    "id" TEXT NOT NULL,
    "foto_url" TEXT NOT NULL,
    "avv_code_id" TEXT NOT NULL,
    "freitext" TEXT NOT NULL,
    "erfasst_von_id" TEXT NOT NULL,
    "standort_id" TEXT NOT NULL,
    "erstellt_am" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wareneintraege_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "avv_codes_code_key" ON "avv_codes"("code");

-- AddForeignKey
ALTER TABLE "wareneintraege" ADD CONSTRAINT "wareneintraege_avv_code_id_fkey" FOREIGN KEY ("avv_code_id") REFERENCES "avv_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wareneintraege" ADD CONSTRAINT "wareneintraege_erfasst_von_id_fkey" FOREIGN KEY ("erfasst_von_id") REFERENCES "nutzer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wareneintraege" ADD CONSTRAINT "wareneintraege_standort_id_fkey" FOREIGN KEY ("standort_id") REFERENCES "standorte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
