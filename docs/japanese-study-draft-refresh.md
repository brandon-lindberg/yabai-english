# Guarded Japanese study draft refresh

Section 5cb of [the mirror plan](../MIRROR_PLAN.md), delivered locally on `the-mirror`, 2026-10-28. The reviewed catalog is persisted as a **DRAFT**. Brandon retains staging, commits and pushes.

## Delivered local result

The track now points to `ja-study:d9a72223da0534a2bbec995f8e26a508f1dd678c3c39f9d958607484207457b2`, replacing the earlier draft pointer `ja-study:65d489aaddd1c7449de1abba1edf298c65fe0dc095b396032f5dde8b88e1c7a0`. The refresh changes content on **7,469 cards** while preserving all **10,291 canonical identities, 10,307 source memberships, five levels and ten decks**. No level, membership, kind, sort order, front/back field or English exercise is changed. Subsequent inspection verifies exact equality with the reviewed artifacts and zero remaining content differences.

Both complete card revisions are retained: **20,582 immutable card-history rows** across the two snapshots. The old snapshot's complete metadata is unchanged. The new snapshot links to its predecessor. The Japanese track remains DRAFT; this does not make study available to learners or publish the flashcards.

Before/after full-row fingerprints confirm unchanged English tracks/cards, all levels/decks, users/profiles, study progress, review states, daily reviews, issued questions, study assessments/attempts, Japanese placement banks/attempts/responses and bookings. Japanese learner activity remains zero. The active assessment still has bank version 3 and digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`.

## Existing importer, explicit refresh mode

The existing `japanese-import.ts` remains the only persistence compiler/importer. Artifact loading still verifies exact source/study bytes against tracked reports before database access. Initial insertion, identical verification and guarded refresh share the same plan, card selection and history validation.

Default `yarn japanese-content:study` remains database-free. Operator modes are loopback-only:

```sh
yarn japanese-content:study --inspect-draft
yarn japanese-content:study --import-draft
yarn japanese-content:study --refresh-draft-from EXPECTED_SNAPSHOT_ID --expected-cards-sha256 INSPECTED_CARD_DIGEST
```

The read-only inspection checks the current structure against the target plan and reports the exact current snapshot, canonical card count, canonical-JSON card digest, target snapshot, changed-card count and learner-activity counts. The last command requires both inspected pins. A stale snapshot or content digest rejects the refresh. Missing pins, mixed modes, malformed hashes and unknown/positional arguments fail before database access. No force/publication mode is provided.

Refreshing requires the expected Japanese DRAFT track and identical canonical identities, complete unit/membership/level metadata, decks, source lock, reconciliation mappings and grouping policy apart from its rebound source fingerprint. It refuses changed structure or policy, published content, and any card state, level progress, issued prompt, Japanese daily-review row or study-assessment attempt. Placement attempts are independent and are preserved.

Within one serializable transaction, the importer validates or backfills the complete previous card revision, creates the new snapshot with its predecessor link and complete immutable card revision, updates only changed active `contentJson` fields, then conditionally advances the draft pointer. It never deletes/recreates live cards or writes learner state. Any error rolls everything back. Competing refreshes can receive a serialization conflict; retrying the same pinned command verifies the already-applied revision. Repeated identical imports verify live content/provenance and retained history rather than creating new rows.

The card digest inspected before this refresh was `84fb2a62d97a9cc70b3e4b75844c73cf20df5521a6a7840eaad8f789b2abb866`; the new stored-card digest is `fc8b021f80054501c56a1b3631ed411d1572cee350d26307dd5f13b1e22d93c8`. These canonical-JSON row digests differ from the serialized catalog digest and serve a separate stale-content guard. The repeated original guarded command successfully returned “Verified existing”.

## Additive history migration

`20261027010000_study_catalog_card_snapshots` adds a nullable predecessor link to `StudyCatalogSnapshot` and `StudyCatalogCardSnapshot`, keyed by snapshot/card identity. Card history is independent of active-card foreign keys, so it does not replace or reset learner identities. Database triggers forbid updating/deleting either snapshot provenance or card history. Existing initial imports and old draft snapshots remain compatible; legacy cards are archived inside the first guarded refresh.

The migration was verified in disposable schemas and applied locally using a guard that allowed only that pending migration. Before/after counts and full-row fingerprints matched for all checked application tables; the existing snapshot gained only the nullable predecessor column. The migration itself inserted no card-history or learner rows. The subsequent explicit refresh populated history and changed the draft pointer/content. Production migration/deployment remains separate.

The isolated PostgreSQL helper now applies its target and all subsequent migrations once before current-client operations. Previously, only tests that requested a datamodel diff received later migrations, leaving other fixtures on an incompatible schema. Historical pre-migration fixtures are still created before `applyMigration()`; the datamodel diff remains a separate check.

## TDD and verification

Two initial PostgreSQL regressions failed against the old importer while all eleven existing study database checks passed. Nine operator-option tests failed against a verification-only stub. Implementation then made the refresh, stale-guard and CLI contracts green. Additional database checks exercise a pre-history legacy draft, read-only inspection, full before/after card retention, publication and every learner-activity guard, forced mid-refresh rollback, immutable-history update/delete rejection, competing identical refreshes and retry verification.

- Study unit/component/prompt checks: **183 pass**, fourteen opt-in database cases skipped in that command.
- Content checks: **337 pass**.
- Mirror regressions: **375 pass**, one existing skip and three todo cases.
- Isolated PostgreSQL: **14 study + 9 Japanese placement + 1 foundation = 24 pass**.
- **919 passing checks**, plus TypeScript, focused ESLint, production build, migration/datamodel comparison, artifact-plan verification and whitespace checks.

The full-corpus study test validates source-backed automatic prompts for every canonical unit. The local after-inspection verifies exact stored content against the reviewed import plan. The independent SQL audit compares both complete archives with the before/after active rows and confirms unchanged protected data. Verification evidence is ignored under `.impeccable/draft-refresh/`. Tests close their connections and remove disposable schemas; the final audit reports zero remaining schemas/connections.

This backend/data increment adds no interface/style decision, visual surface, scheduler or assessment engine. No preview server, browser or task automation was needed. All task-owned commands/processes have exited. Nothing is staged, committed or pushed.

Next is section 6 cross-product verification and release preparation. Flashcard publication remains a separate decision; the earlier assessment publication authorization does not publish the study track.
