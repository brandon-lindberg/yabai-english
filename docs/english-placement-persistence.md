# English placement persistence and recovery

Section **6d**, authorized on `the-mirror` on 2026-10-30 and delivered locally on **2026-10-31**. This resolves the separate persistence limitations recorded in sections 4i, 4j and 6b–6c. Brandon retains staging, commits and pushes.

## Durable attempt boundary

`EnglishPlacementAttempt` stores the accepted answer history, next issued question, existing adaptive state, scoring/routing versions, revision and original twenty-minute deadline. A unique active-learner key permits one running attempt per student. `EnglishPlacementBankSnapshot` stores each canonical content digest once; active attempts retain their original questions and keys across later bank edits. Digests reuse the shared canonical JSON utility so PostgreSQL JSONB key ordering cannot change identity.

The browser receives an opaque `attemptId:revision` handle and the public question. It no longer carries the authoritative history or adaptive state, and the old signed-state helper and development signing-secret fallback are removed. The handle is not an authorization credential: every operation reads the current account and verifies active student status, English intent and attempt ownership in a transaction.

The existing English question selector, staircase transition, evidence checks and scorer remain the only implementations of those policies. Japanese placement retains its independent bank, assessment state, transition and result interpretation. The common PostgreSQL advisory-lock statement is extracted into `learner-transaction-lock.ts`; English, Japanese and study retain their original namespaces and domain-specific transactions.

## Requests and retries

- Opening or refreshing the quiz resumes the same active row, next question, revision and deadline. Competing starts serialize to the same attempt.
- Each accepted answer appends one receipt containing question ID, choice and server acceptance time. An exact retry returns the current saved view without adding evidence or selecting another question. A different answer for an already accepted revision returns `attempt_conflict`.
- Answer handling evaluates time after acquiring the learner lock. A new answer at or after the deadline is rejected. A stale finish handle still finalizes the latest accepted server history, so a lost final answer response cannot discard an accepted answer.
- Finish and expired-read paths share one finalizer. The terminal receipt and any profile/report/cooldown update commit together. Later retries return the stored receipt without regrading, rewriting the profile, extending cooldown or depending on the live bank.
- Deadline settlement requires a read or submission; no background worker is added. An expired read returns its saved outcome. A later read can start a fresh attempt after an inconclusive outcome; awarded placements retain the existing cooldown.
- Unsupported stored runtime versions close with an unavailable outcome instead of acquiring new scoring rules. Existing unpersisted signed tokens must restart. Previously saved English profile results and all Japanese history are retained without backfilling fabricated attempts.

## Preserved assessment rules

The assessment remains twenty minutes and 24 questions, starting at A1 under `english-staircase-v1`, with six questions per skill. Timed awards still require **15 accepted answers and the existing skill coverage**. The bounded unanswered-question penalty and app-level anchors remain scoring policy v2. Insufficient evidence and an exhausted pool remain inconclusive, preserve any older level and permit immediate retry. A full set of accepted evidence can still be submitted after expiry without an incomplete-time penalty. No recording, free writing or teacher grading is introduced.

## Quiz recovery

One reply adapter restores active, complete and inconclusive responses for initial reads, answers and finishes. It restores the finish action after the last accepted question, renders results settled during an expired read, and aligns the countdown to server time. Returning to a visible tab refreshes authoritative progress without polling.

An uncertain answer freezes the choices and offers **Retry saving this answer**, preserving the exact submitted handle/choice. Reload can also recover the server's accepted state. A conflicting stale answer reloads current progress and announces the recovery rather than applying the old click to a new question. Existing timeout retry and cooldown presentation remain. The reply adapter uses the existing `useLatestRef` hook for session updates, so refreshing Auth.js session data cannot restart the quiz load and replace a freshly saved result with the cooldown screen.

Impeccable's existing product/design context and hardening/craft-floor guidance govern this narrow refinement. The session's previously unavailable launcher is not repeated, and unrelated context drift is preserved. Existing `Outcome`, `Button`, `Choice`, status and progress primitives, typography, spacing and theme tokens remain canonical. New recovery messages are supplied in English and Japanese. No new visual system or assessment page is built.

## Migration and database guarantees

`20261030000000_english_placement_attempts` adds the two English tables and their enum, indexes, foreign keys, checks and update guards. It does not rewrite existing profiles, English bank rows, Japanese rows or study content. Database checks reject missing/null evidence, keep one active owner and enforce the original twenty-minute duration and answer budget. Triggers protect the issued identity/deadline, append-only accepted history, bank contents and terminal receipts. Learner deletion still cascades the learner-owned attempts; referenced bank snapshots cannot be deleted.

