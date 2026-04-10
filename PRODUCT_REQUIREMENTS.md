# English Studio Product Requirements (v1)

This document is the implementation source of truth for v1 product behavior.

## Scope

- Covers student lifecycle, teacher lifecycle, booking/payment policies, communications, compliance, and admin governance.

## Engineering Delivery Standards (Mandatory)

These standards apply to every feature and bug fix in v1.

### 1) DRY and Reuse Rules

- Do not duplicate business logic across routes/pages/components.
- Shared domain rules (booking windows, refund eligibility, no-show behavior, trial eligibility, role checks) must live in reusable service modules.
- Shared UI patterns must be componentized (consistent with style guide and component-first page composition).
- Shared request/response validation must use centralized schema definitions.
- If the same logic appears more than once, refactor to a shared function/module before merging.

### 2) Tests-First Development (TDD Required)

- Write tests first for each behavior before implementation code.
- Follow strict Red -> Green -> Refactor loop:
  1. Red: add failing tests that define expected behavior.
  2. Green: implement minimal code to pass tests.
  3. Refactor: improve design without changing behavior; keep tests passing.
- Do not write or modify production logic without corresponding tests created first in the same task.
- Do not "fix" tests after implementation unless requirement changed and is documented.

### 3) Test Levels and Coverage Expectations

- Unit tests for pure domain logic:
  - policy windows (48h/24h), trial entitlement, retake eligibility, timezone conversion helpers
- Integration tests for API + database behavior:
  - booking concurrency, payment transitions, cancellation/refund outcomes, permission gates
- End-to-end tests for critical user journeys:
  - onboarding -> booking -> payment -> dashboard
  - teacher lesson completion + notes
  - admin moderation/intervention
- Regression tests are required for every production bug fix.

### 4) Definition of Done (Quality Gate)

A task is not complete unless all are true:

- Tests were authored first and captured expected behavior.
- New/changed logic has adequate unit/integration coverage.
- Critical path E2E remains passing.
- No duplicated business logic introduced.
- Lint/type/build are passing.
- Requirements and policy text are reflected in tests (not only code comments).

## Roles

- `STUDENT`: Learns, books, pays, attends lessons, receives feedback.
- `TEACHER`: Delivers lessons, maintains availability, writes notes, moderates student communication access.
- `ADMIN`: Full platform control and moderation.

## Admin Governance (Hard Rules)

- Only admins can create teacher accounts.
- Only admins can assign or change user roles.
- Admins can edit any information for any user at any time.
- Admins can hide/remove inappropriate content urgently.
- Teachers may update their own profile and availability, but admin override is always allowed.

## Authentication and Legal

- Authentication is Google sign-in only.
- On first login, student must accept:
  - Terms of Service
  - Privacy Policy
  - Lesson recording consent
- User timezone must be captured at onboarding (default from browser, user-editable).

## Student Flow (Primary Journey)

1. Student signs in with Google.
2. Student enters onboarding.
3. Student chooses one:
   - Take placement test now
   - Skip placement and go to teacher selection
4. If placement is chosen:
   - Student takes test
   - Progress is saved (resume supported)
   - Result and placement level are shown
5. Student browses teachers.
6. Student opens teacher profile and reviews:
   - Photo
   - Description
   - Country of origin
   - Credentials
   - Availability
   - Button to schedule lesson
7. Student selects a slot from teacher availability calendar.
8. Student adds lesson to personal calendar system (native calendar support/reminders).
9. Student pays (trial lesson skips payment).
10. Booking confirmation shown.
11. Student returns to dashboard with:
    - Placement info
    - Scheduled lessons
    - Calendar with lessons
    - Profile section (avatar, description, visibility settings)
    - Notification center
    - Chat/report access based on permissions
12. On lesson day, student joins from dashboard lesson entry to Google Meet link.
13. Lesson ends and is marked complete.
14. Teacher adds notes; student can schedule next lesson.

## Onboarding Requirements

- Collect learning goal(s): conversation, business, exam, kids.
- Capture notification defaults:
  - Lesson reminders
  - Message notifications
  - Payment notifications
- Placement can be skipped and taken later from dashboard.

## Placement Requirements

- Save-in-progress support.
- Retake policy:
  - One retake allowed
  - Cool-down window
  - Admin reset available
