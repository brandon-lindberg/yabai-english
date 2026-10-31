# Shared services regression verification

Section **6c**, `the-mirror`, 2026-10-30. This is verification and correction of the existing app's shared behavior. Google sign-in, Google connections, Stripe checkout/payouts and Calendar/Meet already exist; the Japanese path does not require separate integrations, credentials, connected accounts or provider configuration. The earlier plan's “integration verification” meant regression checks, not building those integrations again.

**Subsequent follow-up:** [Section 6d](english-placement-persistence.md) resolves the English attempt persistence/finalization limitations mentioned in this section's historical handoff.

## Reuse confirmed

| Existing service | Scope retained | Local evidence |
| --- | --- | --- |
| Google sign-in | One Google provider and the existing database-session strategy | Both lesson subjects use the same provider; the persisted account remains authoritative independently of interface locale. |
| Google Calendar/Drive/Meet connection | The existing app client, scopes, callback and per-user connection | Both subjects generate the same connection request for the same user ID. No language-specific client or scope is added. |
| Teacher Stripe account | Existing `(teacherId, provider)` account | Both subjects reuse an existing account without creating another. |
| Checkout | Existing direct-charge session, quoted amount, platform fee and booking/payment identifiers | Paired cases verify the existing checkout arguments and ownership even after a learner changes their current subject. |
| Paid confirmation/webhooks | Existing payment matching, confirmation, invoice and notification functions | Existing paid/unpaid, duplicate-event and confirmation regressions are now included in the safe mirror suite. |
| Calendar/Meet | Existing teacher event and optional student mirror | Paired cases use one teacher Meet event; the student's mirror explicitly requests no second Meet link. The existing Google client receives the expected event payload. |
| Rescheduling and join | Existing event IDs, authorization, times and stored Meet URL | Rescheduling moves the same teacher/student events without relabeling the booking subject; existing join-control tests run in the expanded suite. |

Provider responses and persistence are mocked in these unit/handler tests. The browser suite uses the established disposable-schema environment with external providers disabled. No real Google consent, token exchange, payment, refund, calendar invitation or meeting join was performed. This does not imply the owner's already-configured services need setup again, and no extra setup gate has been introduced.

## Concrete defect corrected

Some callers still displayed the shared commercial catalog's raw `Conversation (Eikawa) / 英会話` names for a Japanese booking. The UI already had the correct `lessonProductNames` policy, so this change uses that implementation throughout the affected payment/calendar paths.

The stored **booking subject** now selects the label for checkout, immediate and paid-confirmation calendar events, calendar retry, ICS downloads, teacher CSV exports, student CSV/PDF invoices, credit-note PDF inputs and teacher rescheduling notices. Changing the student's current preference does not rename an earlier booking. English and legacy bookings retain their existing catalog names.

`withBookingLessonProductNames` adds a small immutable read projection around the same policy. Both dashboard loaders use it once, supplying consistent names to existing lesson rows, schedule markers, availability, completed/refunded history and manual Google Calendar links. The teacher lesson-detail page uses the same projection. It preserves product/booking identities, amounts, dates, Meet links and other metadata; it does not mutate the shared catalog or persist projected names.

No service client, OAuth production configuration, scope list, payment algorithm, fee policy, refund algorithm, callback URL or provider-account schema is changed. Existing external calendar/session titles are not bulk rewritten. The existing brand, commercial tier codes and shared product IDs remain.

## TDD and validation

Two initial red batches produce **fourteen failing cases**: the missing immutable projection and incorrect Japanese labels in real handler/read-model outputs. Their **sixty passing controls** include English preservation and existing authorization/payment/calendar behavior. Implementation then makes those cases green. Thirty new subject/projection/provider cases are added overall; tests for already-correct reuse behavior pass without production provider changes.

The safe `test:mirror` configuration expands its existing no-global-setup suite to cover the relevant payment, webhook, Google, invoice, join and historical-dashboard tests. It now runs **595 passing checks**, with the existing one skip and three todo cases unchanged. This comprises the earlier 382 checks, 183 previously separate checks and thirty new cases. It does not load `.env` credentials or seed the application database.

After the separately authorized callback fix below, the final safe mirror run passes **616 checks** (the 595 above, nineteen new security cases and two previously separate teacher-calendar checks). The existing one skip and three todos remain. TypeScript, full ESLint, whitespace and the final production build pass (149 generated pages; 28.82s). Assessment/study/content-only suites are unchanged and were not repeated in this increment. Their latest broad verification remains in [section 6b](mirror-placement-study-verification.md). Remote CI has not been run; its existing mirror command automatically gains the expanded selection.

Reproduce with `yarn test:mirror`, `yarn typecheck`, `yarn lint` and `yarn build`. Browser evidence uses `yarn test:mirror:e2e --capture` with the established disposable-schema runner. Do not substitute the default unit command, whose global setup seeds a database.

