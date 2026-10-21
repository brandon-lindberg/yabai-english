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

`yarn japanese-content:audit --strict` exits unsuccessfully while publication is blocked. That is intentional: resolving structural issues alone never asserts teacher approval. The default command generates an honest research report even when review queues are nonempty.

**Reading verification is not meaning or curriculum approval.** Each learner-facing word sense, example, level, and exercise still requires Japanese-teacher review. Modern JLPT has no exhaustive published official word/kanji list. Related repositories frequently share the same Waller sources, so their agreement is not independent validation.
