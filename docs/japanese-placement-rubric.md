# Japanese lesson-placement rubric v1

Implemented 2026-10-23 for section 4e. This is the explicit product policy chosen after the user removed an in-house pilot as a release prerequisite. It uses published JLPT task/competence references and licensed question sources for provisional lesson guidance. Its numerical routing and decision rules below are designed product rules, not empirically fitted parameters or official JLPT pass-mark conversions.

**Subsequent release:** the owner authorized publication on 2026-10-23, and bank version 3 is now active locally. See the [release record](japanese-placement-release.md) for the exact snapshot, explicit AI-assisted approval method, public credits, current verification and cleanup. Unpublished/zero-bank statements below describe the earlier policy implementation increment; the raw authoring loader still intentionally returns an unapproved draft.

## Versions and source alignment

Schema **5**, policy `japanese-jlpt-rubric-v1`, scoring `japanese-reading-writing-rubric-v1`. The same Japanese engine, grader, attempt transitions, persistence service and learner/teacher result component support it. Schemas 3/4 keep their original posterior policy, exact hashes, response order, resumes and materialized results. No English thresholds or engine are imported.

The source framework is the [official competence descriptions](https://www.jlpt.jp/e/about/levelsummary.html) and [task-type guidance](https://www.jlpt.jp/e/guideline/testsections.html). These support a progression from basic everyday text to interpretation of complex arguments and viewpoints. The [scoring-direction correction](japanese-placement-scoring-direction.md) explains the distinction between alignment and statistical calibration.

`apps/web/data/japanese-placement/rubric-alignment.json` binds fifty explicit anchor rows to the exact unchanged schema-v4 catalog digest `33ed9d52018f5a2d4cd615fbe2cfa3472fc303112eb6c2076c37516c52e40037`. Each row names the item ID/revision and a task-demand rationale. Five reading anchors use distinct passages at each source band, and five constructions check contextual grammatical composition at each band. This is documented AI-assisted alignment, not an independent human approval or measured difficulty.

Advanced reading anchors emphasize interpreting arguments, intended meaning and relationships between viewpoints. For example, N2 uses the garden/translation comparisons and repair/archive arguments; N1 uses abstract note-taking/incentive/rules arguments and paired library/picture-book texts. Direct-detail N2 seed questions and two-tile N1 constructions are retained as supplementary content rather than advanced anchors. Construction anchors test constrained grammatical composition in context; they do not establish free-writing ability.

The shared compiler retains all **470 items**, marking 50 as `anchor` and 420 as `support`. The current serving pool consists of those fifty reading/construction anchors plus 170 kana/kanji/vocabulary/grammar choices: **220 eligible items**. The other 250 reading/construction items remain in the private catalog for further curation; they are not selected by this rubric. No second question copy is maintained. The compiler adds private roles/rationales, source references and policy while leaving every `calibration` null and all review records null.

The resulting v5 catalog is bank version 3 with digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`. Native digests bind alignment roles/rationales, references, policy and item content. Any change invalidates the existing content/rights/placement approvals. Policy v1 behavior is versioned code: changing its constants requires a new policy/scoring version rather than silently changing existing attempts.

## Timing, coverage and routing

The server deadline remains twenty minutes. Initial quotas total 24: kana 2, kanji-reading 4, vocabulary 4, grammar 4, reading 5 and sentence construction 5. Selection balances each domain's quota completion before choosing difficulty. Repeated questions and repeated reading passages are excluded, including after a skip.

The non-kana target starts at **N3**. Two qualifying correct answers advance it one band, up to N1. A wrong answer or explicit skip moves it down to one band below the presented item's band, never raising the current target and never routing below N5. A promotion resets the streak; a wrong/skip resets it. Kana does not change this target. A correct fallback question below the current target does not advance it.

Choose the unused eligible item closest to the target within the bank's supported bands. Snapshot sequence breaks equal-distance ties. Reading and construction select only explicit anchors. This is deterministic routing using source-aligned levels; it does not calculate entropy, posterior probabilities or learned difficulty. Resume replays saved responses through the same functions.

Readiness requires enough distinct eligible items for every quota and enough distinct anchors per supported band to sustain that domain's quota. This prevents a fixed-difficulty path from exhausting a small anchor set. Construction anchors with a nominal uniform guessing rate above one quarter are rejected by the shared visible-permutation calculation. That arithmetic screen does not validate an item's actual difficulty.

## Automatic result rules

Before assigning a band, require at least **12 non-skip answers across four domains**, including reading and construction. Skips remain distinct in the domain summary and do not meet this minimum. An unfinished attempt is scored only after the deadline; the same evidence rules then apply.

Evaluate supported bands from highest to lowest. For each candidate:

1. Include all non-kana responses at that band. Also include correct responses on harder tasks. A harder failure does not disprove success at an easier band.
2. Require at least **four correct responses**, spanning at least **three non-kana domains**.
3. Require at least **two correct independent reading anchors** and **one correct construction anchor** at that band or higher.
4. Require correct responses to comprise at least **two thirds** of the candidate's included responses. Included skips count against that proportion; unanswered/unreached items do not enter it.

Award the highest supported candidate meeting all four rules. One advanced word, one passage answer or kana performance cannot establish an advanced band.

If no band is confirmed, award **BELOW_N5** only when there are at least four attempted non-kana N5 tasks with less than two-thirds success, including two incorrect independent N5 reading anchors and an incorrect N5 construction anchor, and there is no successful reading/construction anchor anywhere in the attempt. Skips alone cannot establish below-N5 performance.

Other unconfirmed or conflicting profiles return `insufficient_evidence / unconfirmed_reading_or_construction`. Sparse answers/domains retain `too_few_answers_or_domains`. This avoids labelling a learner below N5 simply because construction and reading results disagree. Both outcomes are automatic; there is no student response-review queue.

An awarded result contains `basis: jlpt_aligned_rules`, its provisional band and the ordinary domain breakdown. It has **no statistical model range**. Historical posterior estimates retain their original range. The shared learner/teacher renderer explains the rule-based estimate in English/Japanese and gives a separate explanation for unconfirmed skill evidence after a completed assessment.

## Storage and reproduction

Migration `20261023010000_japanese_placement_rubric` extends the existing pool, version/policy and response trigger checks to v5. It retains the same row lock, deadline, response budget and passage protections; it does not rewrite snapshots, responses or completed results. It is tested in disposable schemas and applied locally. No question bank or synthetic learner data is published to application tables.

From the repository root:

```sh
yarn japanese-placement:audit --rubric --json
yarn japanese-placement:audit --rubric --strict
yarn japanese-placement:content --rubric-bank
yarn test:japanese-placement
yarn test:japanese-placement:db
```

The audit's `--rubric` flag and content export's `--rubric-bank` explicitly select v5. Existing unflagged exports and optional pilot manifests retain the byte-compatible v4 source catalog. Exporting a draft does not publish it. V5 readiness no longer requires empirical likelihoods or an in-house pilot; its remaining digest-bound checks concern bank content, rights and placement-policy alignment. The current bank has no fabricated review signoffs and remains unpublished.

Mechanics tests exercise all six consistent source-band profiles on both synthetic fixtures and the actual catalog with null likelihoods. Test-only signoffs exist only in tests/disposable schemas. These checks demonstrate implementation behavior, not measured proficiency accuracy. The optional offline pilot remains available for future research and is outside the required release path.

## Verification and browser limits

**Subsequent verification:** the [browser follow-up](japanese-placement-browser.md) reproduces and resolves the local origin/setup failures recorded below. The complete local student/teacher path and bilingual capture matrix now pass, with a sentence-draft persistence fix. The paragraphs below remain the history of the earlier rubric implementation increment.

TDD red/green demonstrated failure before v5/schema support, catalog compilation, result projection/copy and the additive migration. **244 Japanese placement unit/API/component tests, eight Japanese PostgreSQL tests, 367 mirror regressions and 35 corpus tests pass (654 total)**. TypeScript, focused ESLint, checksum/coverage strict checks and whitespace checks pass. V5 publication strict mode correctly fails for its three pending bank checks. No production build was rerun in this increment.

The browser contract exercise for keyboard construction, resume, automatic completion/timeout and the new basis copy passes. The broader browser suite does **not** pass: the local dashboard lacks its expected authenticated assessment link, and Japanese-locale navigation enters a redirect loop. Root causes are not established here. Dev-login/OAuth settings were changed only for the task-owned preview process; no authentication or locale product code changed. The actual unavailable-bank/teacher browser journey and complete bilingual matrix remain unverified in this increment.

Two English full-app result captures are in `.impeccable/review/japanese-placement/`: `result-en-1440-light.png` and `result-en-390-dark.png`. Three isolated fixtures render the actual shared component with current app CSS/font classes: `rubric-fixture-ja-estimate-390-dark.png`, `rubric-fixture-ja-unconfirmed-524-light.png` and `rubric-fixture-en-unconfirmed-1440-light.png`. UTF-8 and overflow checks pass; English mobile and Japanese fixtures were visually inspected. These server-rendered fixtures establish layout/copy, not Japanese routing, hydration or real-bank delivery. Their completion-time placeholder is the expected unhydrated client formatter. The existing open ruled layout and tokens are preserved. Impeccable context loading failed; existing product/design/surface context and clarification/craft/polish references were read directly. No clean detector or independent finish-review claim is made.

Cleanup is verified: recorded task processes exited, port 3100 is released, owned QA users/related rows/product were removed, and temporary PostgreSQL schemas/connections plus application Japanese banks/attempts/responses are all zero. No commit, push or deployment was performed. Remaining release work includes bank content/rights/policy checks and real-bank browser journeys, including resolving the sign-in/locale failures above.
