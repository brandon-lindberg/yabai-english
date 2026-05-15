ALTER TABLE "TeacherProfile"
ADD COLUMN IF NOT EXISTS "paymentPolicyAcceptedAt" TIMESTAMP(3);
