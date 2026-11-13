# Placement scaling audit and proposed progression

**Initial implementation update, 2026-10-27:** the [English deadline and completion guards](english-placement-guards.md) addressed late-answer acceptance and premature API level awards. The audit below records the preceding behavior; the subsequent scoring increment is described next.

**Corrective increments delivered:** [English policy v2](english-placement-scoring.md) implements the 15-answer timeout minimum, skill coverage, band-aware awards, bounded completion penalty and new-token version/bank pinning. [Section 4j](placement-staircase.md) implements N5/A1-first staircase routing, independent Japanese timeout treatment, persisted version compatibility and the local additive constraint migration. The subsequent [guarded Japanese flashcard DRAFT refresh](japanese-study-draft-refresh.md) is complete locally. The audit below records the earlier behavior; section 6 cross-product verification is next.

**Owner's timeout correction:** English requires **15 accepted answers**, replacing the suggested 12-answer minimum. Expiry before all 24 questions must still produce a placement when the minimum and skill-evidence requirements are met, with a bounded penalty for questions left unanswered because time expired. V2 implements this correction and supersedes the full-24 gate.

Audited on 2026-10-27 on `the-mirror`, following the owner's request to review both placement tests. This is an audit and implementation proposal; assessment code, bank publication, stored results and learner state are unchanged. Brandon retains commits and pushes.

The proposed experience is a rule-based **adaptive staircase**: increase difficulty after sufficient success, hold the current band after a single lapse, and decrease after repeated difficulty. It is a reasonable product approach for provisional lesson placement. The exact streak rules below are designed product rules, not fitted psychometric parameters. No mandatory in-house pilot is introduced.

## Verified current behavior

The audit read the local application banks in a PostgreSQL `REPEATABLE READ READ ONLY` transaction, exported private ignored audit fixtures, closed the connection, and exercised the existing production functions. It did not seed, publish or alter the database.

| Property | English | Japanese active bank |
| --- | --- | --- |
| Question ratings | All 2,000 items carry A1–C1 labels; 400 per band | All 470 items carry N5–N1 labels; 220 are eligible for serving |
| Starting difficulty | A2 in each of four independent skill ladders | First item is N5 kana; the main non-kana target starts at N3 |
| Promotion | One correct answer raises that skill's target | Two qualifying consecutive non-kana successes raise the main target |
| Demotion | One incorrect answer lowers that skill's target | One wrong answer or explicit skip lowers the main target |
| Final level | Percentage of weighted offered points, plus grammar/reading percentage gates | Multiple successes, domains and independent reading/construction anchors at the candidate band or harder |
| Deadline | Twenty-minute expiry is issued, but the answer endpoint does not enforce it | Absolute server deadline is enforced; late answers cannot change the result |
| History | Signed client token; no bank/scoring revision is pinned in its payload | Immutable bank, policy and scoring versions; deterministic response replay |

English weights are 1/2/3/4/5 for A1/A2/B1/B2/C1. Those weights affect the fraction of offered points, but the resulting percentage does not establish which band a learner has demonstrated. All correct on easy items and all correct on advanced items can both produce a 100% ratio.

