# Saved Japanese level and flashcard navigation

Section 6m of [the mirror plan](../MIRROR_PLAN.md), 2026-11-05, on `the-mirror`.

## Findings

The reported local account already had a completed 24-answer N5 result from October 31. A later zero-answer timeout remained in its history. The assessment overview and study progression selected the latest attempt rather than the latest awarded result, so the empty attempt hid the earlier level. The Japanese dashboard did not render a saved-level summary at all. Separately, header navigation still explicitly omitted the shared study link for Japanese students, a restriction left over from the earlier draft phase.

Japanese results are stored in `JapanesePlacementAttempt.result`, with accepted responses in `JapanesePlacementResponse`. The English `StudentProfile.placedLevel` fields are independent; UNSET there does not mean a Japanese result was lost. No result, response, profile or progress repair was needed.

## Corrected behavior

`readLatestJapanesePlacementAward` in [retake.ts](../apps/web/src/lib/japanese-placement/retake.ts) provides the shared read of a completed, estimated, schema-valid Japanese award belonging to the learner. It checks receipt identity and retains the original result metadata. Cooldown, onboarding/dashboard, study progression, the assessment overview and the teacher result all use this source.

- A current active attempt continues normally. Once no attempt is active, the assessment overview returns the saved award ahead of a later inconclusive/abandoned attempt. Without an award, it retains the existing latest-attempt behavior.
- Historical attempts remain accessible by their own IDs and keep their original receipts. Later incomplete attempts cannot replace the saved level, clear its cooldown or remove placement-based study access.
- The dashboard shows the saved Japanese band, its provisional reading/sentence-building scope, completion date in the viewer's timezone and **View saved result**. It does not copy Japanese placement into English profile fields.
- Eligible teachers receive the same retained award, with the existing booking/ownership checks. With no award, the existing latest-result fallback remains.
- The shared student header includes `/learn/study` for both subjects. Its label is now **Flashcards / フラッシュカード**, on desktop and mobile. Subject authorization and the publication gate remain enforced by the existing study pages/API.

No assessment scoring, deadline, retake policy, corpus, payment integration or schema changes. The local Japanese study track remains PUBLISHED.

## Evidence

TDD initially exposes three UI/navigation failures and the database selection failure where `later-empty` replaces the original awarded attempt; the other eight persistence cases pass. The corrected test fixture respects the database's immutable duration constraint. The final suite verifies the award is selected while the later receipt remains available by ID and Japanese study unlocks retain the awarded band.

- **793 mirror tests, 291 Japanese placement tests and 191 study tests pass**, with their existing database-only skips/TODOs explicit.
- **Nine isolated Japanese placement PostgreSQL cases pass**. The shared retake fixture's seven tests also pass after deduplication.
- The real browser placement journey passes and is confirmed once after the clearer navigation labels. It finishes an actual assessment, adds an explicit isolated historical empty attempt, reloads the saved result, checks the dashboard in English desktop/light and Japanese mobile/dark, and opens Japanese flashcards through the visible header link. Both runs preserve all 28 public application-table fingerprints and remove their owned fixtures/schema/connections.
- TypeScript, full ESLint, whitespace and the final production build pass. The asynchronous focus assertion now waits for its existing effect; no product focus behavior changes.

Read-only verification through the application's Prisma adapter selects the reported account's original 24-answer N5 award, confirms Japanese study is available at N5 and confirms the retake is blocked until the existing policy allows it. Complete before/after attempt and response objects compare identical. Its authoritative completion timestamp is `2026-10-31T01:08:14.626Z` (October 31, 10:08 AM Japan time). An earlier raw PostgreSQL audit interpreted the timezone-less database column using the host timezone; the app-adapter verification corrects that initial reported time.

Evidence is ignored under `.impeccable/placement-visibility/`; no account email is added to tracked documentation. Task-owned preview/build/test processes are stopped and port 3100 is released. The user-started development server on port 3000 is preserved. Brandon retains staging, commits and pushes.
