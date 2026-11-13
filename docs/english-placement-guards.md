# English placement deadline and completion guards

**Persistence follow-up:** [Section 6d](english-placement-persistence.md) now saves and resumes English attempts and finalizes each result once. The signed-token limitations below describe the earlier guard increment; the active scoring rules remain [policy v2](english-placement-scoring.md).

Delivered on `the-mirror`, 2026-10-27, as the first corrective increment from the [placement scaling audit](placement-scaling-audit.md) and mirror plan section 4g. Brandon retains staging, commits and pushes.

**Superseded implementation:** [English evidence/timeout policy v2](english-placement-scoring.md) is now implemented: 15 accepted answers plus skill coverage can earn a timed-out placement, with a bounded penalty. The full-24 gate and verification details below record the earlier guard increment; they are implementation history, not the active award policy.

## Server behavior

The existing English route owns the deadline check. An answer is accepted only while server time is strictly before the signed `expiresAt`; an answer at the deadline or afterward returns HTTP 409, `attempt_expired`. No new answer, question or token is issued. Accepted answers retain the original issue time and deadline.

Until the separate band-aware scoring policy is implemented, the existing percentage scorer can award a result only for the complete objective section: 24 distinct, available questions, six in each existing English skill, with no current question remaining. These limits come from the existing adaptive configuration rather than another copied set of constants.

| Finish condition | Response | Profile/cooldown effect |
| --- | --- | --- |
| Still active with unanswered questions | HTTP 409, `attempt_incomplete`, original expiry and current server time | None; the same attempt can continue |
| Expired with fewer than the complete objective section | HTTP 200, `status: inconclusive`, `reason: insufficient_evidence` | No new level or completion timestamp; any existing placement remains |
| Pool ends before complete coverage | HTTP 200, `status: inconclusive`, `reason: question_pool_exhausted` | None |
| Asked bank item is missing, or an ID is repeated | HTTP 409, `attempt_unavailable` | None; missing items cannot shift answers onto other questions |
| Complete objective section, including a later finish request | Existing scorer/result and profile update | Existing completed-result behavior |

The last case scores previously accepted answers. It does not accept a late answer or extend the deadline. The 24-answer gate is a conservative interim rule; it is not the final adaptive evidence policy. The next scoring version must explicitly define when partial timed evidence can support a confirmed band.

## Learner recovery

The English quiz handles inconclusive outcomes in both interface languages, using the existing `Outcome`, `Button` and navigation primitives. It explains why no new level was saved, offers a fresh attempt and a dashboard link, and does not refresh the session as if a level had been awarded.

The countdown rounds up the remaining fraction of a second, so it does not initiate timeout submission early. If server time says an attempt is still active, its response resynchronizes the countdown without changing the signed deadline. If an answer is rejected as late, finalization uses the previous accepted token. Timeout waits for an in-flight answer response before selecting that token.

A failed finish displays an explicit uncertain-save message and a retry action. Answers stay closed after timeout, automatic requests do not loop, and the same finish can be retried. A failed fresh-start request clears the old question/token and offers another load attempt. Completed/inconclusive states release their timer interval.

## Verification

TDD red/green reproduced the defects before implementation: ten API regression failures and eight initial UI failures. Additional failing regressions covered failed-restart state and the uncertain-save message before their fixes.

- `yarn test:english-placement`: 30 passing tests, including 14 real-handler tests with mocked authentication/persistence and the checked-in bank loaded offline, 11 UI deadline/recovery tests, plus the existing skeleton and cooldown tests. The dedicated config never loads credentials or runs the database-seeding default setup.
- `yarn test:mirror`: 375 passing; one existing skip and three existing todo cases.
- `yarn test:japanese-placement`: 262 passing; eight database integration cases remain skipped in this database-free command.
- TypeScript, focused ESLint and the production build pass.

The new route tests cover early finish at 0/3/23 answers, exact deadline and one millisecond after, acceptance one millisecond before expiry, unchanged signed timing, insufficient timeout evidence, exhausted pools, missing bank items, complete-result persistence before/after expiry and Japanese/English access isolation. Persistence assertions use mocks; no application profile or bank was written.

## Design and browser evidence

Impeccable's context launcher exited 126 (permission denied). Existing `PRODUCT.md`, `DESIGN.md`, placement code, an incumbent timeout capture, and the skill's harden/craft-floor guidance were read directly. The authorized mirror work supersedes the product document's older frozen-functionality scope. No unrelated context migration or style-system repair is included.

The refinement keeps the incumbent fonts, tokens, spacing, surface and shared controls. It adds no palette, layout system, animation or raster asset. Six isolated current-component captures use the production CSS and fonts, with synthetic public API responses and session/navigation adapters:

- Timeout: 1440px/light/English, 390px/dark/Japanese and 320px/light/Japanese.
- Pool exhaustion: 390px/dark/English.
- Unavailable bank item: 1440px/dark/Japanese.
- Failed finish/retry: 390px/light/English.

Captures and metrics are ignored local evidence under `.impeccable/placement-deadline/captures/`. All six were visually inspected. One bounded confirmation pass verified the clearer uncertain-save copy, no horizontal overflow or browser errors, 48px buttons, visible 2px keyboard focus and working keyboard recovery. This verifies the component states, not a new authenticated database journey or official placement calibration. The production build verifies compilation of the real route and component.

## Remaining work

The full-24 replacement, native-band-aware awards, bounded timeout penalty and new-token bank/scoring pinning are delivered in [v2](english-placement-scoring.md). The N5/A1-first routing and confirmation changes remain next. Persistent English attempt history and once-only transactional finalization/retry storage remain separate work.

Japanese placement publication/content/history and the pending reviewed flashcard draft refresh are unchanged. No database seed, migration, import or publication was run. All recorded task-owned test/build/browser/preview processes and preview children have exited; port 3188 is released. No task automation loop or database fixture remains. Whitespace checks pass. Nothing staged, committed or pushed.
