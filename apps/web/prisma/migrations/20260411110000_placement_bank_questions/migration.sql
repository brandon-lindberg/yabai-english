-- CreateTable
CREATE TABLE "PlacementBankQuestion" (
    "id" TEXT NOT NULL,
    "stemId" TEXT,
    "weight" INTEGER NOT NULL,
    "cefrBand" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "promptEn" TEXT NOT NULL,
    "promptJa" TEXT NOT NULL,
    "optionsEn" JSONB NOT NULL,
    "optionsJa" JSONB NOT NULL,
    "correctIndex" INTEGER NOT NULL,

    CONSTRAINT "PlacementBankQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlacementBankQuestion_cefrBand_section_idx" ON "PlacementBankQuestion"("cefrBand", "section");
