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

The full 10,307-record version-4 catalog is written to the ignored cache as `flashcards-v4.json`; [reports/flashcards.json](./reports/flashcards.json) tracks original/resulting counts, content/source/decision digests, dictionary-unverified identities, phrase support and reference coverage. [vocabulary-corrections.json](./vocabulary-corrections.json) records 76 dictionary/form/evidence corrections, four source-attested expressions, three pinned citation-only sources, one multi-sense reference resolution and 3,074 explicit meaning reviews. The compiler preserves 1,210 complete original snapshots and distinguishes direct matches, supported constructions and phrase attestations.

[reference-decisions.json](./reference-decisions.json) accounts for all 127 formerly unmatched rows: 113 dictionary-backed vocabulary additions and 14 links to existing verified character cards. Every decision binds an original reference hash and the source lock. Selected senses and usage tags/notes prevent copying unrelated meanings across readings. The 7,811 original vocabulary records and all 2,383 original kanji records remain. New IDs derive from written/reading pairs, and additions cite their reference CSV rather than OpenJLPT. The structural audit still calls the 14 character rows unmatched as vocabulary; the explicit decision coverage has zero unresolved rows. This is not canonical deck deduplication or approval of disputed community levels. The raw audit above still describes the unmodified sources.

After fetching the corpus with the audit command, `flashcards --fetch` downloads/verifies the three phrase-evidence files and builds the catalog. Full source pages remain ignored and retain publisher rights. Default builds are offline. `--check` verifies the cached source bytes and rebuilds in memory, rejecting summary drift without writing files; it cannot be combined with `--fetch`. No study database rows or learner-facing decks are created. See the [import handoff](../../../../docs/japanese-flashcards.md) for the schema, verification scope and next work.

The same command also builds the canonical `study-v1.json` projection and [reports/study.json](./reports/study.json). [study-policy.json](./study-policy.json) binds the source catalog and explicitly partitions all 161 dictionary-overlap families. Sixteen variant groups reduce 32 records to 16 study units; every source ID/reference remains mapped. All 408 source-level disagreements receive a documented application-policy outcome. Primary readings, context-specific senses and member-specific answer sets remain distinct, and kanji classifications do not inherit vocabulary levels. `--check` compares both summaries. See the [study catalog handoff](../../../../docs/japanese-study-catalog.md). These draft groups do not create scheduling or publication state.

`yarn japanese-content:audit --strict` exits unsuccessfully while publication is blocked. That is intentional: resolving structural issues alone never asserts teacher approval. The default command generates an honest research report even when review queues are nonempty.

**Reading verification is not meaning or curriculum approval.** Each learner-facing word sense, example, level, and exercise still requires Japanese-teacher review. Modern JLPT has no exhaustive published official word/kanji list. Related repositories frequently share the same Waller sources, so their agreement is not independent validation.

Section 5k adds the offline source-bound content review:

```sh
yarn japanese-content:review
yarn japanese-content:review --check
```

[reports/content-review.json](./reports/content-review.json) binds the exact catalog/source/label and row-stream digests. The complete ignored `.cache/japanese-content/content-review-v1.jsonl` accounts for all 10,307 source members and provides vocabulary meanings, eligible dictionary sense context, original examples and usage notes for review. All 82 current usage values have en/ja display labels shared by full and daily practice. Normalized exact-gloss differences and nonliteral example targets are review signals, not automatic errors or edits. The command uses existing pinned loaders/validators and cannot publish, fetch, migrate or modify the catalog. `--check` writes nothing. See the [content review handoff](../../../../docs/japanese-study-content-review.md) for findings and limits.

Sections 5l–5ae apply [explicit meaning/example decisions](../../../../docs/japanese-vocabulary-meaning-reviews.md) through the same correction pipeline: cumulatively 1,146 corrected records, 1,928 retained wording decisions, 731 selected unchanged examples and 107 omissions with full originals preserved. Every resulting meaning cites an eligible pinned sense; equivalents and construction renderings are explicit authored decisions, not automatic synonym approval. Sections 5o–5q resolve the final N4 constructions and all 646 flagged N3 records. Sections 5r–5v resolve all 706 flagged N2 dictionary records and four supported constructions, preserving legitimate homonyms with separate dictionary entries, including コック and チップ. Four N2 phrases retain their separately verified source-attestation contract and six phrase-supported meanings; they are not direct dictionary matches. Sections 5w–5ae review all 1,316 formerly flagged N1 dictionary records and the final supported construction, including reading-specific meanings, ordinals, verb direction, calendar context and independently evidenced homonyms. The second cohort clarifies 地方・じかた, 弟・おと, 番目 and バット’s shallow-tray meaning rather than copying an English etymology as its definition. The third cohort clarifies 万人・ばんじん, 乾・けん, passive 染まる, first-visit 一見・いちげん and independently evidenced pair/European pear and best/vest homonyms. The fourth cohort clarifies 否・いな, 会・え, heat quantity 熱量, active acceptance 受け付ける and timetable 時刻表. Independent entries preserve the fish あら, geographic 南・なん, 了’s rare understanding spelling and club/crab, with 南・みなみ remaining a separate unit. The fifth cohort distinguishes folk customs 民俗 from 民族, subfamily 亜科 from suborder, morae from syllables in 短歌, giving from receiving in 給う and the reading-specific 華奢・かしゃ/立方・たちかた senses. Independent evidence preserves race/lace. The sixth cohort clarifies 甲・きのえ, 反・たん’s area scale, sensitivity 感度, transitive/intransitive verbs, the 御/的 suffix-prefix roles and the language-specific 助動詞 classifications. Nine incompatible examples are omitted with complete originals preserved. The seventh cohort separates thigh/femur, 大事・おおごと/だいじ, magnification/diameter, exchange/dodging and the childcare/institution/address categories. Independent pinned evidence preserves lever/liver, and 15 source examples are omitted with originals intact. The eighth cohort clarifies active 導く, 夜中・やちゅう, the 修士 degree, possession 所持, 改定/改訂 and the 例/粋/出来物 reading boundaries. Independent evidence preserves lamp/ramp; the rare treasure sense of 重宝 and both directions of 賜る remain. Eleven examples are omitted with full originals retained. The final 117 decisions (48 corrected, 69 retained) clarify ethnic groups versus individuals, the prior-time 兼ねて adverb, reading-specific historical senses, counters, patient records and quantities. Independent entries preserve fan/fun, base/bass and volt/bolt. 煌々と retains its English adverbs via the existing 煌々 + と construction and exact base sense. Two further examples are omitted with originals retained. The shared validator rechecks a construction's declared suffix, base pair, part of speech and exact base sense. Its explicit `construction` relation permits authored grammatical wording without claiming an exact dictionary headword gloss. The inventory reports 2,518 reviewed equivalent/construction strings separately from 14,694 exact matches among 17,218 meanings. All N5–N1 dictionary/construction meaning flags are resolved. Its only six remaining signals belong to the four separately attested N2 phrases; they are not unresolved dictionary gaps. Example and curriculum review remain separate. Canonical identities, partitions and levels are unchanged. Revised artifacts are not a replacement or publication of the older immutable application DRAFT snapshot.