- Level disagreement path:
  - Retake request and/or message admin/teacher (v2 expansion allowed).

## Teacher Discovery and Selection

- Discovery filters include:
  - Timezone overlap
  - Specialty
  - Language of instruction (JP/EN)
  - Price (always JPY display)
  - Reviews (if enabled)
- Teachers define availability. Student booking UI focuses on available slots.

## Timezone Behavior (Critical)

- All schedules and lesson times must render in the viewing user's timezone.
- Teacher-defined availability must be converted safely for student display.
- Booking confirmation and reminders must include timezone-aware timestamps.

## Booking, Concurrency, and Calendar

- Concurrency handling required for slot race conditions.
- If a slot is taken during checkout/booking, show explicit message:
  - "That slot was just booked by another student."
- Native calendar support required:
  - Student can add lesson to calendar and receive reminders in their calendar app.

## Trial and Payments

- Every user receives one trial lesson.
- Trial lesson checkout skips payment.
- Standard lessons require payment.
- Must support:
  - Failed payment retry
  - Expired checkout handling
  - Invoice/receipt generation for users and platform accounting/tax

## Cancellation, Reschedule, Refund Policies

- Student cancellation policy:
  - At least 48 hours before lesson: cancellation + refund
  - Under 48 hours: cancellation allowed, no refund, reschedule allowed
- Teacher cancellation policy:
  - Student can choose refund or reschedule
  - If cancellation occurs within 24 hours: refund + one free lesson

## No-Show Policy

- No-shows are marked as completed.
- Student can request reschedule after no-show.
- Approval is teacher-controlled.
- Request UI must clearly state teacher discretion.

## Dashboard and Communications

- Dashboard must provide:
  - Placement summary
  - Upcoming/past lessons
  - Lesson calendar
  - Profile editing (avatar, short description)
  - Notification center (durable inbox, not only toasts)
  - Chat/report tools with permission gates

### Chat Permissions

- Student is read-only by default.
- Student cannot contact teacher until a scheduled lesson exists.
- Two-way communication is enabled/controlled by teacher/admin.
- Admin retains moderation and override authority.

### Reporting

- Student can file a report from dashboard.
- Report is routed through admin/teacher-controlled communication workflow.

## Compliance and Data Rights

- Settings must include:
  - Export personal data as CSV
  - Request deletion of personal data
- Data handling must account for:
  - PII
  - Chat history
  - Placement data
- Include minor/guardian compliance path if applicable.

## Non-Functional and UX Requirements

- Clear policy copy at decision points (payment, cancellation, no-show, reschedule).
- Consistent currency display in JPY.
- Error states must be explicit and actionable.
- Moderation actions must be reversible/auditable by admin tools where possible.

## Teacher Flow (Primary Journey)

1. Admin creates teacher account and grants `TEACHER` role.
2. Teacher signs in with Google.
3. Teacher completes profile fields:
   - Photo
   - Bio/description
   - Country of origin
   - Credentials
   - Instruction languages (JP/EN)
   - Specialties (conversation, business, exam, kids)
   - Lesson price (JPY)
4. Teacher sets availability in teacher timezone.
5. Availability is converted and shown in student timezone at booking time.
6. Student books and pays (or trial skip payment).
7. Teacher receives booking notification and sees lesson on dashboard calendar.
8. Teacher manages upcoming lessons:
   - Confirm attendance
   - Access join link / Google Meet
   - Message student if two-way chat is enabled
9. Lesson starts via scheduled session link.
10. Lesson ends and status is marked complete.
11. Teacher submits lesson notes and optional homework/follow-up guidance.
12. Teacher can suggest or approve next lesson scheduling.

## Teacher Dashboard Requirements

- Dashboard must include:
  - Upcoming and past lessons
  - Calendar view
  - Student profile visibility (display name + student-shared info only)
  - Booking status and payment status indicators
  - Lesson history and notes history
  - Notifications center
- Teacher can update own profile and availability.
- Admin can override/edit teacher information at any time.

## Teacher Availability Rules

- Availability is teacher-managed and must support recurring and one-off slots.
- Platform must prevent double-booking for same teacher slot.
- Slot locking/concurrency must work during high contention.
- If slot is taken before payment completion, show explicit error and force reselection.
- Teacher-defined blackout/unavailable periods must be supported.

