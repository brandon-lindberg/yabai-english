# Japanese study queue and saved reviews

Section 5h of `MIRROR_PLAN.md`, 2026-10-23. Branch: `the-mirror`. Brandon owns commits and pushes.

## HTTP contract

All endpoints use the signed-in identity, reread the account's active student role and Japanese learning preference, and require the published Japanese track with its catalog snapshot. They return `Cache-Control: private, no-store`. The current local Japanese catalog remains **DRAFT**, so these endpoints currently return `503 STUDY_UNAVAILABLE` for eligible learners.

| Endpoint | Request | Response |
| --- | --- | --- |
| `GET /api/japanese-study` | No learner identifier | Read-only Japanese placement/access, level mastery, practice rollups and XP |
| `POST /api/japanese-study/queue` | `levelCode: N5…N1`; optional `limit: 1…50` (24), `focus: mixed/weak/mastered` (mixed), `kind: mixed/vocabulary/kanji` (mixed) | `{ levelCode, cards: [{ question, expiresAt }] }` |
| `POST /api/japanese-study/reviews` | `promptId`, an offered `choiceId`, optional `answerTimeMs: 0…300000`; daily review also supplies `dailyDayKey` | Automatic correctness/feedback, counters, accuracy, practice band, XP, mastery score and unlocked/completed bands |
| `POST /api/japanese-study/quick-review` | `{}` | Current UTC daily status and unfinished questions; see [daily review contract](japanese-dashboard-study.md) |

Mutation bodies must be JSON, at most 16 KiB, with only the documented fields. Cross-origin requests and malformed input fail before persistence. Clients cannot supply the student, card, correctness, answer key, catalog or study band. Errors expose stable codes rather than server internals. Shared private HTTP handling also serves Japanese assessment routes; assessment grading/content remain independent.

## Issuance and grading

- Reuse the shared weighted scheduler with a unique-card option; the existing English queue keeps its repeat behavior. Due cards lead a session, followed by other authorized cards. A small pool produces a shorter queue, without duplicate units.
- Build the existing Japanese prompt bank from stored canonical content and snapshot reference provenance. Validate card identity, kind and introduction level against the persisted unit. Only the selected level and requested card kind enter the session.
- Derive the eligible study band from server-calculated access. Rotate through eligible members and their available meaning/reading/on/kun tasks using saved attempt count. UI locale does not change the task or authorize later spellings.
- Bind each issued question to its learner, canonical card, snapshot, content hash, eligible band and current attempt count. One active question per learner/card/snapshot/performance revision is reused across concurrent queue requests. The answer key and full feedback remain private until submission.
- Questions expire after 24 hours. This is a stale-question safeguard, without a learner-facing assessment timer. A new queue replaces expired or invalidated active questions. An expired submission writes no review progress.
- Grade only the server-owned question and an exact offered choice. Source/member-specific reading and meaning rules remain in the existing Japanese compiler/grader. Stale content, catalog, access or performance revisions require a fresh queue.

## Atomic review and retry behavior

The additive `20261023030000_study_review_prompts` migration creates a private question/result ledger with foreign keys, pending/completed consistency checks, a unique active key, and immutable question/answer/completed-result guards. It does not rewrite existing study rows.

A learner-scoped transaction lock serializes queue issuance and reviews. Saving a review uses the shared English/Japanese persistence helper: read the latest state inside the lock, calculate due date/performance/latency with the shared scheduler, and update counters and level XP. English grading, response shape, rank notifications and mastery policy stay in the English route.

Japanese reviews then recompute Japanese mastery and persist earned access and completed milestones in the same transaction as the immutable answer result. Mastery score is the percentage of units satisfying the existing practice mastery classifier. First touch and empty levels do not complete a level. Existing earned/completed access survives weaker later performance. Placement results, English proficiency and exit-assessment history are never written by this service.

An identical retry returns the exact saved result, including its original timing and XP fields, without awarding anything again. A different answer to an answered question returns `409 REVIEW_CONFLICT`. A failed result save rolls back performance, XP and new unlocks together. Fresh subject/account/publication checks still apply to retries.

## Verification and local state

The scheduler's unique-session test and new HTTP tests failed before implementation. Green verification covers authentication, fresh actor/subject checks, request limits, answer-key projection, queue reuse, task rotation, conflicting retries, expired/stale questions, practice filters, wrong answers, concurrent distinct reviews, atomic rollback and immutable ledger fields. The real imported corpus also completes a 24-card N5 queue and saved review inside a disposable schema. Concurrent English helper calls retain both answers and XP.

The study database runner now includes both study persistence files. Full verification: **135 study tests, six PostgreSQL study tests, 116 content tests, 262 Japanese assessment tests, eight PostgreSQL assessment tests and 372 mirror regressions (899 passing tests)**. Existing opt-in skips/todos remain outside these passing totals. TypeScript, focused ESLint, whitespace checks and the production build pass.

The new migration is applied locally. English remains PUBLISHED with 3,284 cards; Japanese remains DRAFT with 10,291 units. The active Japanese assessment is still version 3, digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`. Local Japanese progress, card-state and question-ledger counts remain zero. Disposable schemas and connections are cleaned up; no preview server is needed for this backend increment. Nothing is staged, committed or pushed.

Next: connect the shared learner study interface to these endpoints, using Impeccable for every UI/design decision. Include vocabulary/kanji context, save retry/recovery states, retained access and an honest unpublished-catalog state. Dashboard quick review, learner-facing usage translations, sense/example review and corpus publication remain separate work.

Section 5i connects the [shared learner study interface](japanese-study-interface.md); section 5j adds [dashboard quick review and summaries](japanese-dashboard-study.md). The catalog remains DRAFT. Daily receipts join the existing atomic save, and daily context is checked before progress writes. The standard practice flow and Japanese assessment remain separate.
