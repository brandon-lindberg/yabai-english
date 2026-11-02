# Private lesson notifications and student rescheduling

Implemented on `the-mirror`, 2026-11-02. This follows MIRROR_PLAN.md section 6g and the owner's clarification that private-lesson notifications belong in the in-app bell.

## Student flow

Open a future confirmed private lesson from the schedule calendar. **Change lesson time** appears after the server finds at least one bookable alternative with the same teacher. It stays hidden when availability cannot be confirmed, the lesson has started, or the student's one permitted move is already used.

The availability read uses the booking's saved learning language, the existing availability builder, assignments, occurrence skips, publishing window, 48-hour destination lead time and lesson duration. It removes the current start, held marketplace times, materialized school bookings and recurring school classes. An active availability row alone does not qualify. The read is restricted to the owning student and returns slot data without other learners' identities.

The picker reuses `SlotSelectionCalendar`. Its initial day view shows actual available times; a compact month view fits the lesson dialog and opens a date's times. The existing POST endpoint rechecks eligibility and availability before moving the original booking. Price and payment stay attached to it. The destination remains teacher-published availability, so the existing immediate rescheduling policy applies. The one-move rule and group/school workflows retain their existing policies.

Unchanged-time retries return the existing booking. Optimistic conditions on student moves, teacher moves and cancellation reject stale edits with a conflict response. The student route also checks school teaching conflicts. Calendar/Meet updates use the existing integration, and a partial Calendar result is reported separately from a saved booking move.

## Notifications

One shared private-booking notifier delivers English/Japanese messages to the student and teacher for cancellation, reschedule request receipt, successful rescheduling, and refunds. Copy uses the booking's saved subject and each recipient's timezone. Request receipt describes the request reaching the existing move endpoint; it does not introduce a teacher approval step. A successful move sends the separate completion notice.

Cancellation is announced after it is saved. Refund status controls the refund message: only `SUCCEEDED` says the lesson was refunded; pending/recovery states say the refund has not completed. A later successful Stripe refund update sends completion to both participants. Existing refund amounts, eligibility and payment integration are reused.

Stable per-recipient notification IDs suppress repeated delivery of the same stored event, including repeated settled-refund webhooks. A later repeat of an earlier move is distinguished by the booking revision. The existing bell receives realtime updates and fetches current persisted notifications when opened, covering a missed socket update.

## Verification

TDD red/green evidence is recorded in `.impeccable/booking-notifications-red.log`, `reschedule-availability-red.log`, `booking-lifecycle-routes-red.log`, `refund-notifications-red.log`, `refund-retry-red.log` and `reschedule-compact-red.log`.

- `yarn test:mirror`: 723 passed, one skipped, three existing TODOs; safe config has no database seeding.
- TypeScript, full ESLint, whitespace check and isolated production build pass.
- Full browser runs before and after the layout correction pass all 16 English/Japanese journeys; final layout confirmation is recorded in `.impeccable/booking-lifecycle-browser-final.log`.
- New paired journeys remove/restore teacher availability, verify the hidden action and server rejection, move through the actual picker, preserve booking/payment identity, enforce the used-move limit, and inspect both users' persisted alerts and notification bells through cancellation, pending refund and refund completion.

Browser verification uses a disposable PostgreSQL schema and explicit synthetic payments. The settlement fixture invokes the shared notifier twice to check persisted deduplication; mocked unit tests separately verify the actual Stripe webhook dispatch and retry path. These checks do not exercise a live Stripe charge/refund or live Google Calendar. Visual evidence uses Chromium at 1440px/light/English and 390px/dark/Japanese, rather than physical phones or Safari.

Both full browser runs preserve all 27 application-table fingerprints. Owned test accounts, fixture manifests, schemas and connections were removed. Recorded browser/fixture processes and final test/build sessions have exited; port 3100 is released. Impeccable review used one desktop/mobile pass and one compact-picker correction/confirmation round.

## Audit boundaries

The optimistic booking conditions protect concurrent edits to the same reservation. The wider pre-existing booking system checks overlaps before writing; this work does not establish serializable exclusion across every independent booking/create/school path. A cross-path concurrency guarantee would require coordinated booking writes.

Notification deduplication uses existing notification rows. Dismissing a row removes its deduplication record; an unusually late provider retry could recreate a dismissed notice. This is not a permanent event-receipt ledger or background outbox. Provider failures and asynchronous recovery continue to use the existing payment/calendar infrastructure.

No schema migration or content publication is required. Brandon retains staging, commits and pushes.