## Teacher Cancellation and Reschedule Rules

- Teacher can cancel a lesson, but policy outcomes are enforced by platform:
  - Student chooses refund or reschedule.
  - If cancellation is within 24 hours: refund + one free lesson for student.
- Teacher can approve or deny no-show reschedule requests.
- Teacher decision must be communicated clearly to student via notification/chat.

## Lesson Completion, Notes, and Feedback

- Teacher marks lesson completion (or system auto-completes based on policy where applicable).
- Teacher notes are attached to lesson record and visible to student/admin per permissions.
- Student feedback (rating/comment) is captured post-lesson and associated with teacher and lesson.
- Admin can review/edit/remove inappropriate feedback content.

## Teacher Communication Permissions

- By default, student cannot initiate unrestricted teacher chat.
- Two-way student-teacher communication is controlled by teacher/admin.
- Teacher can reply when thread is enabled.
- Admin can always view/moderate communication threads.

## Admin Operations (Teacher Related)

- Admin-only teacher creation and role assignment.
- Admin can:
  - Suspend/reactivate teacher accounts
  - Edit teacher bios/credentials/pricing/availability
  - Remove or correct inappropriate/inaccurate content
  - Intervene in disputes and reports
  - Access audit history where available

## Open Items for Next Pass

- Exact retake cool-down duration.
- Exact notification delivery channels and schedule defaults.
- Calendar integration implementation choice(s) and fallback behavior.

## Testing Blueprint (Repo Standard)

This is the required structure and naming for tests-first delivery.

### Directory Layout

- `apps/web/src/**/__tests__/*.test.ts`:
  - Unit tests colocated with domain modules/components.
- `apps/web/src/app/api/**/__tests__/*.test.ts`:
  - API route integration tests.
- `apps/web/tests/integration/**/*.test.ts`:
  - Cross-module integration tests (DB + service boundaries).
- `apps/web/tests/e2e/**/*.spec.ts`:
  - End-to-end journeys (Playwright).
- `apps/web/tests/fixtures/**`:
  - Shared test factories/fixtures.

### Naming Convention

- Unit: `<module-name>.test.ts`
- Integration: `<feature-name>.integration.test.ts`
- API route: `<route-name>.route.test.ts`
- E2E: `<journey-name>.e2e.spec.ts`

Examples:
- `booking-policy.test.ts`
- `bookings.route.test.ts`
- `booking-concurrency.integration.test.ts`
- `student-onboarding-to-booking.e2e.spec.ts`

### Required Test-First Checklist per Feature

1. Create test file(s) before implementation.
2. Write failing scenarios for:
   - Happy path
   - Policy boundaries
   - Permission failures
   - Error/retry behavior
3. Commit tests and implementation in same PR with evidence tests were red first.
4. Add regression test for each bug addressed.

### Policy-Critical Test Matrix (Must Exist)

- Booking conflict:
  - Two users attempt same slot; one succeeds; one receives explicit conflict message.
- Cancellation windows:
  - `>=48h` student cancellation => refund true
  - `<48h` student cancellation => refund false, reschedule allowed
- Teacher late cancellation:
  - `<24h` teacher cancellation => refund + free lesson entitlement
- Trial entitlement:
  - First trial allowed, second trial denied
- No-show:
  - Marked complete; reschedule request path enforces teacher approval
- Timezone:
  - Teacher availability conversion to student timezone (including DST edge date)
- Chat permissions:
  - Student read-only default
  - Two-way only after scheduled lesson and enablement by teacher/admin
- Admin authority:
  - Only admin can create teacher role users
  - Admin can edit any user record

### CI Quality Gates (Required)

- `yarn lint`
- `yarn typecheck` (or equivalent typed build gate)
- Unit + integration suites pass
- E2E critical smoke suite pass on protected branches
- PR blocked if:
  - New business logic has no tests
  - Coverage decreases on policy-critical modules without explicit approval

### Test Data and Isolation Rules

- Each test must be independent and idempotent.
- Use fixtures/factories for user/teacher/booking/payment setup.
- Do not depend on clock-local machine time; freeze/mock time in policy tests.
- Prefer deterministic timezone fixtures (`Asia/Tokyo`, `UTC`, one DST-observing timezone).

