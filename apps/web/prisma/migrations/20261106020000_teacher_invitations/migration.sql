CREATE TABLE "TeacherInvitation" (
    "id" TEXT NOT NULL,
    "tokenHash" VARCHAR(43) NOT NULL,
    "label" VARCHAR(80),
    "teachingLanguages" "LearningLanguage"[],
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "redeemedAt" TIMESTAMP(3),
    "redeemedById" TEXT,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "TeacherInvitation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TeacherInvitation_teachingLanguages_check" CHECK (
        "teachingLanguages" IS NOT NULL AND array_position("teachingLanguages", NULL) IS NULL
        AND cardinality("teachingLanguages") BETWEEN 1 AND 2
        AND (cardinality("teachingLanguages") = 1 OR "teachingLanguages"[1] <> "teachingLanguages"[2])
    )
);

CREATE UNIQUE INDEX "TeacherInvitation_tokenHash_key" ON "TeacherInvitation"("tokenHash");
CREATE INDEX "TeacherInvitation_expiresAt_idx" ON "TeacherInvitation"("expiresAt");
