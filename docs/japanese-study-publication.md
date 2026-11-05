# Japanese flashcard beta publication

Section 6l of [the mirror plan](../MIRROR_PLAN.md), delivered locally on `the-mirror`, 2026-11-05. The owner explicitly authorized publishing the reviewed Japanese flashcards and requested an upper-left beta ribbon. Brandon retains staging, commits and pushes.

## Published catalog

The local application now has **10,291 Japanese flashcards, PUBLISHED**, covering its five existing N5–N1 levels:

| Level | Canonical cards |
| --- | ---: |
| N5 | 773 |
| N4 | 812 |
| N3 | 2,065 |
| N2 | 2,176 |
| N1 | 4,465 |

The exact reviewed snapshot is `ja-study:d9a72223da0534a2bbec995f8e26a508f1dd678c3c39f9d958607484207457b2`; its stored-card digest is `fc8b021f80054501c56a1b3631ed411d1572cee350d26307dd5f13b1e22d93c8`. Both are unchanged from the completed section-5cb refresh. All 10,307 source memberships and 20,582 immutable card-history rows remain. English stays published with 3,284 cards.

Before/after fingerprints cover all **74 public application tables**, normalizing only the Japanese track's `publicationStatus`. Every fingerprint matches. Publication changes that one field from DRAFT to PUBLISHED; it does not rewrite content, reset progress, grant levels, alter assessment results, affect payments or require a migration. Post-publication inspection reports zero content differences and unchanged zero Japanese learner-activity counts.

This is the owner's explicit beta publication decision for this exact source-backed catalog. It does not claim independent Japanese-teacher signoff or an exhaustive official JLPT word list. Historical artifact provenance and review records are retained as authored; the source files' `draft` metadata describes their original research/import artifact, while the application track controls learner availability.

## Publication workflow

The existing importer/CLI now has an explicit pinned publication mode; validation and persistence planning remain shared with import/refresh. From the repository root:

```sh
yarn japanese-content:study --inspect-draft
yarn japanese-content:study --publish-draft-from ja-study:d9a72223da0534a2bbec995f8e26a508f1dd678c3c39f9d958607484207457b2 --expected-cards-sha256 fc8b021f80054501c56a1b3631ed411d1572cee350d26307dd5f13b1e22d93c8
```

The first command is read-only and also verifies an already published catalog. The second checks the exact reviewed artifact bytes, snapshot, track/level/deck structure, live card contents, digest and complete immutable card archive inside a serializable transaction. Only then does a conditional DRAFT-to-PUBLISHED update run. Stale pins, changed content, the wrong subject, missing history and database failures leave publication unchanged. Identical publication retries verify the published content without resetting learner activity. A concurrent publication can receive a serialization conflict and safely retry. Published catalogs remain protected from draft refresh.

Default `yarn japanese-content:study` remains database-free. Operator modes retain the existing loopback-only database restriction. This publication is local; no production deployment or remote database update occurred. Remote publication requires a separately targeted deployment operation rather than assuming that committing code copies local database state.

## Learner experience and credits

Japanese learners use the existing shared `/learn/study` hub and N5–N1 practice routes. Existing placement/mastery rules determine which levels open. The single study layout reads persisted learning language and adds a compact **Beta / ベータ版** ribbon at its upper-left corner, using existing theme tokens and preserving page sizing. It appears on the Japanese hub and practice pages in either UI locale; English study has no ribbon.

Each Japanese study page links **Sources and licences / 出典とライセンス** to `/api/japanese-study/attribution`, opening separately so current practice remains in place. This public read-only endpoint serves the existing [attribution document](../apps/web/data/japanese-content/ATTRIBUTION.md) directly. There is no second maintained copy. The production build explicitly includes it in the route's file trace. Existing upstream credits, source links, licences and correction descriptions remain visible.

## Verification

TDD red records the missing publication option and Japanese ribbon/source link; three new database cases fail before implementation while the earlier fourteen pass. Green evidence under ignored `.impeccable/study-publication*` includes:

- **191 study unit/component/prompt checks**, including automatic source-backed prompts for every canonical unit.
- **17 isolated PostgreSQL cases**, including publication/access, preservation, retry after learner activity, stale pins, content/history/subject rejection, forced rollback and concurrent identical publication.
- The existing full-corpus browser study journey, repeated once for confirmation, verifying draft denial, publication availability, the ribbon on desktop/light/English and mobile/dark/Japanese, source notice delivery, actual kanji feedback/readings, saved/retried progress, and a return to English with independent progress and no beta label. Both runs preserve all 28 protected application-table fingerprints and remove their disposable fixtures/schema/connections.
- TypeScript, full ESLint, whitespace and production build pass. The build trace includes the source notice. Impeccable visual review is bounded to the desktop/mobile batch and one confirmation, with no page overflow and the existing 2px focus outlines.

Local read/write evidence is in `.impeccable/study-publication/{before,after}.json`, `publish.log` and `after-inspect.log`; test/build evidence uses the `study-publication-*.log` prefix. Tests use disposable schemas. Publication creates no application learner fixtures. No live provider call, payment change, content rewrite, staging, commit or push occurs.
