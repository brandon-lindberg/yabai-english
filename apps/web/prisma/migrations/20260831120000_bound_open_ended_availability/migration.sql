-- Weekly availability now has to carry an end date. Rows created before that
-- rule have none, so they would keep producing bookable occurrences for as long
-- as anything asked for them — which is the exposure the rule exists to close:
-- a teacher who stops opening the app would go on taking bookings forever.
--
-- Bound each one at the end of the publishing window as of this deploy: the
-- current month plus the next two, in the slot's own timezone, stored as that
-- local midnight the way the application writes date-only columns. Extending
-- past it is then a deliberate act by the teacher, like any other slot.
UPDATE "AvailabilitySlot"
SET "endsOn" = (
      (
        date_trunc('month', now() AT TIME ZONE "timezone")
        + interval '3 months'
        - interval '1 day'
      )::date::timestamp AT TIME ZONE "timezone"
    )
WHERE "recurrence" = 'WEEKLY'
  AND "endsOn" IS NULL;