The eleven browser scenarios now additionally verify actual subject-correct ICS downloads and the teacher lesson-detail names. The first run passes nine scenarios; both added detail assertions stop because their generic h1 selector also matches the parent Schedule heading. The lesson titles are already correct. The test is narrowed to the exact lesson heading without changing markup or increasing timeouts.

The final browser run passes **all eleven scenarios**, including subject-correct calendar downloads, teacher lesson detail, mixed historical subjects, onboarding, bookings, placement and study. Its provider-disabled environment verifies local app behavior. Together with the final unit/handler run, this is **627 passing checks**. The browser run precedes the focused server-only callback extension; the nineteen callback cases exercise real connect/callback handlers and Auth.js encryption with provider/persistence mocks. They do not exchange real tokens.

The bounded Impeccable review inspects the existing desktop/mobile lesson detail, teacher notes, mixed-subject student history and Japanese dark-theme dashboard. Correct names wrap within their existing layouts at 390, 1280 and 1440 pixels; all five sampled captures report no horizontal overflow and a visible 2px focus outline. No CSS, typography or layout redesign is needed for this label correction. The preview's development-tools overlay is not product UI; this check does not claim an independent design review, full accessibility certification or a new PDF-template visual review.

Ignored local evidence lives under `.impeccable/review/release/`: `section-6c-reviewed.log`, `services-contact-1.jpg`, `services-contact-2.jpg` and `protected-mirror_test_f240539646aa4c83b6764d55fb0f0512.json`. The protection report matches full-row fingerprints for **all 22 application tables**. Disposable schema/connections and owned fixture accounts are removed, the fixture manifest is absent, recorded preview/test processes have exited and port 3100 is released. No application migration or content publication occurs.

## Authorized Google connection security fix

The custom Google **connection** callback has a state-ownership gap, distinct from Auth.js's Google sign-in provider:

- `src/lib/google/integration.ts` encodes the connection state as unsigned base64 containing a user ID and return path.
- `src/app/api/integrations/google/callback/route.ts` requires a signed-in session, then passes the supplied state to `handleGoogleCallback` without matching its user ID to that session.
- `src/lib/google/oauth-service.ts` selects and updates the connection/settings using the state-supplied user ID.

The owner explicitly authorized including the focused fix in this increment. The unsigned parser is removed. `google/connect-state.ts` issues a random 32-byte state and protects the initiating user, return path and state with the installed Auth.js encryption helper, using the existing `AUTH_SECRET` or legacy `NEXTAUTH_SECRET`. No dependency, secret or provider setup is added. Missing session secrets fail closed.

The encrypted cookie lasts ten minutes, is HttpOnly and SameSite=Lax, and uses Secure with the host-only `__Host-` prefix in production/HTTPS. The callback validates cookie integrity, exact state, expiry and the current signed-in user **before token exchange or any account/settings lookup/write**. Persistence receives the authenticated user ID explicitly. Every callback exit clears the pending cookie and sends no-store/no-referrer headers, including denied consent, expired login, invalid state and provider failure. Valid return paths keep onboarding context through the existing redirect helper.

The old teacher-calendar entry points retain their teacher-only guard and delegate to these same canonical handlers. They cannot bypass state validation. Successful legacy callbacks now land in the shared Google settings flow. Existing connected accounts and refresh tokens are reused. A callback from a consent flow started before this change must be restarted; existing completed connections are unaffected. Starting a second connection in the same browser replaces its pending state.

TDD first reproduces **fifteen failing security/lifecycle cases**, then another **four failing legacy-route cases** while the fifteen new controls pass. All nineteen are green after the shared implementation. Coverage includes valid English/Japanese connections, an attempted cross-account legacy payload, absent/mismatched/tampered cookies, wrong state/browser/user, expiry, consent denial, expired login, provider errors, cookie properties and both existing secret names. Real credentials, Google accounts and application rows are not used. This is a focused ownership/CSRF correction, not a claim of a comprehensive OAuth security audit.

The design follows [Google's web-server state validation guidance](https://developers.google.com/identity/protocols/oauth2/web-server#handlingresponse) and reuses the [Auth.js encryption API](https://authjs.dev/reference/core/jwt) already installed in the app. The encryption wrapper is isolated in one server-only module; no second signing or encryption implementation is introduced.

## Release handoff

The app continues to use the existing shared provider setup. Brandon owns review, staging, commits, pushes and deployment. There is no provider reconfiguration task for the Japanese path. The focused callback finding is corrected locally; English attempt persistence/finalization limitations remain explicit. Japanese flashcards remain DRAFT; assessment authorization did not publish them. No application migration or content publication is part of this increment. Nothing is staged, committed or pushed.
