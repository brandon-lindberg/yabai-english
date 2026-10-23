# Japanese reading and sentence-building placement

Section 4 of [the mirror plan](../MIRROR_PLAN.md). Scope corrected 2026-10-22.

## Product target

Give teachers an approximate Japanese reading/writing level before their first conversation with a student. The student completes a text-only, automatically scored assessment. “Writing” means arranging supplied word or phrase tiles into a sentence, in the style of Duolingo sentence-building exercises. Every response is scored by the server. There is no free-text submission, individual response review, recording, listening task or oral-confirmation step.

The teacher receives an automatically generated starting-level estimate and a domain breakdown. The estimate is provisional guidance for planning a lesson. Completing an attempt never waits for a teacher to mark it. Checking question-bank content before release is a separate quality process, not a per-student workflow.

Japanese placement owns its items, banks, progression, attempts, scoring and results. It does not import English placement algorithms, level enums, thresholds, question banks or progress models.

## Required assessment flow — correction of 2026-10-22

Match the English assessment's format: a timer, one question at a time, difficulty that adapts as answers arrive, and an automatically awarded level at completion. The existing English format has a 20-minute limit and 24 questions; use those as the initial Japanese format target, then validate timing and coverage with Japanese learners. Japanese difficulty anchors, domain routing and level rules must be designed independently. The English CEFR ladder and scoring thresholds are not Japanese assessment rules.

The server owns the start time and deadline. Resuming, reloading, opening another tab or retrying a request must preserve the original deadline. The learner flow automatically finishes when time expires; the server must enforce expiry as well, finalize once using accepted responses, and prevent late answers from altering the result. Completed results retain their original timing, bank and scoring versions.

Normal completion must award an approximate Japanese reading/writing study level immediately. Partial/expired attempts need an explicit evidence policy and confidence limits; an attempt with no usable answers must not invent a proficiency level. There is no individual teacher review between completion and the result.

**Implementation status:** section 4c now supplies server-enforced timing, adaptive progression and automatic level assignment. The earlier fixed survey has been replaced, rather than retained as a second engine. The learner/teacher screens remain section 4d. A calibrated, approved Japanese bank is still required before learners can start; the twelve draft samples are not published.

## Coverage and question formats

| Domain | Question format | Evidence |
| --- | --- | --- |
| Kana | Text-based selection | Hiragana and katakana recognition; no audio dependence. |
| Kanji readings | Text-based selection in context | Reading words and inflected forms, rather than applying every character reading to every compound. |
| Vocabulary | Text-based selection | Meanings and word combinations in context. |
| Grammar | Text-based selection | Grammatical relationships and usage. |
| Reading | Text passages with selected answers | Information retrieval, purpose, relationships and interpretation. |
| Writing / sentence building | Arrange all supplied tiles | Japanese sentence structure, particle placement and word order. This measures constrained construction, not free composition or handwriting. |

Assembly items have stable tile identities and one or more accepted orders. Every tile must appear exactly once in a submitted answer. Different valid orders can be registered explicitly; identical particles with different tile ids are interchangeable by their visible text. Unknown, repeated or missing tiles are invalid submissions. A complete but incorrect order is scored incorrect automatically. A skip remains separate from an incorrect answer.

Use kana, kanji and vocabulary appropriate to the task being measured. A written grammar question can also depend on literacy; inspect those confounds when designing the bank. Instructions and distractors must avoid exposing the completed Japanese answer. Sentence-building UI will support both pointer and keyboard operation through the same response contract.

## Starting-level interpretation

The intended output is an approximate reading/writing study band, with N5–N1 references where supported by the Japanese bank, plus below-N5 and insufficient-evidence outcomes. It is not an official JLPT result or a claim about speaking/listening. Sentence assembly does not establish unrestricted writing ability.

