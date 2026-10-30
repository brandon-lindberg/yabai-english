-- Add history before any draft refresh. Existing content/provenance/progress is unchanged.
ALTER TABLE "StudyCatalogSnapshot" ADD COLUMN "previousSnapshotId" TEXT,
  ADD CONSTRAINT "StudyCatalogSnapshot_previousSnapshotId_fkey" FOREIGN KEY ("previousSnapshotId")
    REFERENCES "StudyCatalogSnapshot"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT "StudyCatalogSnapshot_previous_check" CHECK ("previousSnapshotId" IS NULL OR "previousSnapshotId" <> "id");

CREATE TABLE "StudyCatalogCardSnapshot" (
  "snapshotId" TEXT NOT NULL,
  "cardId" TEXT NOT NULL,
  "cardJson" JSONB NOT NULL,
  CONSTRAINT "StudyCatalogCardSnapshot_pkey" PRIMARY KEY ("snapshotId", "cardId"),
  CONSTRAINT "StudyCatalogCardSnapshot_snapshotId_fkey" FOREIGN KEY ("snapshotId")
    REFERENCES "StudyCatalogSnapshot"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "StudyCatalogCardSnapshot_content_check" CHECK (
    jsonb_typeof("cardJson") = 'object' AND ("cardJson"->>'id' = "cardId") IS TRUE
  )
);

CREATE FUNCTION "protectStudyCatalogHistory"() RETURNS trigger
LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
  RAISE EXCEPTION 'Study catalog history is immutable';
END;
$$;
CREATE TRIGGER "StudyCatalogSnapshot_immutable" BEFORE UPDATE OR DELETE ON "StudyCatalogSnapshot"
FOR EACH ROW EXECUTE FUNCTION "protectStudyCatalogHistory"();
CREATE TRIGGER "StudyCatalogCardSnapshot_immutable" BEFORE UPDATE OR DELETE ON "StudyCatalogCardSnapshot"
FOR EACH ROW EXECUTE FUNCTION "protectStudyCatalogHistory"();
