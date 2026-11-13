# Mirror release verification

Section **6a**, delivered locally on `the-mirror`, 2026-10-29. This completes the real onboarding, private booking and completed-lesson notes browser journeys for both subjects. Section 6 remains open for placement/study browser coverage and external-service release verification. Brandon retains staging, commits and pushes.

**Update, 2026-10-30:** [Section 6b](mirror-placement-study-verification.md) extends the runner to eleven scenarios, actual English study data, the shared ten-card synthetic practice fixture and twenty-two protected public tables. The results and architecture below record the earlier section-6a delivery.

## Real journeys covered

The two former placeholder specs now run four browser scenarios through the application, its authentication and real API/database operations. Shared fixtures, sign-in helpers and subject scenarios avoid separate English/Japanese implementations.

| Journey | Verified behavior for English and Japanese |
| --- | --- |
| Landing and sign-in | The chosen landing CTA carries the intended learning language through sign-in and onboarding. |
| Onboarding | All four steps persist; the synthetic account must give consent before submission. Japanese interface switching preserves the current goal draft. |
| Teacher selection | The directory shows the teacher for the student's subject and excludes the other subject's teacher. |
| Free private trial | A real booking becomes `CONFIRMED`, retains its subject/teacher and creates a zero-yen invoice. Disconnected Google accounts leave `meetUrl` and `googleEventId` null. |
| Paid booking | A separate 5,000-yen booking remains `PENDING_PAYMENT` with one `CREATED` payment. Checkout requires the terms checkbox. Disabled Stripe returns 503 and never marks it paid. |
| Completed-lesson notes | Each teacher edits and saves notes on its own seeded past booking; reload preserves them and the student reads them. Student and other-teacher writes return 403. A student currently learning Japanese can still read their historical English booking. |
| Subject boundaries | Opposite-subject placement APIs return 403. English placement opens successfully. Japanese study remains unavailable while its track is `DRAFT`. |

Completed-lesson fixtures are explicitly seeded in the past. These tests exercise notes and ownership, not an actual call, passage of lesson time, recording or transcript generation. Test consent belongs only to disposable synthetic accounts.

## Safe, repeatable execution

From the repository root:

```sh
yarn test:mirror:e2e
yarn test:mirror:e2e --synthetic-draft --capture
```

`MIRROR_TEST_DATABASE_URL` can select a loopback PostgreSQL test database; otherwise the runner reads the local web `.env`. The runner rejects remote hosts and an existing fixture manifest. It reuses `withIsolatedPostgres`, applies the migrations and seeds a random `mirror_test_<uuid>` schema. The released Japanese assessment bank is published only inside that disposable schema. The study importer uses the locally cached reviewed corpus when available, or the existing two-card synthetic fixture for CI. Neither choice publishes application flashcards.

The Prisma PostgreSQL adapter previously ignored the URL's `schema` parameter. Three tests first failed against that behavior; the application client now passes the configured namespace to the adapter explicitly and retains `public` as its default. The browser runner also sets PostgreSQL `search_path`, isolating raw SQL as well as Prisma operations.

Playwright owns the Next server on port 3100 and refuses to reuse an occupied port. Its configuration disables Stripe/Google credentials and automatic booking confirmation, and supplies test-only authentication secrets. The fixture CLI records ownership, validates the namespace before cleanup and removes only its manifest's users/products. The runner executes cleanup in `finally`, closes the schema's connections and drops the schema. Recorded child PIDs identify task-owned processes.

Before/after full-row fingerprints cover 19 existing public tables: users/profiles; study catalog, progress and review ledgers; Japanese assessment bank/attempts/responses; bookings, payments, invoices and notifications. The captured run reports every fingerprint unchanged. This is a check over those named tables, not a claim that all database tables were fingerprinted.

CI now includes mirror regressions, Chromium installation and these isolated browser journeys. The CI configuration was checked locally; no remote workflow run was started.

## Product fixes and TDD

