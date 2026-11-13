-- Derive only prompt-time reference fields. Full provenance, content identities,
-- publication state and learner history are unchanged.
BEGIN;

CREATE TABLE "StudyCatalogReference" (
  "snapshotId" TEXT NOT NULL,
  "sourceRow" TEXT NOT NULL,
  "referenceJson" JSONB NOT NULL,
  CONSTRAINT "StudyCatalogReference_pkey" PRIMARY KEY ("snapshotId", "sourceRow"),
  CONSTRAINT "StudyCatalogReference_snapshotId_fkey" FOREIGN KEY ("snapshotId")
    REFERENCES "StudyCatalogSnapshot"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "StudyCatalogReference_identity_check" CHECK (
    jsonb_typeof("referenceJson") = 'object' AND ("referenceJson"->>'sourceRow' = "sourceRow") IS TRUE
  )
);

-- One projection for both historical backfill and future snapshot inserts.
CREATE FUNCTION "projectStudyCatalogReferences"(provenance JSONB)
RETURNS TABLE ("sourceRow" TEXT, "referenceJson" JSONB)
LANGUAGE SQL IMMUTABLE SET search_path FROM CURRENT AS $$
  SELECT value->>'sourceRow', jsonb_build_object(
    'sourceRow', value->'sourceRow', 'sourceFileId', value->'sourceFileId',
    'level', value->'level', 'status', value->'status',
    'kana', value->'kana', 'kanji', value->'kanji',
    'candidateCardIds', value->'candidateCardIds'
  )
  FROM jsonb_array_elements(COALESCE(provenance #> '{source,reconciliation}', '[]'::jsonb)) AS reference(value);
$$;

INSERT INTO "StudyCatalogReference" ("snapshotId", "sourceRow", "referenceJson")
SELECT snapshot.id, reference."sourceRow", reference."referenceJson"
FROM "StudyCatalogSnapshot" AS snapshot
CROSS JOIN LATERAL "projectStudyCatalogReferences"(snapshot."provenanceJson") AS reference;

CREATE FUNCTION "retainStudyCatalogReferences"() RETURNS trigger
LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
  INSERT INTO "StudyCatalogReference" ("snapshotId", "sourceRow", "referenceJson")
  SELECT NEW.id, reference."sourceRow", reference."referenceJson"
  FROM "projectStudyCatalogReferences"(NEW."provenanceJson") AS reference;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "StudyCatalogSnapshot_references" AFTER INSERT ON "StudyCatalogSnapshot"
FOR EACH ROW EXECUTE FUNCTION "retainStudyCatalogReferences"();
CREATE TRIGGER "StudyCatalogReference_immutable" BEFORE UPDATE OR DELETE ON "StudyCatalogReference"
FOR EACH ROW EXECUTE FUNCTION "protectStudyCatalogHistory"();

COMMIT;
