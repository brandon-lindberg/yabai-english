# Japanese flashcard import — sections 5a–5e

The pinned section-1 corpus compiles into a reproducible **draft import catalog**. The correction ledger accounts for all 33 original dictionary failures and attests four complete expressions. Section 5d accounts for all 127 formerly unmatched reference rows with 113 dictionary-backed draft vocabulary additions and 14 links to existing character cards. Section 5e adds [explicit canonical study grouping and level provenance](japanese-study-catalog.md), retaining distinct senses and original references. The learner study interface, persistence and shared scheduling integration remain later section-5 work.

## Reproduce the catalog

From the repository root:

```sh
yarn test:japanese-content
yarn japanese-content:flashcards
yarn japanese-content:flashcards --check
```

The default build and `--check` reuse the checksum-verified source loader and audit, run offline, and require no database, credentials or application server. On a fresh checkout, run `yarn japanese-content:audit --fetch` for the corpus, then `yarn japanese-content:flashcards --fetch` for the three phrase-evidence files and catalog. `--fetch` and `--check` are mutually exclusive. A changed cache fails its pinned checksum.

The build writes:

- `apps/web/.cache/japanese-content/flashcards-v4.json`: the full current catalog, ignored because it is reproducible. Earlier catalog versions are historical and are no longer written or consumed.
- [reports/flashcards.json](../apps/web/data/japanese-content/reports/flashcards.json): the tracked counts, exact content/source/correction SHA-256 digests, dictionary-unverified and unsupported identities, reference-coverage counts, and issue totals.
- `apps/web/.cache/japanese-content/study-v1.json` and [reports/study.json](../apps/web/data/japanese-content/reports/study.json): the canonical study projection and tracked grouping/level counts and digests.

`--check` rebuilds in memory and compares both tracked summaries without writing files. It rejects content, grouping-policy or source-lock drift. Both catalogs are built before outputs are written. A successful check establishes reproducibility, not content approval. The source compiler sorts its records and references; there are no timestamps or machine-specific paths in the artifacts.

## Import contract

The catalog has schema version 4, learning language `JAPANESE`, and status `draft`. It retains the entire parsed source lock, including pinned URLs, revisions, file checksums and licences, plus phrase-source metadata and multi-sense resolutions in `corrections`. `referenceDecisions` retains the new complete unmatched-row ledger and its digest. `sourceCounts` distinguishes original corpus sizes from the resulting catalog counts. It points to [ATTRIBUTION.md](../apps/web/data/japanese-content/ATTRIBUTION.md).

Vocabulary and kanji are distinct record kinds:

- Vocabulary IDs are `ja-vocabulary:<OpenJLPT id>`. Each record retains the source level and structured forms/readings, meanings, part-of-speech tags, romaji, examples and Tatoeba IDs. `dictionaryEvidence.acceptedPairs` contains supported combinations of **declared effective** forms/readings, with the exact dictionary entry and any construction evidence for each pair. It is not every possible spelling, reading or sense in JMdict. Equivalent kana readings are deduplicated in that list. Corrected records additionally retain their complete `originalContent`.
- Reference additions use `ja-vocabulary:reference-<24 hex characters>` derived from the normalized written/reading pair. The identity contains no level, row number or dictionary release. Each addition links to its reference CSV file, rather than claiming an OpenJLPT origin. `referenceSupplement` retains the selected dictionary sense numbers, glosses, restrictions, usage notes, field/dialect labels and spelling/reading tags/common flags when supplied. Exact kana-spelling metadata is preferred before script-equivalent metadata. No examples or romaji are generated for these additions.
- Kanji IDs are `ja-kanji:<NFC character>`. Each record retains separate on-yomi, kun-yomi and name-reading arrays, meanings, stroke/radical metadata, word associations and supplementary/inferred classification where supplied. Dot and hyphen notation is retained. On/kun verification does not approve name readings, meanings or levels. Vocabulary readings are never assembled from character readings.

