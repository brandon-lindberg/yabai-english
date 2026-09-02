-- A skip with no slotId cancelled every rule starting at that instant, so it
-- also swallowed the one-off written to replace an edited occurrence: the
-- availability simply vanished. Attribute the legacy rows to the rules that
-- produced them, then make naming the rule mandatory.
--
-- Only WEEKLY rules are candidates. These rows predate single-occurrence
-- editing, so they were always made against a repeating rule — never against a
-- one-off, and least of all against the replacement one-off they are hiding.
--
-- One legacy row can become several: it meant "every rule at this instant", so
-- each matching rule keeps its own cancellation rather than one winning a tie.
--
-- The match reads the instant in the rule's own zone (AT TIME ZONE carries the
-- DST offset for that date) and requires weekday, start minute, and the rule's
-- own date bounds to agree.
INSERT INTO "AvailabilityOccurrenceSkip" (id, "teacherProfileId", "slotId", "startsAtIso", "createdAt")
SELECT md5(random()::text || clock_timestamp()::text || a.id),
       s."teacherProfileId",
       a.id,
       s."startsAtIso",
       s."createdAt"
  FROM "AvailabilityOccurrenceSkip" s
  JOIN "AvailabilitySlot" a
    ON a."teacherId" = s."teacherProfileId"
   AND a.recurrence = 'WEEKLY'
 CROSS JOIN LATERAL (
    SELECT s."startsAtIso"::timestamptz AT TIME ZONE a.timezone AS local_start
 ) t
 WHERE s."slotId" IS NULL
   AND EXTRACT(DOW FROM t.local_start) = a."dayOfWeek"
   AND EXTRACT(HOUR FROM t.local_start) * 60 + EXTRACT(MINUTE FROM t.local_start) = a."startMin"
   AND (a."startsOn" IS NULL OR date_trunc('day', t.local_start) >= date_trunc('day', a."startsOn"))
   AND (a."endsOn"   IS NULL OR date_trunc('day', t.local_start) <= date_trunc('day', a."endsOn"))
ON CONFLICT ("teacherProfileId", "slotId", "startsAtIso") DO NOTHING;

-- What is left cancels no repeating rule that still exists. Keeping it would
-- let it spring back to life against an unrelated slot created there later.
DELETE FROM "AvailabilityOccurrenceSkip" WHERE "slotId" IS NULL;

ALTER TABLE "AvailabilityOccurrenceSkip" ALTER COLUMN "slotId" SET NOT NULL;