The Japanese-specific scoring rules and difficulty anchors must be versioned with the bank and checked against actual learner results before release. The [JLPT scoring explanation](https://www.jlpt.jp/e/about/pdf/scaledscore_e.pdf) does not justify converting this app's correct-answer percentage into an official scaled score. No English thresholds will be reused.

**Current implementation:** completion automatically returns a provisional study band and domain breakdown when the saved answers meet the bank’s evidence requirements. Empty, all-skipped or sparsely covered attempts return `insufficient_evidence`; they do not invent a level. Calibration is now a bank publication requirement, rather than an `unavailable / bank_not_calibrated` result after a learner completes the assessment. No individual student attempt enters a marking queue.

## Delivered core

- Schema version 3 covers the six text-based domains, multiple-choice items and sentence assemblies. Answer keys, accepted tile orders, source references and explanations remain server-side.
- Exact exercise duplication checks include choices or tiles. Tile ids must be unique, but repeated words/particles are permitted. Accepted orders must each use the complete tile set once; equivalent duplicate answer orders are rejected.
- Full bank hashes bind content, accepted answers, provenance, difficulty/calibration, assessment policy and tie-breaking order to the same snapshot. Content and rights checks concern the reusable question bank, never an individual student's answers.
- Immutable, serializable attempt transitions bind each attempt to its original bank. Invalid types, out-of-order responses and changed bank snapshots are rejected. Identical retries are idempotent; changed submissions cannot overwrite a recorded answer.
- Results score all six domains automatically. They contain no free-writing samples, pending student-review status or oral-confirmation requirement. Historical summaries remain available with their original content snapshot.
- Twelve original, AI-assisted draft questions include two sentence assemblies. They demonstrate formats, not a validated test length, complete N5–N1 coverage or a released assessment. The draft bank still needs content and rights checks before publication.

The earlier audio machinery and free-text draft have been removed. No English assessment implementation has been copied or modified. The learner and teacher surfaces now use the storage/access layer below.

## Timed adaptive engine — section 4c

- Each attempt persists its original start, absolute deadline, question budget, policy revision and scoring revision. The deadline is exactly 20 minutes after the start and is immutable in PostgreSQL. Active views expose `expiresAt`, `timeLimitSec` and `serverNow`; the question budget comes from the bank's domain quotas, not the size of its item pool. The initial learner format target is 24 questions. The synthetic 24-question test bank uses four slots per domain; six-question fixtures exercise mechanics only.
- Question difficulty is authored as an N5–N1 reference anchor plus six response likelihoods, ordered from below N5 through N1. The engine starts with equal weights over those six study bands and updates them using each saved correct/incorrect response pattern. An explicit “not sure” response lowers the model estimate while remaining separate from incorrect answers in the summary and from usable answers in minimum-evidence checks. Unanswered items have no model effect. Kana likelihoods must be equal across N5–N1, so kana alone cannot distinguish advanced ability.
- Routing first balances progress against each domain's quota, then chooses the unused item with the largest expected reduction in posterior entropy. The final reading and sentence-building slots probe the nearest available anchor to the current candidate band. Snapshot order breaks ties deterministically. Resume replays the saved responses through this one implementation; no second adaptive-state JSON is maintained.
- A result uses the model's median band, capped by the highest declared reference band and the difficulty range actually administered in both reading and sentence building. The full answer pattern determines the estimate; a wrong construction answer does not by itself imply below-N5 proficiency. The result includes a provisional flag and the model's 5th–95th percentile range. This range is model uncertainty, not a validated statistical confidence interval or an official JLPT score.
- Level assignment requires the bank's minimum usable-answer and domain counts, including reading and sentence-building answers. `question_limit` and `time_limit` distinguish ordinary completion from expiry. Timeout summaries preserve unanswered, skipped and wrong answers separately. Completion time is the last accepted answer for ordinary completion, or the original deadline for expiry.
- Starts, learner reads/submissions and authorized teacher reads finalize expired attempts under the same per-learner lock. No worker is needed: if nobody requests the attempt at the deadline, its row is finalized on the next authorized interaction, using the original deadline as completion time. No response at or after that deadline is accepted. The section 4d countdown fetches the completed view automatically when time runs out. Repeated timeout requests return the same materialized result.
- The additive migration `20261022010000_japanese_placement_adaptive` preserves old completed results without parsing/regrading their old banks. Older active surveys return `ATTEMPT_VERSION_UNSUPPORTED`; a new request can abandon one and start on a supported, published bank. If no suitable bank exists, the old attempt is retained and the new start returns `BANK_UNAVAILABLE`. No applied migration was rewritten.

**Bank readiness:** text/answer quality, rights and placement-calibration approvals each bind to the complete bank digest. Every served item needs valid ordered likelihoods; each core domain needs anchors for every declared reference band, and enough distinct items for its quota. Null calibration and null assessment policy are allowed only while authoring. Changing calibration or policy invalidates approvals. The test probabilities and signoffs are explicitly synthetic; passing these tests does not validate a Japanese proficiency instrument. Real learner evidence, timing checks and content work remain release requirements.

Verification: demonstrated red/green cycles; 85 isolated Japanese unit/API tests and five real PostgreSQL tests pass, including all six synthetic band cases, mixed skill evidence, deadline boundaries, concurrent expiry, teacher-triggered completion after disconnect, 24-question completion from a larger pool, history preservation and additive migration of v2 rows. The mirror/corpus suites, TypeScript, focused ESLint, Prisma validation/schema diff and production build also pass. The new migration is applied locally; no bank or learner test data was published. Production deployment remains release work.

## Source research

The expanded [2026-10-22 repository research](japanese-assessment-research.md) supersedes the initial shortlist below. It records inspected content paths, source terms, counts and pinned candidate revisions. The accepted [N2/N3 solution](japanese-n2-n3-solution.md) supplies 120 private draft items; later increments add 180 N5/N4/N1 reading/construction items and 170 kana/word-level choices. The catalog now contains 470 draft items: twenty passages with forty reading keys, twenty sentence assemblies and ten each kanji-reading, vocabulary and grammar choices per level, plus twenty N5 kana checks. [The content handoff](japanese-placement-content.md) documents sources, adaptations, dictionary evidence, selection ledgers and shared import checks. Full-bank integration, linguistic validation and learner calibration remain section 4e work. There are no published questions or invented calibrations.

No third-party questions, passages or repository code have been imported. The checked sources did not establish a complete, suitably licensed assessment bank; this is a bounded search result, not a claim that none exists.

| Source | Finding and decision |
| --- | --- |
| [Official JLPT FAQ](https://www.jlpt.jp/e/faq/index.html) and [site policy](https://www.jlpt.jp/e/policy.html) | Questions and passages have controlled rights. Modern exhaustive vocabulary/kanji/grammar specifications are not published. Reference task categories; do not copy official questions or call a community corpus an official exhaustive inventory. |
| [JF Standard](https://www.jfstandard.jpf.go.jp/summaryen/ja/render.do) | Distinguishes communicative tasks from supporting language knowledge. This app's written assessment has a narrower purpose. No official descriptors are imported. |
| [Irodori FAQ](https://www.irodori.jpf.go.jp/en/faq.html) and [usage terms](https://www.irodori.jpf.go.jp/en/privacy.html) | Teaching use has specific permissions, while unrelated new materials and public derivatives have conditions. Useful lesson reference; no repackaged assessment content adopted. |
| [Hikma core](https://github.com/hikma-exam/core) | An architecture specification, not an implemented question bank. Software/specification licensing does not approve separate datasets. No implementation or dataset adopted. |
| [JLPT MAX Deck notice](https://github.com/truthyblue/jlpt-max-deck/blob/main/NOTICE) | Code and generated content have different rights. Do not infer a general deck redistribution grant from the software license. |
| NINJAL grammar reference, [DOI candidate](https://doi.org/10.15084/0002000610), discovered through a [Yomitan conversion](https://github.com/bee-san/yomitan-dictionaries) | Primary content/license verification was rate limited in the research pass. Remains a research lead, with no import or license approval. |

The section 1 dictionary/corpus audit can support later authoring once its unresolved queues are addressed. A vocabulary list alone is not a placement assessment.

## Storage and access layer — section 4b

The storage migration `20261022000000_japanese_placement_storage` and its section 4c timing upgrade are verified in isolated PostgreSQL schemas and applied to the local application database. It creates Japanese-only bank snapshots, attempts and response rows. No question bank or learner fixture was published to the application database. Production migration/deployment remains release work.

Bank snapshots retain content, digest, version, item count and publication/revocation times. Attempts retain the bank reference, schema/scoring/policy versions, start/deadline, question budget and a materialized completion result. Responses are stored once in order; an attempt's in-memory state is reconstructed from them rather than copied into another JSON column. Database constraints protect identities, one active attempt per learner, unique response positions/items and valid completion state. Triggers reject edited snapshots, responses and finished results. Account deletion can still cascade through a learner's assessment rows.

Student operations run in a transaction with a per-learner [PostgreSQL advisory lock](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS). This serializes concurrent starts, reads and submissions. The final response and result commit together; a failure rolls both back. Every operation rereads the account from the database. A stale session role or subject cannot authorize a request. Active Japanese-learning students can access only their own attempts; a subject change preserves the data and pauses access until Japanese is selected again.

| Method and route | Behavior |
| --- | --- |
| `GET /api/japanese-placement/attempts` | Return the learner's latest attempt, or `attempt: null`. |
| `POST /api/japanese-placement/attempts` | Start using `{ requestId: UUID }`. The same request id returns the same attempt, including after completion. |
| `GET /api/japanese-placement/attempts/[attemptId]` | Resume/read an owned attempt. |
| `POST /api/japanese-placement/attempts/[attemptId]/responses` | Submit one choice, sentence assembly or skip; server identity/time and scoring are authoritative. |
| `GET /api/teacher/students/[studentId]/japanese-placement` | Return the latest completed result when the teacher has an eligible private Japanese lesson with that student. |

A response body uses the same strict input schema as the core, without `submittedAt`. Choice: `{ kind: "answer", itemId, choiceId }`. Sentence assembly: `{ kind: "sentence_assembly", itemId, tileIds }`. Skip: `{ kind: "skip", itemId, reason: "not_sure" }`. Unknown identity, state, score and timestamp fields are rejected. Mutation requests require JSON, reject cross-site origins and have a 16 KiB body limit. All responses use `Cache-Control: private, no-store`.

Views expose attempt id/status, responded/total progress (the existing `answered` view field counts saved responses, including skips), timing, the current projected question and a completed result. Within the result, `responded` counts saved responses and `answered` counts non-skipped answers. Keys, accepted orders, bank content and stored responses are not returned. Teacher reads expose only the completed result. Teacher access requires a confirmed or completed **private Japanese booking** with the student. A teacher-created roster entry, English lesson, unpaid booking, cancelled lesson or unrelated teacher account does not confer access. Historical Japanese results remain available through eligible Japanese bookings even if the learner changes their current subject.

A different start request while an active attempt exists returns `409 ACTIVE_ATTEMPT_EXISTS`; the UI fetches/resumes the existing attempt. An identical response retry does not append again. Changed answers or out-of-order submissions return 409 while active. Once timed out, any structurally valid late response returns the completed timeout view without appending or changing an answer; ordinary completed attempts still reject changed responses. Valid complete but wrong answers are automatically scored incorrect. No bank, or a revoked active bank, returns 503. A new start can retire a revoked active attempt as `ABANDONED` and use an available replacement bank. Completed results and exact completion retries remain readable after bank revocation; they are not regraded against current content or scoring code.

`publishJapaneseBank` is an explicit server-side operation for an approved immutable snapshot. It cannot overwrite a published version or silently restore a revoked snapshot. No HTTP publishing endpoint, seed or startup import publishes the draft samples. The application currently has no published Japanese bank, so starting an assessment returns `BANK_UNAVAILABLE` rather than serving unapproved material. The draft has no assessment policy, calibrated item likelihoods or content/rights/placement approvals; the engine does not substitute synthetic test data.

Verification includes the dedicated unit/API suite, real PostgreSQL concurrent retries/conflicts, completion rollback, publication/version preservation, subject/ownership/teacher boundaries, revocation/replacement, account deletion and unchanged legacy English placement data. A read-only Prisma diff finds no differences between the isolated migrated database and the model. All temporary schemas and connections are removed by one shared helper also used by the existing mirror migration test.

Run `yarn test:japanese-placement` without credentials or seeding. `yarn test:japanese-placement:db` explicitly opts into local PostgreSQL verification; it accepts `MIRROR_TEST_DATABASE_URL`, otherwise reads the local `.env`, refuses remote hosts and uses disposable schemas. The existing `yarn test:mirror:migration` uses the same runner/isolation code.

## Learner and teacher surfaces — section 4d

`/{locale}/japanese-placement` is a separate, authenticated Japanese-student route, with entry links in the student dashboard and header. It is independent of the English `canStartPlacement` cooldown. Opening the page resumes saved progress without starting a new timer; an explicit start begins a new attempt. Onboarding and subject guards follow the existing app shell, and the APIs still authorize against the current database account.

One question appears at a time, with responded/total progress and the remaining server-provided time budget. The display measures elapsed time with monotonic and wall clocks to account for device sleep without relying on the client's absolute clock. The server remains authoritative. Returning to the tab refreshes the saved state without clearing a same-question sentence draft. At expiry the UI disables submissions and fetches the final result automatically; an offline completion fetch offers manual recovery without a retry loop. The floating chat launcher is omitted on this assessment route so it cannot cover questions or results on mobile.

Sentence building uses ordinary, keyboard-operable buttons in visibly labelled sentence and word-tile groups. Learners can remove individual tiles, undo, clear or submit the complete tile set. Unique identities distinguish repeated text. No drag-and-drop, textbox, audio permission or upload is required. Choice and sentence submissions both use the shared public response contract; keys and accepted orders remain server-side.

An uncertain start retries the same request UUID. An uncertain answer freezes edits and retries the exact response; conflicts reload the server's saved question. Localized loading, network, unavailable-bank and unsupported-version states explain the next action. English and Japanese interface copy use the same components, independently of the Japanese question content.

The result leads with the provisional band, or explicitly reports insufficient evidence, then shows the model range, six-domain counts and completion time. It distinguishes skips and unanswered items. One result component serves the learner and the authorized teacher's student-profile page; the teacher variant has no learner controls or marking action. The existing confirmed/completed private Japanese booking boundary remains unchanged. Ineligible teachers receive no assessment section, and an eligible teacher with no completed result sees an empty state. Lesson-detail pages have not gained a separate assessment panel.

Verification uses 108 isolated Japanese tests, five PostgreSQL tests, 367 mirror regressions, 35 corpus tests and the existing PostgreSQL migration regression. Three browser tests cover the actual unpublished-bank state and eligible teacher empty state, the public question/result contract with keyboard sentence assembly and automatic timeout, and an opt-in 18-capture matrix at 390, 524 and 1440px across both themes/locales. Active questions and awarded bands in browser captures are intercepted contract fixtures; they do not publish a bank or establish Japanese proficiency validity. A completed teacher result is covered through the shared component and access tests; the teacher browser journey currently verifies the eligible empty state. TypeScript, focused ESLint and the final production build pass. The independent Impeccable finish review returned `ship` with no material fixes in the supplied scope. The detector launcher remained unavailable with permission denied after an escalated retry; no clean detector result is claimed. The [surface brief](design/japanese-placement.md) records visual compatibility and evidence limits.

From `apps/web`, create recorded local fixtures with `./node_modules/.bin/tsx scripts/mirror-journey-fixtures.ts create --japanese-placement`, then run the app on `localhost:3100` with the local development authentication configuration. Run `./node_modules/.bin/playwright test --config playwright.japanese-placement.config.ts`; add `JAPANESE_PLACEMENT_CAPTURE=1` for screenshots. Always run `./node_modules/.bin/tsx scripts/mirror-journey-fixtures.ts cleanup` and stop the task-owned server afterward. This optional fixture mode adds only owned accounts, offerings, a product and a qualifying private booking; it never inserts a question bank or assessment attempt.

## Remaining section 4 work

1. **Bank content and level validation:** expand beyond the twelve format samples to support the adaptive difficulty range. Finalize text questions, accepted sentence variants and source rights. Validate Japanese difficulty likelihoods, quotas, evidence minima and level interpretations against learner data before publication. Content/calibration QA occurs once per bank revision, not before each student lesson.
2. **Validation and release:** check length, coverage, ambiguity, floor/ceiling effects and level estimates using real learner data. After publication, verify real-bank browser start/resume/timeout/completion and the completed-result teacher journey. No teacher action is required to complete or score an individual attempt. Section 6 owns final cross-product release checks.

Section 4 remains in progress. The learner-facing page is implemented, but the assessment is unavailable until an approved bank is published. No draft bank has been published.
