# Private lesson cancellation and rescheduling

Implemented on `the-mirror` through MIRROR_PLAN.md section 6k, 2026-11-03. Section 6i records the owner's final cancellation-policy clarification and supersedes the earlier restriction that kept a late-cancelled lesson confirmed. Section 6j simplifies student notifications. Section 6k repairs financial recovery while retaining that policy and teacher resolution flow.

## Student flow

**Cancel booking** opens a read-only choice screen. Dismissing it changes neither the lesson nor its payment. At least 48 hours before the start, a student may confirm an eligible cancellation/refund or choose a published available replacement time. A direct move retains the original booking, price and payment, and releases the old time when the replacement is saved.

Inside 48 hours, **Cancel and request reschedule** cancels the original lesson **without a refund**, releases the old slot and records a pending replacement request. Both participants are notified. This succeeds even when the teacher has no published replacement times; the original lesson does not remain booked. The request remains accessible under **Schedule → Rescheduling**.

The student may select a published replacement time when one exists. It confirms immediately and restores the same paid booking. Availability uses the saved booking subject, assignments, occurrence skips, publishing window, destination lead time, duration, occupied marketplace slots and school teaching conflicts. The student's existing one-move allowance is retained. A pending request survives its original lesson start time; a permanently closed or refund-claimed request cannot restore a booking. An exhausted student allowance leaves arrangement to the teacher.

Student screens show the late-cancellation no-refund policy and replacement options. They contain no discretionary refund controls, suggestions to ask for an exception, or teacher resolution controls. The server rejects student access to the teacher resolution endpoint.

## Teacher resolution

The owning teacher can use the existing lesson-time form to arrange a new time, issue a discretionary full refund, or permanently close an unresolved request without refunding. Closing the request acts on an already student-cancelled lesson; it does not invoke the normal teacher-cancellation policy that automatically refunds a confirmed lesson. Normal teacher cancellations and group workflows retain their existing rules.

Refund and permanent closure require explicit confirmation. A refund decision and its durable refund obligation commit together before contacting the existing provider, preventing a competing replacement or closure. Automatic and teacher refunds use the same recoverable processor, saved original account and payment intent. Retries read provider state first, preserving request identity and actual receipts; active leases exclude competing workers. Provider errors retain the decision and owed work. Confirmed failed refunds require explicit admin replacement authorization; uncertain old requests stop for reconciliation. Admin resolutions retain their admin actor in the refund audit. See [payment recovery operations](payment-recovery-operations.md) for automatic execution and maintenance.

Only an actual teacher-initiated refund produces student refund notifications/status. Pending and completed refunds remain distinct. Student notices omit amounts; completion asks the student to check their account. Teacher notices retain financial details. The student gains no entitlement or refund request action from the teacher's discretionary option.

## Stored state and shared services

The additive migration `20261102010000_private_lesson_reschedule_workflow` adds nullable private-request status and request/resolution timestamps to Booking, plus indexes. `PENDING` accompanies a cancelled original slot; `RESCHEDULED` records restoration; `CLOSED` ends replacement eligibility; `REFUND_REQUESTED` prevents replacement while a discretionary refund is handled. Historic records stay null and gain no inferred entitlement. The migration is applied locally and the Prisma client is regenerated.

The additive `20261102020000_durable_payment_recovery` migration is also applied locally. It adds saved refund work, webhook processing state and checkout fulfillment claims, plus nullable original-cancellation status. Old amounts, invoices, credit notes and provider receipt identities remain. A payment collected after an unpaid cancellation is queued for return; a delayed duplicate for an already-paid late cancellation does not create refund entitlement. Dashboard partial refunds preserve the booking; full settled refunds cancel it and reconcile its existing Calendar event.

Cancellation preview and confirmation use the same server policy. Confirmation checks its explicit intent: if an offered refund has crossed the cutoff, nothing is cancelled until the student reviews and confirms the no-refund option separately. Optimistic writes guard booking status, original time and request state so stale moves or resolutions fail safely.

