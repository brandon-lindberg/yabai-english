# Japanese study prompts and progression — section 5g

Section 5g supplies the Japanese prompt compiler, automatic grader and read-only progression service. It builds on the [draft persistence contract](japanese-study-persistence.md). The local catalog remains unpublished, and this increment adds no study page, HTTP endpoint, review-saving operation or application database migration.

## Prompts and answer rules

`src/lib/study/japanese-prompts.ts` decodes the persisted `{schemaVersion, unit, records}` content using the existing vocabulary, kanji, dictionary-sense and phrase schemas. It checks canonical membership, source-level evidence and primary spelling/reading support. Records retain their source metadata; the compiler never unions merged members' answers.

There are four task types:

| Task | What the student sees | Answer source |
|---|---|---|
| Vocabulary meaning | Exact written form and its reading | That member's meanings |
| Vocabulary reading | Exact written form with meaning context | That member's primary reading for the supported pair |
| Kanji on-reading | Character and meaning context | Its verified on-reading set |
| Kanji kun-reading | Character and meaning context | Its verified kun-reading set |

These are automatically graded multiple-choice tasks. Meaning prompts include the specific reading to distinguish homographs; reading prompts omit the answer reading. Kana-only forms do not receive a task whose answer is already visible. Missing on/kun categories are absent rather than synthesized. Complete on/kun notation survives in choices/feedback, and name readings remain separately identified in feedback rather than entering the on/kun answer sets.

The question schema contains bilingual instructions, the stimulus, source/introduction/form bands, usage metadata and two to four opaque choices. `CompiledJapaneseStudyPrompt.question` is the learner projection. Its `correctChoiceId` and feedback are server-only context. The grader requires the exact prompt ID and an offered choice ID, rejects extra fields and stale/unoffered responses, and releases feedback only after a valid submission. It accepts no client-provided correctness, canonical answer or source record.

Distractors come from the same task's source pool at or below the selected study band. The compiler excludes the current canonical unit, equivalent reading forms, accepted meanings, dictionary siblings and other entries whose retained meaning sets overlap. Hiragana/katakana equivalence and dot/hyphen reading notation cannot turn a valid pronunciation into a wrong alternative. Original notation stays visible. A sparse pool may yield fewer options; fewer than two choices fails instead of generating fallback teaching material. Semantic distractor suitability remains part of content review; mechanical source checks do not certify every contrast.

The existing generic deterministic shuffle is reused. The existing canonical JSON function is extracted from the assessment module into one shared utility and re-exported for compatibility. Canonical sorting/serialization keeps prompt identities stable across file input, JSONB key ordering and database result order. Assessment content and scoring do not change.

## Form levels and complete coverage

Twenty-five units have an introduction band earlier than every member's original source level. The compiler resolves their exact eligible reference forms. For example, an N5 kana-only reference licenses せっけん without treating the source's 石鹸 spelling as N5 content. Reference rows, readings, membership, source-file identity, scope and level must match; absent/stale reference context fails.

Six member spellings are deferred at their canonical unit's introduction band. They remain available at their evidenced later band through an explicit server-selected `studyBand`; no source member is dropped. The default bank projection uses introduction forms. `members`, `tasks` and `create` can select a particular eligible member and band without flattening its readings/meanings. A future HTTP layer must derive that band from authorized progression, never directly trust a client-provided band.

The full pinned corpus produces **19,016 default unit/task projections across all 10,291 units**:

| Task | Default projections |
|---|---:|
| Vocabulary meaning | 7,908 |
| Vocabulary reading | 6,748 |
| Kanji on-reading | 2,372 |
| Kanji kun-reading | 1,988 |

All **10,307 source members** also pass individual prompt/grading checks at their supported study bands. Eleven kanji lack an on-reading category and 395 lack a kun-reading category; the source's legitimate absences are preserved. These counts describe the pinned community corpus and compiler mechanics, not an exhaustive official JLPT list or learner calibration.

## Progression

`src/lib/study/japanese-progression.ts` defines study access without changing placement results:

- N5 opens by default.
- The latest completed Japanese assessment's validated estimate opens through its band, including lower bands. Below-N5, unavailable, malformed, mismatched-attempt and insufficient-evidence results grant no additional placement access. An older estimate is not substituted for a newer inconclusive result.
- All units in a nonempty level must be currently classified as mastered to open the next band. The compiler reuses the existing practice rollups/classifier: at least eight attempts, rounded accuracy of at least 88%, and a correct streak of at least five. One correct answer or an empty deck does not complete a level.
- Persisted earned access and completed levels preserve access when a later placement is inconclusive or current mastery falls. The read service does not itself persist those milestones; the next review-saving increment must do so transactionally.

The read service checks the current account, requiring an active Japanese student, then requires a published Japanese track before reading placement or progress. It scopes progress/cards to that track and reads only Japanese assessment history. Existing English placement/profile fields and English exit assessments have no authority here. No teacher pre-review, recording or new placement exam is introduced.

## Commands and verification

From the repository root:

```sh
yarn test:study
yarn test:study:db
yarn japanese-content:prompts
```

The audit command verifies the exact cached artifact hashes, compiles all default projections, tests correct/incorrect grading, accounts for every source member and reports task counts. It reads no credentials or database, writes no files and accepts no publication flags. The full-corpus test is optional when the downloaded artifacts are absent; the fixture tests remain offline.

TDD red/green covers missing adapters/policy, member and pair restrictions, protected keys, malformed/stale responses, on/kun separation, notation equivalence, distractor context/bands, reference-only introduction forms, later member access and JSONB/order stability. PostgreSQL fixtures verify draft/actor boundaries, English placement independence, mastery versus first-touch completion, latest assessment selection and retained access without changing assessment/English history. Fixtures are confined to disposable schemas.

**131 study tests, two PostgreSQL study tests, 116 content tests, 262 Japanese assessment tests, eight PostgreSQL assessment tests and 372 mirror regressions pass (891 total).** TypeScript, focused ESLint, whitespace and the production build pass. The published assessment digest and local catalog publication/progress state are unchanged. No task-owned preview server or browser resources were introduced; temporary schemas/connections and task processes are cleaned up before handoff.

Impeccable's clarification/hardening guidance informed the bilingual task instructions and context requirements. Its context launcher was unavailable; existing PRODUCT.md/DESIGN.md and the relevant skill references were read directly. The current mirror brief governs the product scope. No visual surface or style changes occur here, so browser/visual review belongs to the interface increment.

## Next increment

Connect the compiler and progression service to an authenticated study queue and review-saving flow, reusing the scheduler and shared review-state logic. Bind each served prompt to its learner, catalog version and server-owned context; provide retry-safe review persistence, revalidate subject/publication/level access on writes, and save earned/completed milestones atomically. Never accept a private compiled prompt, answer key or unrestricted study band from the browser. Then implement the shared study interface with Impeccable and bounded visual verification.

Learner-facing usage-code translations, sense/example review and full-corpus publication remain separate work. Japanese source examples and attribution are retained; no replacement examples or approvals are invented. Brandon retains all commits and pushes.

Section 5h now provides the [authenticated queue and saved-review API](japanese-study-api.md). The next implementation surface is the shared learner study interface using Impeccable.
