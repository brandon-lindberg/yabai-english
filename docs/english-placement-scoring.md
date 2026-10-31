# English placement evidence and timeout policy v2

**Persistence follow-up:** [Section 6d](english-placement-persistence.md) replaces the browser-carried signed state with durable, revisioned attempts, frozen bank snapshots and once-only finalization. Scoring policy v2 remains unchanged. Signed-token storage descriptions below record the earlier implementation.

Implemented on `the-mirror`, 2026-10-27, following the owner's 15-answer minimum and unanswered-question penalty requirements. This replaces the full-24 award gate from the [initial deadline guards](english-placement-guards.md). Brandon retains staging, commits and pushes.

**Subsequent routing increment:** [A1/N5-first staircase routing](placement-staircase.md) is delivered, including target-band skill balancing and legacy-token compatibility. The English scoring/minimum/penalty rules below remain in force. Verification and database-write statements below describe this scoring increment; the staircase handoff records its later local Japanese migration and expanded checks.

## Completion and eligibility

The server deadline remains twenty minutes, with a maximum of 24 questions. A result is eligible after either the complete objective section, or actual expiry with at least **15 accepted answers and three answers in every English skill**: grammar, vocabulary, reading and functional communication. Incorrect valid answers count toward the minimum. Invalid/late submissions do not. Each skill still has a six-question maximum.

Finishing before expiry with a question remaining returns `attempt_incomplete`, including at 15–23 answers. Timeout with too few answers/coverage returns an inconclusive result and immediate retry without a new completion timestamp or cooldown. All valid answers wrong can support the lowest suggested starting level once the minimum is met; there is no automatic measured award below that minimum.

An exhausted/unavailable bank is an infrastructure outcome, including when the finish request arrives after expiry. It receives no learner timeout penalty and does not save a level. Missing, duplicate, invalid or changed-bank evidence fails before scoring. A full set of previously accepted answers has no timeout penalty even if the finish request arrives late.

## Evidence for the starting band

The existing scorer now has an explicit v2 option; it shares question/section point collection and result formatting with its legacy path. It does not copy an assessment engine. Weighted answer points remain descriptive; a percentage alone no longer determines v2 placement.

A candidate question band needs at least four correct answers, correct evidence in at least three skills including grammar and reading, and at least two-thirds correct among the evidence included for that band. Included evidence consists of questions at that exact band plus correct harder answers. Wrong harder probes do not revoke an established easier band. The highest confirmed band selects an app starting-level anchor:

| Confirmed question band | App starting level before timeout penalty | App index (0–8) |
| --- | --- | --- |
| No confirmed band | Beginner 1 | 0 |
| A1 | Beginner 2 | 1 |
| A2 | Beginner 3 | 2 |
| B1 | Intermediate 2 | 4 |
| B2 | Advanced 1 | 6 |
| C1 | Advanced 3 | 8 |

These are product mappings for lesson placement, not official CEFR conversions or confidence probabilities. They prevent perfect A1/A2 answers from producing an advanced award. New results are automatic; v2 does not inherit the old percentage-boundary teacher-review flags. Skill strengths and improvement areas still describe the actual accepted answers.

## Bounded timeout penalty

For an eligible incomplete timeout, with `n` accepted answers:

```text
unadjustedScore = appIndex × 12.5
timeoutPenaltyPoints = 10 × (24 − n) / (24 − 15)
adjustedScore = max(0, unadjustedScore − timeoutPenaltyPoints)
finalAppIndex = floor(adjustedScore / 12.5)
```

The index is a product scale, not an accuracy percentage. Eligible penalties range from zero to ten points and cannot reduce the result by more than one English app sub-level. The lowest app level is the floor. Missing items do not receive fabricated difficulties/keys and are not also inserted as full incorrect answers.

| Accepted answers | Penalty points | Final index effect |
| --- | --- | --- |
| 14 or fewer | No measured award | Retry |
| 15 | 10 | One app sub-level lower, except at the floor |
| 20 | Approximately 4.444 | One app sub-level lower, except at the floor |
| 23 | Approximately 1.111 | One app sub-level lower, except at the floor |
| 24 | 0 | No timeout reduction |