IDs do not contain a level or dictionary release, so later corrections can preserve study identities. No homophones or different readings of the same written word are auto-merged. Duplicate primary identities, Unicode-equivalent word/reading pairs, reference-row identities, dictionary identities, or missing N5–N1 coverage fail the build. This prevents identical primary pairs; it does not establish that every alias or related sense is a distinct final study concept.

Each card links to its pinned source file and all candidate reference-row IDs. Reconciliation preserves every reference row, original community level, match method and candidate card IDs. When exactly one candidate's primary form and reading match, the corrected import prefers it and retains the full prior pool as `allCandidateIds`. Each alternative card keeps its reference link. This ranking is opt-in for the corrected import; the raw audit remains unchanged. A conflicting reference level never silently overwrites the primary source level.

The existing audit supplies verification results and issues. `dictionaryEvidence.support` distinguishes `direct`, `derived` and `unverified`. `dictionarySupportedVocabulary` counts direct matches and supported constructions; `supportedVocabulary` additionally includes separately attested phrases. Those phrases retain `verified: false`, a null dictionary entry and explicit `phraseEvidence`. Their IDs remain in `dictionaryUnverifiedVocabularyIds`, while `unsupportedVocabularyIds` is empty. Four `MISSING_DICTIONARY_LINK` issues remain accurate dictionary diagnostics, not four missing phrase attestations. Kanji verification covers on/kun sets. These checks do not approve every meaning, level, example or publication.

## Source-bound corrections

[vocabulary-corrections.json](../apps/web/data/japanese-content/vocabulary-corrections.json) contains **39 record decisions: 35 dictionary corrections and four phrase attestations; none deferred**. The original 33 failures account for 29 corrections and the four attestations. Six additional corrections distinguish ball/bullet, kinship/familiar-address and spelling-restricted meanings. Each decision has a reason, a hash of the complete normalized original record, and the source-lock hash. All 39 effective records retain `originalContent`. The compiler rejects stale snapshots, duplicate or unknown identities, protected ID/level/review changes, missing or unused dictionary evidence, and corrections that still fail the shared audit. It changes no downloaded source files.

The correction types are:

