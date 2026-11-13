# Placement staircase and Japanese timeout policy

Delivered on `the-mirror`, 2026-10-27, under section 4j of [the mirror plan](../MIRROR_PLAN.md). This extends [English scoring v2](english-placement-scoring.md) and the Japanese source-aligned rubric. Brandon retains staging, commits and pushes.

## Routing contract

New English assessments start at **A1**; new Japanese assessments start at **N5**. The shared `adaptive-staircase.ts` owns only these routing mechanics:

- One correct answer at the lowest band probes the next band, including after returning to the floor.
- One incorrect answer holds the target. Two consecutive incorrect answers at the target lower it one band.
- Above the floor, two consecutive correct answers normally raise the target one band.
- After a mistake at that band, three consecutive correct answers confirm it. That requirement is capped at three and clears after promotion.
- Neither floor nor ceiling can be crossed. A fallback question outside the intended band cannot complete that target's streak.

For `correct, incorrect, incorrect, correct, correct, correct, correct`, the offered questions are:

| Question | Japanese | English |
| --- | --- | --- |
| 1 | N5 | A1 |
| 2 | N4 | A2 |
| 3 | N4 | A2 |
| 4 | N5 | A1 |
| 5 | N4 | A2 |
| 6 | N4 | A2 |
| 7 | N4 | A2 |
| 8 | N3 | B1 |

Routing determines the next question, not the award. The two languages retain their own banks, graders, evidence rules, domain quotas, level interpretation, timeout treatment and persistence. No English scoring thresholds or assessment engine are copied into Japanese.

English balances the least-asked skill, then the fewest exposures at the current target band, using the existing stable skill order to break remaining ties. Fixed round-robin ties produced difficulty/skill bias in mechanics tests; balancing target-band exposures preserves the required grammar/reading evidence without weakening the award rules. The budget remains six questions per skill and 24 overall. If an exact A1 opening is unavailable, a new assessment is unavailable rather than silently starting harder.

Japanese balances its native quotas across grammar, vocabulary, kanji reading, reading and sentence construction. Its first eight questions use those domains so kana does not interrupt the requested opening trace. It then fills the two kana slots before continuing the remaining balanced quotas: kana 2, kanji reading 4, vocabulary 4, grammar 4, reading 5, construction 5. Kana remains N5 foundation evidence and never advances the main ladder. Existing passage-group exclusions and reading/construction anchor restrictions remain enforced.

## Independent Japanese runtime version

New server-started schema-v5 attempts use:

```text
policyRevision  = japanese-jlpt-staircase-v2
scoringRevision = japanese-reading-writing-staircase-v2
```

