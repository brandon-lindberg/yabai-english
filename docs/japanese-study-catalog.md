# Japanese canonical study catalog — section 5e

The canonical catalog projects the [draft source import](japanese-flashcards.md) into stable study identities. It preserves every source record and reference row. It introduces no study database rows, learner progress or interface, and does not publish the corpus.

## Build and verify

From the repository root, use the existing commands:

```sh
yarn test:japanese-content
yarn japanese-content:flashcards
yarn japanese-content:flashcards --check
```

The command builds both catalogs before writing outputs. The full ignored artifacts are `apps/web/.cache/japanese-content/flashcards-v4.json` and `study-v1.json`. Tracked [flashcard](../apps/web/data/japanese-content/reports/flashcards.json) and [study](../apps/web/data/japanese-content/reports/study.json) summaries bind their exact SHA-256 digests. `--check` rebuilds both in memory and compares both summaries without writing. Default builds remain offline, using the existing verified cache loader. Fresh-cache instructions and phrase-source terms remain in the import handoff.

## Explicit grouping

[study-policy.json](../apps/web/data/japanese-content/study-policy.json) binds the complete source catalog and source lock. All **161 dictionary-overlap families**, involving **332 vocabulary records**, have explicit partitions and reasons. A shared dictionary ID opens a decision queue; it does not automatically establish equivalence. Missing families, stale members, incomplete partitions, duplicate membership and unknown anchors fail compilation. Future overlapping families that cannot be partitioned without assigning a record twice fail rather than silently choosing an owner.

There are **16 merged groups covering 32 records**, resulting in **7,908 vocabulary units plus 2,383 kanji units: 10,291 units for all 10,307 source identities**. Examples include 的確/適確, 中身/中味, 寝間着/寝巻 and それとも/其れとも. The four やたら records partition into two groups: kana/kanji variants of the base adverb and, separately, variants of its explicitly evidenced に construction.

Each merge declares common dictionary senses and an existing source record as its stable anchor. The compiler reuses dictionary pair/sense and construction validation, requires matching primary readings and compatible construction kinds, and retains the selected sense metadata. The lexical choice to group a particular usage is authored in the policy; structural checks do not prove semantic equivalence. Conservative partitions keep context-sensitive spellings or different source meaning ranges distinct even when their broad English glosses match.

Ball/projectile, older/younger kinship, early/quick, context-sensitive measurement spellings and different primary readings remain distinct. In particular, 玉/弾, 伯父さん/叔父さん/小父さん, 伯母さん/叔母さん and 何/なん versus 何/なに are separate units. Shared dictionary membership remains traceable through the policy.

## Unit contract

The canonical artifact has schema 1, language `JAPANESE` and status `draft`. It contains:

- `units`: stable anchored IDs, kind, member source IDs, shared-sense justification and level evidence.
- `recordToUnit`: exactly one mapping for every vocabulary and kanji source ID, including reference additions.
- `referenceToUnits`: mappings for all 8,293 references, including the multi-sense row and character-reading coverage.
- `levelDecisions`: one explicit outcome for every original level-disagreement issue.
- The complete policy, policy/source/lock digests and source attribution path.

Source content stays in the full import catalog; it is not copied into a second card formatter. Every unit has `answerPolicy: member-specific`. Grouping does **not** union spelling/reading/meaning combinations into a universal answer set. A future prompt must name its member record and use that record's validated pairs and context. Per-form usage, examples and level provenance remain available in the source import. Group IDs are anchored to existing records and do not contain a level or dictionary release.

## Study level policy

`earliest-matching-community-evidence-v1` chooses an introduction band from the earliest eligible community classification in N5 → N1 order. All member source-record levels are retained. A uniquely matched vocabulary reference contributes when its reading matches the member's primary reading and its exact written/reading pair is already validated, or when it is a supported kana-only reference for that reading.

Other primary readings, unconfirmed written forms and ambiguous multi-sense references remain evidence with `used: false`; they do not lower a unit's level. Vocabulary character-reading references do not reclassify kanji. All 2,383 kanji keep their source classification. A group introduction level does not assign every rare spelling or usage to that band: retain the per-form/reference classifications when selecting future prompts.

All **408 original disagreements** have outcomes: **382 references are eligible evidence and 26 retain their variant/source distinction without influencing the chosen band**. Eligible does not mean that 382 levels changed; many references are later than the existing source level. The original records, reference levels and raw diagnostic issues remain unchanged. This is a transparent application ordering policy based on the pinned community corpus, not an official JLPT classification, empirical calibration or fabricated teacher signoff.

| Introduction band | Vocabulary units | Kanji units |
|---|---:|---:|
| N5 | 689 | 84 |
| N4 | 643 | 169 |
| N3 | 1,678 | 387 |
| N2 | 1,778 | 398 |
| N1 | 3,120 | 1,345 |

Two additional source-gloss corrections were necessary during grouping. 叔母さん now retains only the aunt meaning in its linked kinship entry. “Warranty” is removed from 保障 because that dictionary sense is restricted to 保証. Both complete originals remain in the correction ledger/import; there are now 35 dictionary corrections and four attestations, with 39 original snapshots. No source file or source-level assignment changed.

## Verification and next increment

TDD red/green covers the absent grouping compiler, partition completeness, source drift, explicit anchors, dictionary sense/reading restrictions, member-specific answers, earlier eligible evidence and ignored variant/character evidence. Real-cache integration verifies all source/reference mappings, 16 merges, all 408 decisions, preserved kanji levels, key semantic separations and rejection of a base/construction merge. **116 content tests and 262 Japanese placement regressions pass**, with eight optional database tests skipped. TypeScript, focused ESLint, raw-audit reproducibility, whitespace and both catalog checks pass. No browser suite is needed for this data-only increment.

Section 5f has since delivered [subject-scoped draft persistence and the shared scheduler](japanese-study-persistence.md), and section 5g adds [Japanese prompts, grading and the progression policy](japanese-study-prompts.md). The explicit import command has loaded the local draft without publishing it. The catalog compiler described here remains database-free. Next are the authenticated queue and review-saving flow, then the interface using Impeccable. Learner-facing sense/example review and corpus publication remain separate work. Brandon retains all commits and pushes.
