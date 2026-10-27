-- Add a runtime policy over the existing, immutable schema-v5 question bank.
-- Existing snapshots, responses, active policy pairs and saved results are untouched.
ALTER TABLE "JapanesePlacementAttempt"
  DROP CONSTRAINT "JapanesePlacementAttempt_timing_check",
  ADD CONSTRAINT "JapanesePlacementAttempt_timing_check" CHECK (
    ("schemaVersion" < 3 AND "expiresAt" IS NULL AND "policyRevision" IS NULL AND "questionLimit" IS NULL) OR
    ("schemaVersion" IN (3, 4, 5) AND "expiresAt" IS NOT NULL AND "policyRevision" IS NOT NULL AND "questionLimit" IS NOT NULL
      AND "expiresAt" = "startedAt" + INTERVAL '20 minutes' AND "questionLimit" BETWEEN 6 AND 60
      AND (("schemaVersion" = 3 AND "policyRevision" = 'japanese-posterior-v1') OR
        ("schemaVersion" = 4 AND "policyRevision" = 'japanese-posterior-passages-v2'
          AND "scoringRevision" = 'japanese-reading-writing-passages-v2') OR
        ("schemaVersion" = 5 AND "policyRevision" = 'japanese-jlpt-rubric-v1'
          AND "scoringRevision" = 'japanese-reading-writing-rubric-v1') OR
        ("schemaVersion" = 5 AND "policyRevision" = 'japanese-jlpt-staircase-v2'
          AND "scoringRevision" = 'japanese-reading-writing-staircase-v2' AND "questionLimit" = 24)))
  );
