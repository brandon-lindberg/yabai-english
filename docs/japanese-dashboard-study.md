# Japanese dashboard study and daily review

Section 5j of `MIRROR_PLAN.md`, 2026-10-24. Branch: `the-mirror`. Brandon owns commits and pushes.

## Dashboard data

The student dashboard rereads the current account's active role and persisted learning language. A stale session subject or a UI locale change cannot select the other subject's study data. Missing/inactive/nonstudent accounts return no student dashboard. Japanese rank XP, latest practiced level, touched-card totals and practice analytics come from the guarded Japanese overview and its own levels. An English profile placement value confers no Japanese study rank or proficiency label. English resume and onboarding study-history reads explicitly scope the published English track.

Existing `DashboardStudyHighlight` and `DashboardFlashcardStats` render both subjects with their own view data. The common resume button uses the existing 44px button size. The current DRAFT Japanese catalog shows preparation copy and the shared study link, without a daily panel, rank or fabricated study totals. Overview and daily-status reads do not create learner progress, prompts or daily rows.

## Daily review contract

`POST /api/japanese-study/quick-review` accepts only `{}` through the existing authenticated, private no-store JSON wrapper. The same fresh active-Japanese-student, publication and snapshot guards apply as regular practice. An explicit learner action selects up to five unique cards with at least one prior correct answer, from currently unlocked Japanese levels. The shared weighted scheduler prioritizes due cards. An empty pool returns an empty status without creating a daily row.

The existing `StudyQuickReviewDay` key `(userId, JAPANESE, UTC YYYY-MM-DD)` holds the day's fixed card IDs and exact pending prompt/result receipts. Later requests return the same eligible unfinished slots; foreign, locked and ineligible cached IDs are excluded. Completed slots do not rotate or refill that day. New eligible cards can join the next day's set. English daily rows and their flip/self-report interactions remain separate and unchanged. No migration is required.

The public response is `{dayKey,total,answered,correct,wrong,xp,cards:[{question,expiresAt}]}`. The shared schema bounds the set to five and validates counts and unique prompt/unit identities. It contains no answer keys or private feedback. Regular and daily queues use the same Japanese prompt-bank preparation and issuance helpers, with the same member/task rotation, access band, content hash, performance revision and 24-hour expiry safeguards.

## Answers, retries and completion

Daily answers use the existing `POST /api/japanese-study/reviews` route and server grader, adding `dailyDayKey` to the exact saved request. The server verifies that date and its card/prompt binding against today's row. An obsolete daily context returns `409 DAILY_REVIEW_CHANGED` before progress is awarded; the client offers a fresh queue. Ordinary practice requests keep their existing contract without this optional context.

Daily receipts save in the same learner-locked transaction as card performance, scheduling, XP, milestones and immutable review results. A failed result save rolls back all effects. An identical retry returns the saved result without duplicate credit; a different answer conflicts. A valid matching prompt answered from full practice can also complete its existing daily slot through the same persistence helper. Daily credit never requires or trusts a client correctness claim.

`DashboardJapaneseQuickReview` starts only after the learner chooses Start/Resume. It embeds the existing `JapaneseStudySession` and controller, preserving automatic feedback, reading-category distinctions, manual Next card, exact uncertain-save retries, disabled choices while saving and explicit access/publication recovery. It restores saved daily XP and correct/wrong totals. After each confirmed result it refreshes the dashboard summaries while retaining feedback. Completing the last card shows daily completion; reloading preserves that completed set and offers no repeat-award action. Wrong responses count as reviewed, without claiming the card was learned. Empty initial sets render no panel.

## Verification and limits

Demonstrated red/green covers daily issuance/persistence, missing UI and the UTC-boundary request context. **168 study tests, 11 isolated PostgreSQL study tests and 375 mirror regressions pass: 554 targeted tests.** These cover subject/actor/publication boundaries, read-only dashboard access, concurrent daily starts and identical saves, immutable results, rollback, forged inputs, foreign/locked cached cards, UTC rollover, exact uncertain retries, completion/reload and both UI locales. The shared fixture is extracted from the existing persistence suite. TypeScript, focused ESLint, whitespace checks and production build pass. The study database runner now includes all three persistence files.

Thirteen full-page component captures cover ready, active vocabulary, kanji feedback, uncertain save, resume and completed states at 1440px light, 390px dark and 320px Japanese/light, plus an English comparison. The capture batch has no overflow or browser errors and uses production components/CSS/fonts with synthetic translations/data/API responses. Server summary markup is rendered from the actual async components; its last-practice client timestamp is not hydrated in this fixture. The captures omit the surrounding booking/profile/header sections and do not establish authenticated whole-app completion. That verification remains section 6 work. The Impeccable launcher/detector could not execute, so no clean detector result is claimed. The separate finish reviewer returned **ship** at this component scope with no material fixes.

The separate Impeccable documentation handoff found no material mismatch with this implementation, preserved the established system files and recorded pre-existing product/format drift without repair.

The catalog remains **DRAFT**, the published Japanese assessment is unchanged, and no application learner state or migration is created. Local verification confirms zero Japanese progress/card-state/question-ledger rows and zero temporary schemas/connections. Preview/browser/test/build processes are cleaned up. Commits and pushes remain with Brandon.

Next: learner-facing usage translations, sense/example/content review and corpus release preparation. The earlier assessment publication authorization does not publish the flashcard corpus.
