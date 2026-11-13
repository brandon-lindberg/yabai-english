# Japanese study persistence — section 5f

The shared study tables now support independent English and Japanese tracks. The additive migration is applied locally, with **10,291 Japanese canonical cards persisted as an unpublished draft**. English retains its existing 3,284 cards and published track. The published Japanese placement bank is unchanged.

**Current draft, 2026-10-28:** [section 5cb](japanese-study-draft-refresh.md) refreshes the reviewed content under stable identities and preserves both complete card revisions in immutable database history. The current draft digest is `d9a72223da0534a2bbec995f8e26a508f1dd678c3c39f9d958607484207457b2`; the older digest and verification totals below record the initial section-5f delivery. The local additive history migration and guarded refresh are complete; the track remains unpublished.

## Data and compatibility

- `StudyTrack.learningLanguage` identifies the subject independently of UI locale or the learner's current preference. Historical tracks default to `ENGLISH` and `PUBLISHED`; the Japanese importer explicitly creates `JAPANESE` and `DRAFT`.
- `StudyLevelCode` retains the nine English codes and adds N5–N1. Level navigation accepts an explicit subject; Japanese codes cannot enter the English curriculum sequence or authoring policy.
- `StudyCard.kind` separates existing English exercises, Japanese vocabulary and Japanese kanji. Existing card IDs, fronts, backs and structured exercises are untouched. Japanese cards retain the canonical anchor as the database ID and store `{schemaVersion, unit, records}` in `contentJson`. Their unused legacy front/back columns are empty; no English answer formatter processes them.
- `StudyCatalogSnapshot` binds the source, policy, lock and canonical digests. `provenanceJson.source` retains the source artifact except its cards; `provenanceJson.study` retains the canonical artifact except its units. Every source member's complete content is stored with its owning card, including original corrections, accepted pairs, readings, labels, examples and evidence. All 8,293 reference rows, mappings and 408 level outcomes remain traceable.
- Each of five Japanese levels has separate vocabulary and kanji decks. These are introduction bands from section 5e's documented community evidence, not official JLPT lists or a new placement score.
- Progress/state remain keyed by user and stable level/card IDs. The subject is obtained through their track, so switching learner intent does not reset or copy either subject's progress. XP remains track-scoped.
- Daily review uniqueness is now `(userId, learningLanguage, dayKey)`. The migration preserves historical English selections/interactions and adds no learner rows.

## Shared scheduling and access

The existing queue ordering and review-state calculations live in `src/lib/study/scheduler.ts`. English endpoints call that implementation; Japanese prompts will reuse it after Japanese-specific grading. Due-date tiers, performance weights, counters, latency handling and English XP values are preserved. This increment introduces no second scheduler or assessment engine.

English overview/queue queries require an English, published track. Level access checks subject/publication before the teacher/admin shortcut. Review accepts only English exercise cards. This prevents a crafted Japanese track slug/card ID from reaching English answer processing. Japanese intent remains blocked from English study routes under the existing journey rules.

Quick-review sampling, cached-card reads and replacement candidates use the same subject/publication boundary. Slot submissions revalidate eligible subject ownership before writing. Initial concurrent selections use an upsert so requests share the winning daily selection. Display/date helpers live in a browser-safe module; database queries use Prisma rather than unqualified raw SQL, including under isolated test schemas.

Japanese quick review currently returns an empty panel without querying English cards. Japanese study has no learner entry point yet. Draft import is persistence, not publication; it does not enable an unfinished prompt adapter or imply content approval.

## Commands

From the repository root:

```sh
yarn test:study
yarn test:study:db
yarn japanese-content:study
yarn japanese-content:study --import-draft
yarn japanese-content:study --inspect-draft
yarn japanese-content:study --refresh-draft-from EXPECTED_SNAPSHOT_ID --expected-cards-sha256 INSPECTED_CARD_DIGEST
```

The first command uses no credentials or database. The opt-in database command uses `MIRROR_TEST_DATABASE_URL` or the local `.env` URL, creates a disposable schema, replays migrations and removes its schema/connections in `finally`. Without downloaded corpus artifacts it uses the shared synthetic fixture; with them it verifies/imports the entire real catalog.

`japanese-content:study` verifies both cached artifacts against the tracked source/study summary digests and compiles the persistence plan without database access. Build missing artifacts with the existing `japanese-content:flashcards` workflow. The current canonical digest is `d9a72223da0534a2bbec995f8e26a508f1dd678c3c39f9d958607484207457b2`.

Only explicit operator modes open a database, restricted to loopback hosts. `JAPANESE_STUDY_DATABASE_URL` can override the local `.env` URL. Apply migrations first. `--import-draft` atomically inserts a new snapshot, draft track, levels, decks, cards and immutable card history, or verifies an identical existing draft. It still refuses replacement, publication, content drift and legacy ID collisions. `--inspect-draft` is read-only. The separate pinned refresh mode updates an unused existing draft, preserving complete history and stable identities as documented in [the refresh contract](japanese-study-draft-refresh.md). Failed writes roll back; no mode publishes content or writes learner progress.

## Verification and next work

TDD red/green demonstrated missing Japanese levels, unavailable-track access, unscoped daily selections, poisoned cached slots, the absent shared scheduler and missing import compiler. Database checks cover exact preservation of historical English rows, collision rollback, the full import, idempotency/content drift, stored provenance, independent progress/XP and daily rows, pool filtering, and refusal to replace published content.

**111 study tests, one full-corpus PostgreSQL study test, 116 content tests, 262 Japanese assessment tests, eight PostgreSQL assessment regressions and 372 mirror regressions pass (870 total).** TypeScript, focused ESLint, whitespace checks and the production build pass. CI now includes the isolated study unit and migration suites. Historical assessment migration verification applies later migrations before comparing with the current Prisma schema; assessment implementation/content remain unchanged.

Local status: English published with 3,284 cards; Japanese draft with 10,291 cards; no Japanese learner progress/reviews created. The sole active assessment remains version 3 with digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`. Temporary test schemas/connections are zero. No preview server or browser resources were started. Brandon retains all commits and pushes.

Section 5g has since delivered [Japanese member-bound prompt/grading adapters and the progression policy](japanese-study-prompts.md). Next are the authenticated queue and retry-safe review persistence, followed by the shared study interface using Impeccable. Preserve valid written/reading pairs, distinguish vocabulary from kanji on/kun tasks, carry rare/context-specific usage labels, and keep the existing scheduler. Learner-facing sense/example review and full-corpus publication remain separate work under the plan.