The opt-in PostgreSQL suite reuses the existing disposable-schema harness, replays historical migrations, compares the datamodel and verifies rollback, concurrent starts/answer retries/finalization, timeout/read races and immutable history. Existing Japanese persistence tests also replay the new migration over their real active/completed fixtures. Schemas and their connections are removed in `finally`.

## Validation and handoff

TDD first reproduces **fourteen lifecycle failures**, **nine UI recovery failures** with fifteen earlier UI controls passing, and separate database failures for editable history/deadlines and missing/null evidence. The first browser run additionally exposes a real session-refresh/result-display defect and an ambiguous alert locator. Two further failing UI tests reproduce the session callback changing identity after completion and expired reads; the existing stable-reference hook makes them green. The browser assertion selects the product alert by its localized text, excluding Next.js's route announcer. No timeout is enlarged. The route tests reuse one persistence double and the existing policy assertions; that double does not establish PostgreSQL locking or rollback guarantees.

Final database-free checks: **98 English placement, 616 mirror, 183 study and 279 Japanese placement tests pass**. Dedicated database checks: **six English placement, nine Japanese placement and fourteen study tests pass**. Existing skip/todo cases remain explicit. TypeScript, full ESLint and the final production build pass (149 generated pages, 26.96 seconds). The default unit setup is not run locally because it seeds application tables; CI retains its isolated database environment and gains the explicit English persistence command.

Reproduce with `yarn test:english-placement`, `yarn test:english-placement:db`, `yarn test:mirror`, `yarn test:study`, `yarn test:japanese-placement`, `yarn typecheck`, `yarn lint`, `yarn build` and `yarn test:mirror:e2e --capture`. Database commands require the existing local disposable-schema setup; they do not seed application learners.

All **twelve browser journeys pass** with the reviewed 10,291-card corpus (100.68 seconds). English's full attempt resumes the same question/handle/deadline after reload, follows the requested staircase, awards Advanced 3 and returns the same finish receipt without changing its saved profile timestamp/report. The near-deadline cases clone only accepted owned-fixture history into a new disposable attempt; their reloads and expiry use actual persisted state with no substituted API response. Fourteen accepted answers remain inconclusive with retry; fifteen award the existing penalized result.

The new recovery journey deliberately lets the real server accept an answer, then aborts its browser response. Choices stay closed; keyboard Enter retries the same submission and receives the accepted state without consuming another question. Reload restores that state. A second HTTP client advances the attempt; a conflicting stale click reloads the saved next question and announces the recovery. This is a real second request client, not a claim of separate physical-device testing. Japanese assessment, study, onboarding, booking and teacher-note journeys also pass. External providers remain disabled in the established isolated runner.

One bounded Impeccable inspection covers six actual captures: resumed question and full result at 1280px/light/English; uncertain-answer and conflict recovery at 390px/dark/English; insufficient timeout at 390px/light/Japanese; and the qualifying timeout at 1280px/light/English. All six report no page-level horizontal overflow, the existing Archivo/M PLUS 1 stack and a solid 2px sampled focus outline. New recovery actions retain the existing button sizing and fit their mobile layout. The development-tools badge is a preview artifact. No additional visual edits were needed; no independent review, full assistive-technology certification or calibration claim is made.

Ignored evidence under `.impeccable/review/release/` includes `section-6d-reviewed.log`, three `persistence-contact-*.jpg` sheets, the six PNG/JSON pairs and `protected-mirror_test_279e90fc84c442c4a2fd6209d2a0ad43.json`. The browser report compares **24 application-table boundaries**: the existing 22 tables match, and the two new tables remain absent throughout the disposable run. Fixtures, schema/connections and the fixture manifest are removed even after the earlier failed run.

After that verification, the single pending migration is **applied to the local application database**, and `prisma migrate status` confirms all 86 migrations are up to date. The post-migration read-only report, `section-6d-application-status.json`, matches all **22 existing application-table fingerprints** against the pre-migration browser evidence and confirms zero application English attempt/bank-snapshot rows. The active Japanese bank remains version 3 with digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`; English study remains PUBLISHED and Japanese study remains DRAFT. Both owned browser schemas are absent. No application learner fixtures or content publication are introduced.

Final cleanup confirms all recorded task-owned test/build/browser processes have exited, port 3100 is released and no fixture manifest remains. The additive migration must also accompany this code when Brandon deploys it elsewhere. Old unpersisted in-flight English tokens must restart; saved historical levels/reports are retained. Remote CI has not run. The next planned work is release handoff and the separate flashcard publication decision. Nothing is staged, committed or pushed.
