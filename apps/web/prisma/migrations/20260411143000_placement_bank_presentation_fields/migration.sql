-- Placement bank: drop legacy prompt columns; add instruction + question. Re-seed from JSON after migrate.

DROP TABLE IF EXISTS "PlacementBankQuestion";

CREATE TABLE "PlacementBankQuestion" (
    "id" TEXT NOT NULL,
    "stemId" TEXT,
    "weight" INTEGER NOT NULL,
    "cefrBand" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "instructionEn" TEXT NOT NULL,
    "instructionJa" TEXT NOT NULL,
    "questionEn" TEXT NOT NULL,
    "questionJa" TEXT NOT NULL,
    "optionsEn" JSONB NOT NULL,
    "optionsJa" JSONB NOT NULL,
    "correctIndex" INTEGER NOT NULL,

    CONSTRAINT "PlacementBankQuestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlacementBankQuestion_cefrBand_section_idx" ON "PlacementBankQuestion"("cefrBand", "section");
