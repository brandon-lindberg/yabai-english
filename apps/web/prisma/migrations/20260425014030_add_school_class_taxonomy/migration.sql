-- AlterTable
ALTER TABLE "SchoolScheduleSlot" ADD COLUMN     "classLevelId" TEXT,
ADD COLUMN     "classTypeId" TEXT;

-- CreateTable
CREATE TABLE "SchoolClassLevel" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "labelJa" TEXT,
    "labelEn" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolClassLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolClassType" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "labelJa" TEXT,
    "labelEn" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolClassType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchoolClassLevel_schoolId_active_idx" ON "SchoolClassLevel"("schoolId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolClassLevel_schoolId_code_key" ON "SchoolClassLevel"("schoolId", "code");

-- CreateIndex
CREATE INDEX "SchoolClassType_schoolId_active_idx" ON "SchoolClassType"("schoolId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolClassType_schoolId_code_key" ON "SchoolClassType"("schoolId", "code");

-- CreateIndex
CREATE INDEX "SchoolScheduleSlot_classLevelId_idx" ON "SchoolScheduleSlot"("classLevelId");

-- CreateIndex
CREATE INDEX "SchoolScheduleSlot_classTypeId_idx" ON "SchoolScheduleSlot"("classTypeId");

-- AddForeignKey
ALTER TABLE "SchoolScheduleSlot" ADD CONSTRAINT "SchoolScheduleSlot_classLevelId_fkey" FOREIGN KEY ("classLevelId") REFERENCES "SchoolClassLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolScheduleSlot" ADD CONSTRAINT "SchoolScheduleSlot_classTypeId_fkey" FOREIGN KEY ("classTypeId") REFERENCES "SchoolClassType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolClassLevel" ADD CONSTRAINT "SchoolClassLevel_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolClassType" ADD CONSTRAINT "SchoolClassType_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