## Implementation Build Order (Recommended)

This order minimizes rework by locking data contracts first, then behavior, then UI.

### Phase 1: Data Model and Policies (Database)

1. Add/confirm core entities and enums:
   - User role/governance (`STUDENT`, `TEACHER`, `ADMIN`)
   - Teacher profile (country, credentials, specialties, languages, JPY price)
   - Availability slots + blackout periods
   - Placement attempts, saved progress, retake counters, cool-down metadata
   - Booking and booking status lifecycle
   - Payment transaction and invoice records
   - Cancellation/refund/reschedule records and reason codes
   - Lesson notes, feedback, notification, chat thread/message, report records
2. Add policy fields:
   - Trial lesson consumption flag/timestamp
   - Timezone per user
   - Recording consent + legal acceptance timestamps/versioning
   - Chat permission flags (read-only vs two-way enabled)
3. Add indexes/constraints:
   - Unique constraints for anti-double-booking slot safety
   - Fast lookup indexes for upcoming lessons, notifications, and teacher discovery

### Phase 2: Core Backend APIs and Rules

1. Authentication + authorization:
   - Google-only sign-in
   - Role guards (admin-only teacher creation and role changes)
2. Onboarding APIs:
   - Learning goals
   - Notification preferences
   - Timezone capture/update
3. Placement APIs:
   - Save draft/resume
   - Submit and compute level
   - Retake eligibility + cool-down checks
   - Admin reset endpoint
4. Teacher discovery APIs:
   - Filter by timezone overlap, specialty, language, price (JPY)
5. Booking APIs:
   - Slot reservation/lock + conflict handling
   - Clear "slot already taken" response contract
6. Payment/invoice APIs:
   - Trial skip-payment path
   - Paid checkout path + retry/expiry handling
   - Invoice/receipt generation and retrieval
7. Cancellation/refund/reschedule APIs:
   - Enforce 48-hour and 24-hour policy windows
   - Teacher cancellation compensation logic (refund + free lesson within 24h)
8. Messaging/notifications/reporting APIs:
   - Notification inbox endpoints
   - Chat permissions enforcement
   - Report filing and admin handling
9. Compliance APIs:
   - CSV export request and generation
   - Data deletion request workflow

### Phase 3: Timezone and Calendar Integration

1. Standardize server-side time handling in UTC.
2. Normalize all API responses with explicit timezone-aware timestamps.
3. Implement calendar event generation:
   - "Add to calendar" links and/or ICS files
   - Reminder metadata for native calendar use
4. Validate teacher-to-student timezone conversion across DST boundaries.

### Phase 4: Student UI Delivery

1. Google sign-in + legal consent gate.
2. Onboarding flow pages (goals, notifications, placement choice).
3. Placement UI:
   - Resume draft
   - Results and retake state
4. Teacher browse/profile pages with filters and availability.
5. Booking + checkout + conflict message states.
6. Dashboard:
   - Placement summary
   - Lesson list/calendar
   - Profile settings
   - Notification center
   - Chat/report controls
7. Post-lesson UX:
   - Completion state
   - Notes visibility
   - Feedback capture

### Phase 5: Teacher UI Delivery

1. Teacher dashboard and calendar.
2. Profile + availability management screens.
3. Upcoming lesson workflow and join actions.
4. Lesson completion + notes submission.
5. No-show reschedule request decision UI.
6. Chat thread participation controls.

### Phase 6: Admin UI and Moderation

1. Admin teacher creation and role management panel.
2. Global user edit tooling.
3. Content moderation tooling (profiles, feedback, chat, reports).
4. Dispute handling and audit views.
5. Suspension/reactivation controls.

### Phase 7: Notifications, Reliability, and QA

1. Add scheduled jobs:
   - Reminder dispatch
   - Checkout expiry cleanup
   - Policy enforcement tasks
2. Add observability:
   - Booking conflict metrics
   - Payment failure metrics
   - Notification deliverability metrics
3. QA checklist:
   - Cross-timezone booking scenarios
   - DST transitions
   - Refund policy boundaries (exact 48h/24h edge cases)
   - Trial lesson one-time enforcement
   - Chat permission gating