The actual Japanese onboarding journey exposed English-only goals: ビジネス英語, 旅行英語 and a TOEIC placeholder. Two localized component tests failed before the copy change. The shared picker now uses 仕事・ビジネス, 旅行 and a subject-neutral conversation goal example in both locales. Stable goal IDs and the shared onboarding/profile components remain intact.

The first browser run passed both teacher scenarios but exposed two test-harness issues: an alert selector also matched Next's route announcer, and locale/theme selection raced header hydration. The helpers now wait for the localized controls and actual HTML preference state. These fixes are distinct from the production schema/copy defects above.

Full ESLint initially scanned generated Prisma output and local review/cache bundles. Those generated directories are now excluded; authored application rules remain unchanged. Actual full lint then passed.

## Validation and visual evidence

| Check | Local result |
| --- | --- |
| Mirror unit/component suite | 380 pass; existing one skip and three todo remain |
| Study suite | 183 pass; 14 database-only cases skipped by this unit configuration |
| English placement suite | 73 pass |
| Japanese placement suite | 279 pass; nine database-only cases skipped by this unit configuration |
| Isolated browser suite with reviewed 10,291-card draft | Four pass |
| Same browser scenarios with synthetic CI draft and captures | Four pass again |
| TypeScript, full ESLint, whitespace | Pass |
| Production build | Pass, 149 routes |

There are **1,019 distinct passing checks**: 1,015 unit/component checks plus four browser scenarios. The repeated browser run is not counted twice. Two Japanese tests reached their existing five-second limits during a concurrent build run; the suite passed alone without changing any timeout. Dedicated database-only suites were not repeated in this increment; browser setup does replay the migrations. Final TypeScript/lint include the final harness changes. The production build preceded subsequent test-only runner/configuration edits.

Impeccable guided the narrow copy correction and bounded visual verification. The session's context launcher was unavailable; existing project context and the audit, hardening and craft-floor references were read directly. Existing design-context drift was preserved. No independent reviewer or design detector pass is claimed.

Twelve actual application screenshots were captured and inspected together across onboarding goals, booking review, confirmed dashboard, checkout, teacher notes and student notes. English onboarding/booking uses 1440px, English/light; Japanese uses 390px, Japanese/dark. Teacher-note views use 1440/390px, English/light; student-note views use 1280px, English/light. Each capture records no page-level horizontal overflow, the existing Archivo/M PLUS 1 stack and a solid 2px focus outline on the sampled control. Booking confirmation also uses Enter from the keyboard. These sampled checks do not establish complete keyboard, screen-reader or physical-device coverage.

The existing responsive forms, booking dialogs and notes remain usable in the inspected states. Some full-page images retain the sticky header at the current scrolled position after interaction; they are not top-of-page layout goldens. The disabled-Stripe error is still the existing English configuration message in the Japanese checkout. Live provider errors/localization remain part of the external-service follow-up.

Ignored local evidence lives in `.impeccable/review/release/`: twelve PNG/JSON pairs, three contact sheets, and `protected-mirror_test_f6a77d3b0ba44926a78b87502d18f1d9.json` with the matching table fingerprints. These are local review artifacts, not committed fixtures or published content.

Final read-only verification confirms English `PUBLISHED` with 3,284 cards, Japanese `DRAFT` with 10,291 cards, unchanged Japanese assessment version 3 digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, zero Japanese progress/reviews and zero review-prompt ledger rows. No isolated schemas/connections or fixture manifest remain. Recorded browser/server processes have exited and port 3100 is released. No application migration or publication occurred in this increment; the prior draft-refresh migration remains applied. Nothing is staged, committed or pushed.

## Next section

**6b is delivered locally:** [placement and study browser verification](mirror-placement-study-verification.md) covers actual UI staircase transitions, timed/partial completion, saved results, subject independence and persisted study progress. Japanese test publication remains inside the disposable schema; the application track remains `DRAFT`.

Then complete environment-backed OAuth, successful Stripe checkout/webhooks and Google Calendar/Meet creation/join behavior before claiming an integration-ready release. Existing English attempt persistence/once-only finalization limitations remain separately documented; section 6a does not resolve them.