- Kana alternatives such as アイデア/アイディア now declare matching readings. Alternatives split across dictionary entries, such as 何/なん and 何/なに, retain separate evidence rather than accepting an unchecked cross product.
- Six suru forms and six adverb constructions retain their full source forms with explicit base-word, sense and rule evidence. They are labelled `derived`. The validator requires the dictionary's eligible POS tag and that sense's spelling/reading restrictions; it does not strip suffixes globally. [EDRDG's tag guide](https://www.edrdg.org/wwwjdic/wwwjdicinf.html) defines the suru and `adv-to` tags. The [Japan Foundation's grammar notes](https://marugoto.jpf.go.jp/assets/docs/teacher/resource/elementary2_c/elementary2_competences_teachers_notes.pdf) describe the na-adjective adverb pattern used for the two やたらに forms.
- Wrong links and spellings are corrected against the pinned dictionary. しいんと uses the silence entry, not 死因; ちゅうっぱら uses 中っ腹, not the mountainside entry 中腹. The fragment よると becomes the complete dictionary expression によると, which already occurs in its retained source examples. Selected gloss/POS corrections are recorded explicitly.
- 玉 now declares 球 as an alternate for the ball/sphere sense; 弾 remains a separate bullet record. 伯父さん and 叔父さん keep the uncle meaning, with the older/younger relationship documented; 小父さん keeps familiar-address meanings. Dictionary sense checks are shared with construction validation.
- 叔母さん retains only the aunt meaning in its kinship entry. 保障 no longer includes “warranty”, which the dictionary restricts to 保証. Complete originals survive both corrections.

### Complete-expression evidence

Three source files have SHA-256 pins, publisher/title/retrieval metadata, exact locators and citation-only use:

- The [Japan Foundation's IRODORI Elementary 1 English vocabulary list](https://www.irodori-online.jpf.go.jp/a2-1/references/vocabulary/assets/pdf/reference-vocabulary-list-en.pdf), PDF pages 15 and 31, attests 少々お待ちください and お元気で. The PDF is scanned; both pages were visually checked, including furigana and English glosses. The ledger explicitly removes only 少々 to support お待ちください and changes its gloss to “please wait”.
- [日本語検定's honorific explanation](https://www.nihongokentei.jp/check/level4/keigo-4-1.html), dated 2015-04-24, gives ご存じです（か）. The ledger explicitly includes the optional question particle. This provider's 4級 supplies no JLPT level mapping; no question or options are imported.
- [Shogakukan's Digital Daijisen entry via Kotobank](https://kotobank.jp/word/%E8%A1%8C%E3%81%A4%E3%81%A6%E3%82%89%E3%81%A4%E3%81%97%E3%82%84%E3%81%84-680807) identifies 行っていらっしゃい as the expanded departure greeting. Its existing source ID remains separate from the contracted 行ってらっしゃい record.

All four retain their original kana forms as alternatives. The validator requires the complete quotation after its declared normalization, matching readings/forms, known source identity and curated meanings. It rejects substring evidence, including お元気ですか as support for お元気で. Source-byte checks establish provenance; they do not automate reading scanned pages or prove the authored lexical interpretation. Full PDF/HTML pages stay in the ignored cache, retain publisher rights and are not relicensed by the corpus attribution.

The incorrect “How are you?” example was removed from the effective parting-expression card. Together with the earlier death/mountainside examples, **four unrelated sentences are removed from three effective cards**, with originals and sentence IDs preserved. No replacement examples are generated.

### Reference coverage

Eight of the previous nine ambiguous rows now match uniquely: seven prefer an exact primary form/reading, and 球 matches the corrected ball record. These choices retain all source cards and aliases; they are not canonical deck merges.

The remaining row, `N5:109` おじさん, combines “uncle” and familiar address. An explicit `multiple-senses` coverage record links all three candidates to JMdict 2261490 senses 1–2. It binds the original reference hash and exact candidate set, and validates dictionary membership, sense restrictions, effective/dictionary gloss agreement and cited reference glosses. The compiler rejects missing candidates, stale references and single-sense claims. The row remains structurally `ambiguous`, with its coverage attached, rather than falsely choosing one card. These are authored lexical decisions, not teacher signoffs or level approval.

The dictionary matcher and schema live in one shared module, re-exported through the original audit API for assessment compatibility. The loader retains sense metadata and accepts explicitly requested correction-entry IDs, reading corpus/reference files before dictionaries regardless of lock order. The correction overlay, raw audit and catalog reuse the same pair validator.

### Unmatched-reference decisions

[reference-decisions.json](../apps/web/data/japanese-content/reference-decisions.json) binds all **127** pre-supplement unmatched rows to their original hashes and the unchanged source-lock digest. The compiler requires exactly one decision for every row in that queue, rejecting omissions, extra/matched rows, duplicates and source drift.

There are **113 dictionary supplements**. Each explicitly selects permitted senses for the exact reference spelling/reading. The compiler derives meanings and POS only from those selected dictionary senses; callers cannot supply arbitrary words, levels or meanings. Spelling/reading restrictions use the same validator as construction and multi-sense evidence. The original reference gloss, community level and dictionary ID remain in reconciliation. New content uses the reference level as provenance, not an official JLPT endorsement. No original vocabulary record is overwritten or dropped.

There are **14 character-reading decisions**, all on-readings. Each links to an existing source character card whose complete on/kun sets pass KANJIDIC2 verification, and checks the specific reading against both sources. These are character coverage, not invented standalone vocabulary. For example, 幹/かん is covered by the 幹 character card; the reference's linked vocabulary entry permits 幹/みき. Its original reference row remains structurally `unmatched` as vocabulary, with `resolution.cardIds` pointing to the character card. Character cards also retain those reference-row links.

The vocabulary decisions include **32 corrected gloss rows and three blank-gloss rows**, with the remaining 78 marked compatible with selected senses. Corrections are authored lexical decisions, checked structurally against pinned dictionary evidence, not an automatic semantic proof. Examples include 軒/けん as a building counter rather than eaves, 生/せい as life rather than raw/draft beer, 柄/がら as pattern rather than a handle, and 訳/やく as translation rather than reason. The inspection sense is selected for チェック, while unrelated plaid/bill/chess senses remain outside the addition. For ｘ/バツ, the cross-mark sense is selected, excluding its unrelated slang sense. 館/たち explicitly uses current entry 2868182 instead of the reference's older ID 1216210.

Usage labels and notes matter: たれ's derogatory suffix is not presented as a neutral adjective, and 頃/けい retains the linked dictionary's rare land-area-unit meaning rather than the reference's incorrect time gloss. Neither rarity nor community-list inclusion decides a final deck placement. [EDRDG's tag guide](https://www.edrdg.org/wwwjdic/wwwjdicinf.html) documents the dictionary's usage labels. The full-source search and per-row screen are research; the tracked decisions and pinned bytes make the resulting draft reproducible.

## Current corpus and next work

The catalog retains the **7,811 original vocabulary records and 2,383 original kanji records**, adding 113 reference vocabulary candidates for **7,924 vocabulary records and 10,307 total card IDs**. These are draft import records, not 10,307 deduplicated final learning concepts. Vocabulary has **7,908 direct dictionary matches, 12 supported constructions and four source-attested phrases**. All 2,383 kanji still pass complete on/kun checks. The 172 supplementary/inferred kanji remain labelled.

All **8,293 reference rows** remain: **8,278 match vocabulary, one has explicit multi-sense coverage and 14 have explicit character coverage**. The structural audit still calls the latter 14 unmatched as vocabulary; `referenceCoverage.unresolvedUnmatchedRows` and `unresolvedAmbiguousRows` are both zero. These counts do not approve canonical grouping, senses, examples or levels. There are 408 level disagreements, 29 reference/dictionary ID differences and 682 vocabulary records without examples, plus reference-source gaps. The extra dictionary-ID difference is the disclosed 館/たち update; the extra missing examples are the 113 additions. The original research audit remains unchanged (33 dictionary failures, 3 ambiguous and 135 unmatched rows).

The [canonical study handoff](japanese-study-catalog.md) records all 161 overlap-family decisions and all 408 level-disagreement outcomes. Sixteen explicit variant groups produce 10,291 study units while retaining all 10,307 source records and all references. Answers remain member-specific, and context-sensitive spellings/readings remain distinct. Raw source classifications and diagnostics are retained.

Section 5f has since connected the canonical identities to [subject-scoped draft persistence and the shared scheduler](japanese-study-persistence.md), and section 5g adds [member-bound prompts, grading and the progression policy](japanese-study-prompts.md). The explicit import command loaded the local Japanese draft; the content compiler remains database-free. Next are the authenticated queue and review-saving flow, then the study interface. Review learner-facing senses/examples before publication. Modern JLPT has no exhaustive official word/kanji list; coverage refers to the pinned community corpus.

No interface or style changes are part of this increment. Japanese study surfaces will use Impeccable and the existing design system when implemented.

## Content compiler verification (section 5e)

TDD red/green covers the import/correction/reference contracts and canonical grouping/level decisions. The content suite has **116 passing tests**, including 11 added in section 5e. Real pinned-cache integration verifies all 127 reference decisions, the canonical mapping of every source/reference identity, preserved kanji levels, key semantic separations, 39 original correction snapshots and all three phrase-source checksums. It skips when the complete cache is absent. The remaining tests use synthetic fixtures without downloads. The 262 Japanese placement regressions, TypeScript and focused ESLint pass; eight optional database tests are skipped. Browser suites were not run for this data/tooling change. The raw source audit remains unchanged; both catalogs build and pass `--check`, which rejected the stale summary before regeneration.

The content compiler changes through section 5e did not change a database, learner account, running preview server or publication state. Section 5f's later local draft import is documented separately above. Brandon retains all commit/push responsibility.