The points vary proportionally; the awarded level is discrete. In this version, any eligible incomplete timeout lowers the confirmed anchor by one app sub-level unless already at the floor. This explicitly describes the effect of rounding, rather than implying different missing counts always produce different level labels. The weight is a transparent product rule, not a fitted or native-speaker timing norm.

## Versioning, storage and presentation

New signed tokens carry scoring version 2 and a SHA-256 fingerprint of the exact bank. A changed bank or unversioned active token returns `attempt_unavailable` with a fresh-start recovery; it is not silently reinterpreted under v2. Previously saved profiles/reports are not migrated or recomputed. The legacy scorer remains available explicitly for compatibility, while the live route calls v2.

Saved v2 reports include the bank digest, scoring version, completion reason, answer/section counts, minimum, confirmed question band, unadjusted level/index score, penalty and adjusted score. Existing raw points and skill rows remain available. The learner receives the saved final level, a localized minimum/penalty notice before answering and a localized explanation on timed results. The UI uses the existing `Outcome`, `Button`, typography and theme tokens; its result type comes from the scorer rather than a duplicated interface.

This change does not add persistent English attempt rows, once-only transactional finalization, or cross-tab/reload recovery. Existing signed-token finish retries can still update the profile again; no stronger persistence guarantee is claimed. Japanese history and publication are untouched.

## TDD and verification

Twenty-four initial scoring/API assertions failed before implementation. Further red regressions exposed inappropriate lower-band demotion from harder probe errors and missing version/bank pinning; three UI assertions failed before adding the minimum/timeout messages. An invalid test fixture initially exceeded a per-skill quota and was corrected to test insufficient coverage specifically.

- `yarn test:english-placement`: **63 pass** (23 evidence/scoring, 20 real-handler/mock-persistence, 15 deadline/recovery UI, one skeleton and four cooldown tests). No credentials, database seed or application database access.
- `yarn test:mirror`: **375 pass**, one existing skip and three todo cases.
- `yarn test:japanese-placement`: **262 pass**, eight database cases skipped.
- TypeScript, focused ESLint, production build and whitespace checks pass.

Tests cover 14/15/23/24 boundaries; minimum skill coverage; valid incorrect answers; floor and monotonic/bounded penalties; A1–C1 ceilings and actual full adaptive mechanics profiles; harder-probe failures; no double counting; bank exhaustion at the minimum after expiry; changed keys under unchanged IDs; legacy tokens; accepted-evidence storage; late-answer rejection; localized timed awards and restart recovery.

Eight isolated current-component captures with production CSS/fonts were inspected at 320/390/1440px across both locales/themes: eligible timed results, insufficient evidence, active minimum notices, complete result and unavailable attempt. Their result fixtures were generated offline through the real bank loader, adaptive functions and scorer. Public API responses/session/navigation were adapted for presentation; this is not a new authenticated database journey. All captures have no horizontal overflow/browser errors, 48px controls, visible 2px keyboard focus and successful keyboard recovery. Evidence is ignored under `.impeccable/placement-deadline/captures-v2/`.

Impeccable's previously unavailable context launcher was not repeated. Existing product/design context and harden/craft-floor guidance informed this narrow extension; the incumbent visual system remains. No independent reviewer, clean-detector verdict, empirical calibration or new mandatory pilot is claimed.

## Next section

The versioned N5/A1-first staircase and independent Japanese timeout penalty are delivered in [section 4j](placement-staircase.md). Japanese retains its own evidence/anchor rules; the English 15-answer minimum and nine app sub-level indices are not copied into it. The subsequent [guarded reviewed Japanese flashcard DRAFT refresh](japanese-study-draft-refresh.md) is complete locally. Section 6 cross-product verification is next.

No application database write, seed, migration, import, publication, commit or push was performed during this increment. Runtime persistence was exercised through mocks. All recorded task-owned processes and preview children have exited; port 3188 is released. No task automation loop or database fixture remains. Whitespace checks pass and nothing is staged.