The shared cancellation control serves dashboard rows and lesson dialogs. The existing slot picker and teacher date form are reused. Stateful teacher controls and the notification trigger remain disabled until their client handlers are ready, preventing early input or clicks from being lost during hydration. Layouts use the existing Impeccable design primitives and English/Japanese messages.

Calendar/Meet uses the existing connections and services. Late cancellation removes the old events. Restoring a request recreates the meeting through the shared calendar-recovery helper, also used by the existing manual retry endpoint, and restores an opted-in student mirror. Stale recovery cannot overwrite a changed booking. A saved move is distinguished from a partial Calendar update.

Immediate moves send one completed notice per participant. A request notice is now reserved for a real saved late-cancellation request; it describes a replacement needing arrangement, rather than claiming teacher approval is required. Closure has a teacher-only notice; the student can see the resolved request without receiving an extra closure notification. The existing bell refresh/realtime transport and stored-event deduplication are reused. The Rescheduling tab appears after a saved late-cancellation request and retains its resolved records.

## Original lifecycle verification (sections 6i–6j)

TDD red/green evidence is retained in `.impeccable/private-reschedule-red.log`, `private-request-cancel-red.log`, `private-request-resolution-red.log`, `private-request-restore-red.log`, `private-request-ui-red.log`, `private-request-cancel-ui-red.log`, `private-request-refund-intent-red.log`, `private-request-history-red.log`, `private-request-admin-red.log`, `private-request-hydration-red.log` and `private-request-bell-ready-red.log`.

- Safe mirror suite: 762 passed, one skipped and three existing TODOs; no application database seeding.
- The isolated PostgreSQL migration regression passes, preserving historic values with the three new fields null and verifying the datamodel.
- All 24 browser journeys pass, recorded in `private-request-browser-full.log`. Ten lifecycle journeys cover both learning subjects and every student/teacher outcome; fourteen existing journeys cover placement, study, onboarding and completed-lesson records.
- TypeScript, full ESLint and the final production build pass, recorded in `private-request-types.log`, `private-request-lint.log` and `private-request-build.log`.

Browser tests use a disposable PostgreSQL schema and explicit synthetic payments. Teacher refund tests deliberately use missing synthetic provider IDs to exercise recovery without moving real money. Existing settled-refund fixtures invoke the real shared notifier; mocked unit tests separately verify provider/webhook dispatch, retries and idempotency. Live Stripe refunds and live Google Calendar are not exercised. Visual review uses Chromium at 1440px/light/English and 390px/dark/Japanese; physical devices and Safari remain untested.

All five browser runs confirm the 27 application-table fingerprints are unchanged; owned accounts, disposable schemas and connections are removed. Visual review is bounded to one desktop/mobile pass and one confirmation; screenshot caret mutation is disabled so capture does not alter markup during hydration. Task-owned test, preview and build processes have exited, the fixture manifest is removed and port 3100 is released.

## Recovery verification (section 6k)

The [updated Stripe audit](stripe-payment-audit.md#section-6k-verification) records independent red/green evidence, **39 isolated PostgreSQL cases**, **790 passing unit tests**, the foundation migration check and browser/admin coverage. Financial assertions formerly in mock-only tests now exercise real transactions and fault injection. All existing lifecycle journeys remain in the browser release suite, alongside two new English/Japanese admin recovery journeys. Test credentials explicitly prevent live Stripe/Google calls. Final build and cleanup results are recorded in plan section 6k.

## Existing boundaries

Same-booking edits and request resolutions use optimistic conditions. This does not establish a global serializable exclusion across every independent marketplace and school booking writer. Notification deduplication uses existing notification rows; a very late retry can recreate a notice after that row has been dismissed. Permanent notification receipts and a notification outbox remain separate infrastructure work; payment/webhook recovery now has durable work records.

The five section-6j financial recovery findings are fixed in section 6k. Automatic retry requires the supervised worker or authenticated scheduled endpoint described in the [operations handoff](payment-recovery-operations.md); production scheduling has not been configured here. Code-level and synthetic verification does not establish live provider account permissions, balances or delivery.

No historic cancellation is converted into a replacement request, no content is published, and Brandon retains staging, commits and pushes.
