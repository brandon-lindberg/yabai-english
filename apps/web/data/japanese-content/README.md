# Japanese content research tooling

Section 1 of [MIRROR_PLAN.md](../../../../MIRROR_PLAN.md) establishes a traceable N5–N1 candidate corpus. It does not seed production study tables or reuse English placement code.

From the repository root:

```sh
yarn test:japanese-content
yarn japanese-content:audit --fetch
yarn japanese-content:audit
```

The first audit command downloads exact pinned sources into the ignored `apps/web/.cache/japanese-content/` directory. Subsequent runs are offline and reproduce the reports. Cached and downloaded files must pass their Git blob/SHA-256 checks. A modified cache is rejected; remove only the affected cache file to download it again. Source upgrades require an explicit lock update and review of the changed report.

Dependencies are the existing Node/TypeScript tooling and `tar` (macOS/Linux). No new application dependencies or database credentials are required. The full dictionary archives total approximately 13 MB compressed; the common-only JMdict dataset is intentionally not used.

The isolated Vitest configuration reuses the existing resolver settings while disabling database seeding and `.env` setup. Test fixtures use synthetic level assignments and are not study content.

Outputs:

- [reports/README.md](./reports/README.md): human-readable counts, review findings, and sample card data.
- [reports/audit.json](./reports/audit.json): all issues and dictionary-verified record identities.
- [reports/reconciliation.jsonl](./reports/reconciliation.jsonl): one outcome for every reference CSV row, preserving unmatched and ambiguous records.
- [reports/samples.json](./reports/samples.json): one source-verified vocabulary and kanji sample per level where checks permit, explicitly pending Japanese-teacher review.
- [ATTRIBUTION.md](./ATTRIBUTION.md): data licences and upstream credits.

Section 5a adds a structured draft flashcard import using the same source loader, schemas, audit and dictionary matcher:

```sh
yarn japanese-content:flashcards
yarn japanese-content:flashcards --check
yarn japanese-content:flashcards --fetch
```

The full 10,307-record version-4 catalog is written to the ignored cache as `flashcards-v4.json`; [reports/flashcards.json](./reports/flashcards.json) tracks original/resulting counts, content/source/decision digests, dictionary-unverified identities, phrase support and reference coverage. [vocabulary-corrections.json](./vocabulary-corrections.json) records 33 dictionary corrections, four source-attested expressions, three pinned citation-only sources and one multi-sense reference resolution. The compiler preserves 37 complete original snapshots and distinguishes direct matches, supported constructions and phrase attestations.

[reference-decisions.json](./reference-decisions.json) accounts for all 127 formerly unmatched rows: 113 dictionary-backed vocabulary additions and 14 links to existing verified character cards. Every decision binds an original reference hash and the source lock. Selected senses and usage tags/notes prevent copying unrelated meanings across readings. The 7,811 original vocabulary records and all 2,383 original kanji records remain. New IDs derive from written/reading pairs, and additions cite their reference CSV rather than OpenJLPT. The structural audit still calls the 14 character rows unmatched as vocabulary; the explicit decision coverage has zero unresolved rows. This is not canonical deck deduplication or approval of disputed community levels. The raw audit above still describes the unmodified sources.

After fetching the corpus with the audit command, `flashcards --fetch` downloads/verifies the three phrase-evidence files and builds the catalog. Full source pages remain ignored and retain publisher rights. Default builds are offline. `--check` verifies the cached source bytes and rebuilds in memory, rejecting summary drift without writing files; it cannot be combined with `--fetch`. No study database rows or learner-facing decks are created. See the [import handoff](../../../../docs/japanese-flashcards.md) for the schema, verification scope and next work.

`yarn japanese-content:audit --strict` exits unsuccessfully while publication is blocked. That is intentional: resolving structural issues alone never asserts teacher approval. The default command generates an honest research report even when review queues are nonempty.

**Reading verification is not meaning or curriculum approval.** Each learner-facing word sense, example, level, and exercise still requires Japanese-teacher review. Modern JLPT has no exhaustive published official word/kanji list. Related repositories frequently share the same Waller sources, so their agreement is not independent validation.