These runtime revisions operate over the existing approved **bank version 3 / schema 5**, digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`. Its 470-item catalog, 220-item serving pool, labels, keys, anchors, source notices and publication are unchanged. Runtime compatibility requires the full five-band, 24-question schema-v5 rubric bank. A new content schema, duplicated bank, reapproval or republication is unnecessary for this runtime change.

Attempts store the policy selected at start. Replay uses that policy and the immutable original bank. Legacy schema 3/4 likelihood attempts and schema-5 rubric-v1 attempts keep their original routing and results; active legacy attempts are not upgraded. The pure start function retains its historical default for explicit legacy callers, while the application service explicitly chooses staircase-v2 for new schema-v5 starts.

English new signed tokens carry `routingRevision: english-staircase-v1` alongside scoring version 2 and the bank fingerprint. Already-issued v2 tokens without a routing revision continue the former A2/per-skill routing; unknown revisions or mismatched state formats receive the existing unavailable/restart recovery. Saved reports record the routing revision. Previously saved results are not recomputed.

## Japanese evidence and timeout penalty

The twenty-minute deadline and automatic transactional completion remain. Japanese still requires **12 non-skip valid answers**, at least four domains including reading and construction, and native evidence for a measured award. Each N5–N1 candidate requires at least four successes, at least two-thirds correct in exact-band responses plus harder successes, two independent reading anchors, one construction anchor and successes in three non-kana domains. Harder failed probes do not revoke easier-band evidence. Below-N5 requires its existing basic-task failure evidence. Insufficient evidence does not fabricate a level.

Only a qualifying incomplete timeout under staircase-v2 applies the new adjustment:

```text
unanswered = questionLimit − recordedResponses
penaltyBandFraction = 0.5 × min(1, unanswered / (questionLimit − minimumAnswers))
rank = BELOW_N5:0, N5:1, N4:2, N3:3, N2:4, N1:5
adjustedRank = rank == 0 ? 0 : max(1, floor(rank − penaltyBandFraction))
```

With the approved 24-question / 12-answer bank, 12 recorded answers deduct 0.5 band, 20 deduct approximately 0.167 and 23 approximately 0.042. The fraction is proportional; discrete rounding lowers an eligible N4–N1 award by **one JLPT study band** for any incomplete timeout. N5 is the floor for timing alone, and an independently established below-N5 result stays below N5. This is an explicit conservative product rule, not an empirical speed norm or official JLPT scoring conversion.

Recorded skips already contribute unsuccessful evidence and are excluded from `unanswered`, avoiding a second missing-work penalty. Completing all 24 responses, including skips, receives no timeout adjustment. An insufficient result has none. Historical policies receive none. English retains its separate 15-answer minimum, skill coverage and at-most-one app-sublevel timeout rule.

The stored/public Japanese summary adds `timeoutAdjustment` with the unadjusted band, unanswered count, penalty fraction and actual band reduction. Its public contract validates the completion reason, evidence basis and band relationship. The single learner/teacher result component explains the before/after band, or that the floor remains, in English and Japanese. The intro explains the N5 opening and timing consequence using existing typography, muted tokens and controls.

## Persistence migration

`20261027000000_japanese_placement_staircase` extends only the existing attempt timing/version check constraint to accept the new policy/scoring pair. Existing immutable fields, deadline guards, response triggers, per-learner locking and retry behavior remain. No learner, response or bank rewrite is included.

The migration passed in isolated PostgreSQL schemas before being applied locally. A guarded local runner allowed only that pending migration and compared row counts plus complete-row digests before and after for `JapanesePlacementBankSnapshot`, `JapanesePlacementAttempt`, `JapanesePlacementResponse` and `StudentProfile`: **all unchanged**. The released bank digest is unchanged. Isolated test schemas and their database connections were removed. Production migration/deployment remains separate.

## TDD and verification

The exact sequences failed before implementation in both languages. Further red regressions covered the unavailable A1 opening, native English band/skill coverage, Japanese public timeout metadata and localized teacher copy. Isolated database tests rejected the new runtime pair under the old constraint before the migration made them green. A dynamic-server-time assertion in an initial database fixture was corrected before evaluating that constraint failure.

Completed checks:

- `yarn test:english-placement`: **73 pass**.
- `yarn test:japanese-placement`: **279 pass**, nine database cases skipped in that command.
- `yarn test:mirror`: **375 pass**, one existing skip and three todo cases.
- `yarn test:japanese-placement:db`: **9 pass** in isolated schemas, including the new policy, persisted timeout adjustment, active/completed legacy history, concurrent retries and database guards.
- Offline legacy adaptive and complete-attempt compatibility checks: **13 pass**.
- **749 passing checks overall**, plus TypeScript, focused ESLint, production build and whitespace checks.

Mechanics profiles cover every native band and below-N5; complete runs preserve quotas and unique item/passage evidence. Tests also cover serialized replay, single lapses, confirmation reset, floor/ceiling, 11/12/20/23/24 Japanese boundaries, skipped versus unanswered work, bounded penalties, stored/public metadata and English token compatibility. Synthetic profiles check mechanics and award reachability; they are not learner calibration evidence. No mandatory pilot is introduced.

Nine inspected current-component browser captures cover 320/390/1440px, both locales/themes, Japanese adjusted/floor/legacy results, teacher presentation, intro and active N5 question, plus English A1 openings. Public fixtures come from actual loaders/core functions; API/session/navigation are adapted for presentation, not a new authenticated journey. All have no horizontal overflow/browser errors, 44–48px buttons, 2px keyboard focus and successful keyboard start/answer/navigation. Evidence is ignored under `.impeccable/staircase/captures/`. No material visual fixes were needed. This extension preserves the incumbent visual system under Impeccable guidance and adds no shipping raster assets or independent-review claim.

Task-owned tests, builds, fixture generation, preview/browser processes and children have exited; port 3188 is released. No automation loop remains. Nothing is staged, committed or pushed. English persistent attempt rows, once-only transactional finalization and cross-tab/reload recovery remain separate known work; signed-token finish retries retain their existing persistence limits.

The subsequent [guarded reviewed Japanese flashcard DRAFT refresh](japanese-study-draft-refresh.md) in section 5cb is complete locally. Next is section 6 cross-product verification and release preparation. Flashcard publication remains separate from the assessment authorization.