The Japanese active snapshot is bank version 3/schema 5, digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`. Its eligible pool contains 60 N5 items and 40 at each higher band; all are labelled. Reading/construction use fifty designated anchors. Question labels already exist; their presence is distinct from measured item difficulty.

### Actual trace for the owner's response sequence

The same seven outcomes were applied to the current engines: correct, incorrect, incorrect, correct, correct, correct, correct. Step eight is the next offered question.

| Step | Outcome | Requested Japanese path | Current Japanese path | Current English path |
| --- | --- | --- | --- | --- |
| 1 | Correct | N5 | N5 kana | A2 grammar |
| 2 | Incorrect | N4 | N3 kanji reading | A2 vocabulary |
| 3 | Incorrect | N4 | N4 vocabulary | A2 reading |
| 4 | Correct | N5 | N5 grammar | A2 functional |
| 5 | Correct | N4 | N5 reading | B1 grammar |
| 6 | Correct | N4 | N4 sentence building | A1 vocabulary |
| 7 | Correct | N4 | N4 reading | A1 reading |
| 8 | Not yet answered | N3 | N3 sentence building | B1 functional |

The English path changes because each skill retains its own target. Japanese uses one main target but excludes fixed N5 kana checks from promotion/demotion. Neither implements the requested repeated-error hold-and-confirm sequence.

## Findings and priorities

### P1: English can award a high level from an unfinished low-band attempt

The real API handlers were exercised with persistence/authentication mocked and a read-only copy of the actual question bank. After three correct A2 answers in grammar, vocabulary and reading, the objective section was still incomplete. Posting `action: finish` nevertheless returned `ADVANCED / subLevel 3` and called the profile update with those values. A separate immediate-finish probe with zero answers returned and attempted to save `BEGINNER / subLevel 1`.

The scorer can also return Advanced 3 from just two correct A1 items covering grammar and reading. The section-variance review flag does not prevent the level from being assigned. Automatic minimum-evidence checks must determine whether a result can be awarded; a teacher-review flag is not a substitute.

Relevant code: [finalization](../apps/web/src/app/api/placement/route.ts#L189), [scoring thresholds](../apps/web/src/lib/placement-test.ts#L163).

### P1: English accepts answers after its declared deadline

A GET response issued a twenty-minute `expiresAt`. With the mocked server clock advanced to `expiresAt + 1`, posting the offered answer still returned HTTP 200 and another question. Both answer handling and finalization need server-owned deadline semantics. Timeout must score only previously accepted evidence and preserve the original deadline.

Relevant code: [answer handler](../apps/web/src/app/api/placement/route.ts#L151), [token verification](../apps/web/src/lib/placement-attempt-token.ts). Japanese already has explicit expiry and insufficient-evidence handling worth retaining.

### P2: Both routing policies differ from the requested progression

English starts too high for the requested A1-first experience, changes after every answer, and cycles four independent ladders. Japanese's first kana item is N5, but the next adaptive item begins at N3, with immediate demotion after a mistake. The audit does not silently alter the published Japanese v1 constants: new rules require a new policy/scoring version so old attempts keep their original interpretation.

Relevant code: [English routing](../apps/web/src/lib/placement-adaptive.ts), [Japanese routing](../apps/web/src/lib/japanese-placement/adaptive.ts#L16), [published rubric](japanese-placement-rubric.md).

### P2: English's final decision must use demonstrated difficulty

The weighted-percentage scorer needs an explicit evidence rule for the difficulty actually demonstrated. An easy question's correct answer cannot independently establish advanced ability. The final result should reflect the best confirmed band across relevant skills, with documented mapping to the app's English levels/sublevels. It must not simply use the last or highest question reached.

Japanese already requires multiple independent reading successes, sentence-building evidence and several domains. Preserve that distinction between a routing probe and a confirmed placement.

## Recommended next policy

Implement the same understandable routing pattern for both languages, with their own banks, scales and final-result rules:

1. Start the main ladder with an N5 Japanese grammar/vocabulary item or A1 English item. An N5 kana check alone must not promote a learner into an advanced band. Fixed foundation checks can remain outside the main ladder.
2. At the lowest band, one correct main-ladder answer can probe the next band, including after returning to the floor. This reproduces both N5-to-N4 transitions in the owner's example. It is a routing shortcut, not a confirmed placement award.
3. Stay at the current band after one mistake. Two consecutive misses at that band move the main target down by one band. Counters must refer to the same main band; unrelated lower-band or foundation items cannot complete a higher-band streak.
4. Normally require two consecutive correct answers to try the next band. Following conflicting evidence at that band, require one additional correct confirmation. Cap that requirement at three; an earlier error must not create an ever-growing penalty. Clear the confirmation requirement once that band is confirmed.
5. Keep all accepted evidence. A later mistake must not erase previously established lower-band evidence. Final placement uses the highest sufficiently confirmed band and the language-specific domain requirements.
6. Keep the twenty-minute deadline and initial 24-question cap while checking that the revised routing can collect enough reading/construction evidence. At expiry, English needs at least 15 accepted answers and required skill coverage to award a difficulty-aware level; Japanese retains its separate evidence and reading/construction requirements. Apply a bounded penalty for timeout-unanswered questions to eligible results. Insufficient evidence permits a retry or a clearly identified lowest-level starting option. No recordings, free-text marking or individual teacher review are added.
7. Reuse one small routing primitive if the mechanics are actually shared. Keep Japanese/English content, grading, scale interpretation, evidence requirements and historical contracts independent. Do not copy either assessment engine or duplicate its persistence/timer logic.

This proposal reproduces the owner's example: the initial N5 success probes N4; two N4 misses drop to N5; success there returns to N4; three N4 successes confirm the uncertain band and then probe N3. These are proposed rules, not behavior delivered in this audit.

### Timeout evidence and penalty — owner correction

The English minimum is 15 accepted, valid responses, including incorrect responses; it is not a requirement to answer 15 correctly. Late/invalid submissions do not count. Preserve coverage of all four English skill areas, with at least three responses per area as the proposed coverage floor. Japanese's minimum is not changed by the English-specific correction.

For an eligible timed-out attempt, calculate the level evidence from actual item difficulty, correctness and skill coverage, then apply an explicit completion penalty. More timeout-unanswered questions must never produce a smaller penalty when other evidence is equal. The penalty must be bounded so completion speed contributes without overwhelming demonstrated proficiency. Store the unadjusted evidence, completion count, timeout reason and applied adjustment in the result so the estimate can be explained. The [v2 numerical rule](english-placement-scoring.md#bounded-timeout-penalty) subtracts up to ten points from the app index, with at most one app sub-level reduction and a lowest-level floor; no researched percentage or native-speaker speed norm is claimed.

Do not assign fabricated difficulties or answer keys to adaptive items that were never served. Do not count unanswered work as both full incorrect answers and an additional timeout penalty. Successful completion has no timeout penalty, and bank exhaustion/unavailability must not be mislabeled as learner slowness. The below-minimum path must not invent a measured level: allow retry, or distinguish an elected lowest-level starting point from an assessment award.

This correction supersedes the earlier statement that unanswered questions should have no penalty. It does not reintroduce mandatory pilot collection. [ETS's missing-response research](https://www.ets.org/research/policy_research_reports/publications/report/1996/hxus.html) supports accounting for how missing responses arise. [ETS's speededness research](https://www.ets.org/research/policy_research_reports/publications/report/1976/ibxu.html) shows that the relevance of speed depends on the skill/task; these sources do not establish this app's penalty weight or minimum-answer threshold.

### TDD and implementation order

The initial English expired-answer/premature-result guards, v2 evidence/penalty correction and [versioned staircase/Japanese timeout treatment](placement-staircase.md) are delivered through TDD red/green. Both languages reproduce the owner's exact sequence; isolated PostgreSQL tests verify new Japanese result storage, retries and active/completed legacy compatibility. Guarded flashcard DRAFT refresh precedes section 6 cross-product journeys. English persistent attempt/once-only finalization remains separate known work.

The test matrix must cover floor/ceiling behavior, each supported proficiency profile, a single lapse, mixed and alternating answers, confirmation reset, skips versus incorrect answers, domain coverage, duplicate/passages exclusions, bank exhaustion, incomplete finish, exact deadline/late answers, concurrent identical retries, reload/resume and historical bank/policy compatibility. Add English 14/15/23/24-answer boundaries, eligible/ineligible coverage, monotonic bounded penalties, no double penalty, missing-question infrastructure failures and easy-item result ceilings. Verify all-correct high-level learners can collect sufficient evidence within the question/time budget. Preserve Japanese's existing independent reading/construction requirements. Use Impeccable for any eventual interface or result-copy changes.

Do not claim empirical confidence percentages from these synthetic tests. Existing source-aligned question labels and explicit product rules support a provisional lesson recommendation; they do not reproduce official JLPT scoring.

## Research basis

[Levitt's primary paper](https://pubmed.ncbi.nlm.nih.gov/5541744/) describes transformed up/down methods, supporting the staircase-method terminology. Its psychoacoustic thresholds do not validate a particular language-test streak rule. [ETS's overview](https://www.ets.org/Media/Research/pdf/CBT-2011.pdf), especially pages 10–11 in the printed numbering, discusses adaptive classification for placement and the need to target a decision boundary while controlling content. This informs the recommendation to confirm a level rather than award the highest difficulty visited. The [official JLPT FAQ](https://www.jlpt.jp/sp/e/faq/) explains that its scaled scores use item response theory and the response pattern; this app must not present a staircase-derived result as an official scaled-score conversion. No new in-house pilot prerequisite is proposed.

## Verification and boundaries

- Read-only live-bank inventory: 2,000 English questions; 470 Japanese questions, with 220 eligible and the unchanged published version-3 digest.
- Production routing/scoring functions exercised offline against those snapshots, including the actual eight-step traces above and the two-easy-item scoring counterexample.
- Four isolated English API characterization probes reproduced the current starting band, early Advanced 3 award, expired-answer acceptance and zero-evidence Beginner 1 award. Their passing assertions document existing defects; they are not fixed-behavior regression passes. Auth/persistence were mocked; no profile was actually written.
- All 44 existing Japanese rubric/adaptive/bank integration tests passed. The ordinary English test harness was not invoked because it can seed the application database.
- `yarn japanese-content:study` verified the complete reviewed flashcard import plan without database access: 10,291 canonical cards, 10,307 source identities and five levels, digest `d9a72223da0534a2bbec995f8e26a508f1dd678c3c39f9d958607484207457b2`.

The existing application draft still points at `ja-study:65d489aaddd1c7449de1abba1edf298c65fe0dc095b396032f5dde8b88e1c7a0`. The current importer explicitly refuses replacing an existing different snapshot. Completing the planned refresh therefore needs a deliberate guarded update in that existing import workflow, with TDD, immutable old provenance, expected-current-snapshot comparison and stable canonical identities. It is queued alongside this corrective placement work; no deletion, bypass, refresh or publication was performed during the audit.

No production assessment/import code changed. No learner state, bank, policy, publication or migration changed. Nothing staged, committed or pushed. All task-owned audit/test processes exited and the read-only database client closed. No preview server or task port was started.
