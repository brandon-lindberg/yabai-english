-- A refund needs a document of its own. Editing the original invoice would be
-- wrong twice over: an issued invoice is a document the customer already holds,
-- and rewriting it destroys the trail an accountant reconciles against. Japan's
-- qualified-invoice rules say the same — a return of consideration is recorded
-- by a separate 適格返還請求書 that references the original.
ALTER TABLE "Refund"
  ADD COLUMN "creditNoteNo" TEXT;

CREATE UNIQUE INDEX "Refund_creditNoteNo_key" ON "Refund"("creditNoteNo");

-- 適格請求書発行事業者登録番号. Teachers invoice their own students, so the
-- registration number belongs to the teacher, not the platform. Nullable: a
-- teacher who is not a registered issuer has none, and their documents simply
-- omit the line.
ALTER TABLE "TeacherProfile"
  ADD COLUMN "invoiceRegistrationNumber" TEXT;
