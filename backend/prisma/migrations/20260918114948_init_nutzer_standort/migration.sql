-- CreateEnum
CREATE TYPE "Rolle" AS ENUM ('MITARBEITER', 'VORGESETZTER');

-- CreateTable
CREATE TABLE "standorte" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "standorte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutzer" (
    "id" TEXT NOT NULL,
    "vorname" TEXT NOT NULL,
    "nachname" TEXT NOT NULL,
    "rolle" "Rolle" NOT NULL,
    "email" TEXT NOT NULL,
    "standort_id" TEXT NOT NULL,
    "passwort_hash" TEXT NOT NULL,
    "muss_passwort_setzen" BOOLEAN NOT NULL DEFAULT true,
    "passwort_setzen_token" TEXT,
    "passwort_setzen_token_ablauf" TIMESTAMP(3),
    "erstellt_von_id" TEXT,
    "erstellt_am" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nutzer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "standorte_name_key" ON "standorte"("name");

-- CreateIndex
CREATE UNIQUE INDEX "nutzer_email_key" ON "nutzer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "nutzer_passwort_setzen_token_key" ON "nutzer"("passwort_setzen_token");

-- AddForeignKey
ALTER TABLE "nutzer" ADD CONSTRAINT "nutzer_standort_id_fkey" FOREIGN KEY ("standort_id") REFERENCES "standorte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutzer" ADD CONSTRAINT "nutzer_erstellt_von_id_fkey" FOREIGN KEY ("erstellt_von_id") REFERENCES "nutzer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
