# Shared onboarding restoration

Section 6e of [the mirror plan](../MIRROR_PLAN.md), 2026-10-31.

## Findings and resulting behavior

The original four-step student wizard was still present for both subjects: timezone, learning goals, notification preferences and explicit consent. Existing account-wide completion intentionally prevents repeating this setup after a language switch. A teacher account still uses the original teacher checklist; teaching Japanese does not require a second account or new payment/Google integration.

The Japanese student checklist retained an early mirror scaffold that removed placement and materials. Its remaining completion calculations used English placement fields, and its dashboard duplicated those calculations. Both now consume one read-only `readStudentOnboardingState` service. Bookings and published study history are scoped to the current subject. Japanese placement completion requires a valid estimated Japanese result belonging to its attempt; English results and inconclusive Japanese attempts do not complete it. English retake policy stays unchanged. Profile, Google connection, chat and existing explicit checklist dismissals remain account-wide.

All six student steps are visible. Japanese placement links to `/japanese-placement` and now carries the existing return-to-onboarding banner. The Japanese flashcard step explains its unavailability without opening unpublished cards. A future published catalog enables the link through the same read model. The local catalog remains DRAFT.

The teacher dashboard layout previously blocked unfinished teachers from opening their own profile, settings and schedule. Student account setup remains required at the shared layout. Teacher initial routing is enforced at dashboard entry, with a bounded exception for visits from the teacher checklist; visiting setup does not mark onboarding complete. Teachers can open their eligible study area during onboarding. Completion and skipping still use the original endpoint. Google opens the Google settings tab, and chat links request the chat panel. One canonical teacher step list replaces the duplicate list in progress helpers.

The teacher materials link is offered only where the existing English study area is usable and an active English offering exists. Japanese-only teachers see an explanation and a skip action rather than entering English student materials. This does not add teacher access to the student-only Japanese study APIs or publish a Japanese catalog.

## Verification

TDD red covers missing Japanese checklist steps, unavailable materials, the teacher setup redirect loop and retained initial role gates. Further red checks cover the Google tab, chat target and inappropriate English materials link; browser red exposes the missing Japanese assessment return link. The fresh teacher browser test closes the existing profile editor before using its return banner. The student browser test selects the visible profile action instead of a hidden mobile schedule link.

The safe mirror suite passes **654 tests** (existing skip/todos retained). All **fourteen isolated browser journeys pass**, including fresh learner and fresh teacher onboarding for both subjects, placement/study persistence and completed-lesson notes. TypeScript, full ESLint, whitespace and the isolated production build pass. This UI/routing increment does not change assessment scoring or database schemas; no additional assessment-content calibration or migration is introduced.

Impeccable review preserves the shared wizard/checklist, typography, tokens and ruled rows. One batched inspection covers English desktop/light and Japanese mobile/dark student and teacher checklists. The Japanese unavailable explanation exposed the shared row's opacity reduction; removing that reduction preserves the normal text contrast without making the row actionable. A single confirmation pass is used after that correction.

Browser tests use disposable accounts and a disposable PostgreSQL schema. Two intermediate comparisons detected concurrent changes in existing application Japanese placement responses (18→19 and 21→23); a separate read found zero QA users or QA Japanese responses in the application schema. No existing learner data was reset to make the comparison pass. The final run confirms all **24 application-table fingerprints unchanged**, removes its fixtures/schema/connections and releases port 3100. Its schema was `mirror_test_26289e0dc1e4402a82409cc86c858102`.

The first browser attempt correctly refused the occupied developer build lock. QA now uses `.next/mirror-qa` and its own TypeScript configuration, leaving the normal developer configuration unchanged. No task kills the existing developer server. External OAuth/payment providers remain disabled in browser verification.

No schema migration, staging, commit, push or content publication is part of this change. Brandon retains commits and pushes.
