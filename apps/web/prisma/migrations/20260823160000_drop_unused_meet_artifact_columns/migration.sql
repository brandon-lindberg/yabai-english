-- Drop the Meet artifact columns on Booking.
--
-- These were added for a post-meeting sync that was never finished: the only
-- code that ever wrote them lived in `POST /api/bookings/[id]/artifacts/sync`,
-- a route with no callers anywhere in the app, backed by a `syncMeetingArtifacts`
-- that returned hardcoded placeholder strings rather than calling Google. Every
-- row therefore holds NULL or the empty-array default.
--
-- The lesson notes link now lives in `externalTranscriptUrl`, resolved from the
-- Calendar event's attachments, which needs none of these.
ALTER TABLE "Booking"
  DROP COLUMN IF EXISTS "notesDocId",
  DROP COLUMN IF EXISTS "transcriptArtifactIds",
  DROP COLUMN IF EXISTS "smartNotesIds",
  DROP COLUMN IF EXISTS "recordingIds";
