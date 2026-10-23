# Japanese placement content catalog

Section 4e authoring increments, 2026-10-22–23, on `the-mirror`. The declared authoring targets now cover all six domains across **N5–N1**, with **470 draft items in three packs**. Kana is an N5 literacy check only. This is not a published assessment or a calibrated JLPT instrument. There is no listening, recording, free-text response or teacher marking queue.

The current catalog and all three authoring packs are **revision 2** after the initial [editorial screen](japanese-placement-quality.md). Eleven records were corrected while preserving stable item/passage IDs and all upstream excerpt bytes. That handoff records the reviewed digest, specific corrections and the remaining calibration limits; it is not an independent content approval.

| Band | Reading passages | Choice questions | Sentence assemblies | Content |
| --- | ---: | ---: | ---: | --- |
| N5 | 20 | 40 | 20 | JLPTSuccess readings and sixteen reworked full-order tasks; four nihongo-mono examples |
| N4 | 20 | 40 | 20 | Japaneseness passages; nihongo-mono sentence examples |
| N3 | 20 | 40 | 20 | Japaneseness passages; selected/adapted comprehension questions; nihongo-mono sentence examples |
| N2 | 20 | 40 | 20 | Three Kotonoha passages/six questions; seventeen original passages/thirty-four questions; nihongo-mono sentence examples |
| N1 | 20 | 40 | 20 | Yomitaku arguments, paired texts and notices; nihongo-mono sentence examples |
| Reading/construction subtotal | 100 | 200 | 100 | 300 automatically scoreable draft items |

The word-level pack adds twenty N5 kana checks and ten kanji-reading, ten vocabulary and ten grammar choices at each of N5–N1 (170 additional items). There are 110 N5 items and ninety at each other band. These are bounded authoring targets, not claims of exhaustive JLPT content or validated placement coverage.

N3 has narrative, notice, email, opinion, interview and guide texts. N2 adds paired opinions and covers information retrieval, detail, inference, purpose and main idea. The N3 reading tasks have 21 detail, seven inference, seven main-idea, four information-retrieval and one purpose questions. N2 has fifteen detail, nine inference, seven main-idea, seven information-retrieval and two purpose questions. These are authoring classifications, not empirical difficulty estimates.

## Files and shared implementation

- [`n2-n3-content.json`](../apps/web/data/japanese-placement/n2-n3-content.json): editable passages, questions, evidence quotations, sentence contexts, tiles, accepted orders and source/change records.
- [`remaining-levels-content.json`](../apps/web/data/japanese-placement/remaining-levels/remaining-levels-content.json): the additional 180 N5/N4/N1 draft items through the same contract.
- [`source-excerpts.json`](../apps/web/data/japanese-placement/source-excerpts.json): 63 retained source records: twenty N3 passages, three N2 passages and forty grammar examples. Reading excerpts retain the original multiple-choice keys for comparison. The file records the original download URLs and SHA-256 hashes; these identify the retrieved upstream versions, while the local lock verifies the checked-in excerpts. The audit runs offline and does not re-download or independently authenticate upstream material.
- [`remaining-levels/source-excerpts.json`](../apps/web/data/japanese-placement/remaining-levels/source-excerpts.json): 120 additional retained records plus a 1,439-row source-selection ledger. Together these two reading/construction packs retain 183 external records. Paired-text excerpts combine source A and B with explicit Japanese labels; N5 construction excerpts are derived from the source's full `correctOrder`, with punctuation added and disclosed.
- [`content-lock.json`](../apps/web/data/japanese-placement/content-lock.json) and the [remaining-levels lock](../apps/web/data/japanese-placement/remaining-levels/content-lock.json): schema-v2 manifests pinning each pack's content and excerpts by role and SHA-256. A change requires an intentional lock update and content review; hashes are not linguistic approval. The original N2/N3 content bytes are unchanged; only its lock gains explicit file roles.
- [`licences/`](../apps/web/data/japanese-placement/licences/): upstream MIT notices, nihongo-mono's content-specific terms, and JLPTSuccess's software/content notices. Japaneseness and JLPTSuccess adaptations retain CC BY-SA 4.0 attribution, licence URLs and change notices. Original N2 drafts remain separately identified as AI-assisted project content under CC BY-SA 4.0.
- [`content-pack.ts`](../apps/web/src/lib/japanese-placement/content-pack.ts) and [`content-files.ts`](../apps/web/src/lib/japanese-placement/content-files.ts): one importer/validator for all bands. They reuse the bank's source schema, normalization, uniqueness and item validation, and the corpus tooling's integrity checker. Catalog merging deduplicates identical source notices and rejects conflicting notices or repeated exercises. The English assessment is not imported or changed.

Everything stays outside `public/`. The existing learner projection remains responsible for withholding keys, accepted orders and explanations. There is no database migration, seed, new bank activation or application route in this increment.

## N2/N3 curation decisions

Japaneseness's original passage text is retained without furigana, vocabulary glosses, translations, copy exercises or the fourth, free-response question. Each passage retains its first multiple-choice task with normalized spacing. The second selected task is a comprehension adaptation, often emphasizing meaning, purpose or an implication rather than another factual lookup. All three original choice questions remain in the private source excerpt for comparison; forty of the resulting tasks are imported, not all sixty source questions.

The train worksheet's second source question asks about the bus interior although the keyed information concerns road congestion. That question is excluded. The replacement asks why the manager could keep the schedule, which the passage explicitly explains. Other adaptations include the purpose of greeting neighbours, the writer's recommendation about working locations, and an inn reviewer's revised interpretation of its rules.

Kotonoha's three original N2 passages and six question/answer texts are retained. Only its reading material is used; its grammar and dictionary provenance is different. The additional seventeen passages are newly authored fictional texts, with two keyed questions each. No official JLPT question text is copied.

All eighty reading questions have an exact passage quotation supporting their key. Quotation presence can be validated mechanically; whether a key follows uniquely and distractors are fair still requires linguistic judgment. Correct choice positions are balanced: N3 has 14/13/13 across its three positions; N2 has 10/10/10/10. Retained upstream answer text is checked independently of reordered choices.

Each construction uses a distinct grammar target from its source band. The original Japanese example is preserved exactly, with one blank and fixed surrounding context. Tiles have opaque stable identities and start in an incorrect order. Two exercises explicitly include a natural alternative order: N3 `上で` allows either placement of `よく` relative to `家族と`; N2 `以上は` allows either order of `最後まで` and `責任を持って`. Each accepted order uses every tile once and passes the existing scorer. This is an initial ambiguity check, not a claim that automated validation can identify every grammatical alternative.

## N5/N4/N1 curation decisions

The additional pack retains twenty N5 reading texts from [JLPTSuccess's pinned original-content collection](https://github.com/gauravhq/JLPTSuccess/blob/708a995691dcd0983e2ede47db423281b1cd343a/N5/data/reading.json), with two source questions each. Its sixteen explicit-order tasks are adapted with fixed context, meaningful phrase grouping and full keys; four original grammar examples fill the twenty-task target. Eight tasks accept an additional natural order, including place/object and floating-counter placement. Source explanations that incorrectly imply those orders are unique are omitted. Source `native_reviewed` flags refer to an AI persona, as its content notice discloses; none is carried forward as human approval.

N4 uses the twenty [Japaneseness N4 worksheets](https://japaneseness.com/reading-n4/), generally selecting source questions 1 and 3. The pets text uses questions 2 and 3, avoiding a test item about external population statistics. The sale-notice question explicitly assumes gift stock remains. Furigana, glosses, translations, free responses and copy tasks are removed. The standalone N4 question file in JLPTSuccess is empty, so it is not used to imply a complete N4 pool.

N1 uses ten arguments, five paired-text sets and five text notices from [Yomitaku's pinned original mock bank](https://github.com/Mocas-12/jlpt-n1-Yomitaku/tree/2f4ed8ef8c1ac3da343d4adac86969acfe23aaac/js/bank). Chinese labels/explanations and source timing hints are omitted. The source passages are preserved; adaptations are recorded per passage. In particular:

- Three paired-text tasks are replaced with questions about an explicit claim or concern, avoiding overstated disagreement or overlapping contrast options. The picture-book question is narrowed to writer B's stated emphasis.
- Applicant scenarios now state solo attendance or non-management status where those facts determine the key. A gym question explicitly specifies individual use.
- One manual-handover distractor is rewritten so it cannot be confused with the author's qualified warning about generalization.
- Questions comparing two texts retain support from both texts; the validator checks every supporting quotation. The Japanese rendering of the combined source includes A/B labels.

The twenty N4 and twenty N1 constructions preserve original [nihongo-mono examples](https://github.com/stndaru/nihongo-mono/tree/ec0ba4a0ce1611c568b0e4f8a223eb8029249a25/src/data/grammar). N4 appearance/hearsay `そうだ` targets are named separately rather than treating identical surface forms as the same use. Kumitaku's starred-position keys are not imported as full-order answers; source membership alone does not demonstrate N1 difficulty.

The new source-selection ledger accounts for **1,439 records: 120 selected, 1,305 deferred and 14 excluded**. Its units are passage records, N5 question records and grammar-entry first examples, not every individual question/example in every upstream file. The selected rows match the 120 retained external records exactly. Deferred rows include the 254 N5 multiple-choice candidates deferred at that stage to word-level curation and content outside this bounded selection; deferred does not mean incorrect. Fourteen N5 text-input tasks are excluded by the product requirement. No free-response or audio asset is imported.

All new reading keys have exact evidence quotations. Correct answer positions are balanced at 10/10/10/10 for N5 and N1 and 14/13/13 for N4. The tests compare retained keyed text against the private source keys independently of choice order. These are content integrity checks, not proof of linguistic correctness or empirical difficulty.

## Kana and word-level curation — 2026-10-23

The third pack, [`word-level/word-content.json`](../apps/web/data/japanese-placement/word-level/word-content.json), adds 170 choices through the same importer. Its [private source excerpts](../apps/web/data/japanese-placement/word-level/source-excerpts.json), [role-based lock](../apps/web/data/japanese-placement/word-level/content-lock.json) and [attribution/change notice](../apps/web/data/japanese-placement/word-level/ATTRIBUTION.md) retain 150 additional external records and sixteen source-file hashes. The full catalog has 333 excerpts and nine deduplicated source notices.

The 100 lexical records are distinct words selected from the earlier OpenJLPT corpus audit: fifty contextual word readings and fifty vocabulary clozes. Every selection has a dictionary-verified spelling/reading pair and a resolved same-band Waller reference match. The excerpt retains JMdict spelling restrictions and both source readings when they differ legitimately. The importer reuses the corpus dictionary matcher rather than inferring compound readings from character readings. It rejects wrong answers that are another valid reading, or another spelling of the same dictionary entry. It caught and removed 図書館「ずしょかん」and 案内「あない」as distractors. Both「きょうぞん」and「きょうそん」are valid for 共存 and remain supported evidence, never wrong choices. All contexts/distractors are newly authored; no Tatoeba examples are imported.

The fifty grammar choices retain ten JLPTSuccess N5 MCQs and forty nihongo-mono second examples, ten each N4–N1. Source keys or complete source sentences are preserved; questions have one blank, balanced positions, private explanations and explicit completion checks. Additional Japanese context disambiguates quantity thresholds, self-directed humble language, emphatic negation, parallel participants and result/concession meanings. The N5 stems retain their Japanese scenario where demonstratives depend on it. Generic instructions have English/Japanese versions without translating the assessed Japanese context or giving an answer.

Twenty original kana choices cover both script directions, voiced/semi-voiced marks, small kana, gemination and loanword long-vowel notation. Choices must all use the requested opposite script. These are N5 literacy checks; the existing adaptive policy independently prevents kana from distinguishing N5 through N1.

The new 394-row ledger records 150 selected excerpts and 244 deferred N5 MCQs. Its universe is the 100 selected lexical records, forty selected second examples and all 254 N5 MCQ candidates. It does not account for every upstream word or grammar example. Earlier deferrals remain a record of the earlier stage, including the ten N5 MCQs now selected here; do not add ledger counts as if they were disjoint source universes.

These source bands remain provisional. Some grammar distractors test form recognition and may be much easier than the source tag suggests. Dictionary identity checks cannot establish contextual synonym fairness. None of these selections resolves the outstanding full flashcard corpus queues or replaces content judgment and learner calibration. The importer does not create approvals, likelihoods, an assessment policy, a database bank or learner access.

## Reproduce the offline checks

From the repository root:

```sh
yarn japanese-placement:content
yarn japanese-placement:content --json
yarn japanese-placement:content --strict
yarn test:japanese-placement
```

`--strict` here checks the declared **six-domain authoring target**: at least twenty passages with two questions each, twenty constructions, and ten choices in each of kanji-reading, vocabulary and grammar per band; kana requires twenty N5 items and is prohibited at higher bands. Its JSON report explicitly scopes coverage to `six_domain_authoring`. Its success does not mean student publication or empirical difficulty is ready. The separate `japanese-placement:audit --strict` still checks the existing bank's publication requirements and fails while they remain unresolved.

`yarn japanese-placement:content --items` writes all 470 **private keyed items** to stdout, retaining `referenceBand` and reading `passageId` metadata. `--bank` exports the complete validated schema-v4 bank, including its deterministic sequence and source notices. The export flags are mutually exclusive. Keep any saved export outside `public/`. The compiled bank has null policy and reviews; every item's calibration is `null`. Neither export activates it for learners or writes a database row.

Validation rejects unrecognized fields/response types, duplicate content or source identities, unknown source references, missing/duplicated choices, incomplete tile permutations, missing retained sentences, evidence quotes absent from the displayed passage, source-level/text disagreement, unused excerpts and changed local file hashes. Editing a question or key requires a revision increment and corresponding lock refresh. An edited adapted passage may retain its exact upstream `original` privately; that field must match the pinned excerpt, belong to an adapted source and differ from the displayed text. The source excerpt itself is not rewritten to conceal an adaptation. Source/authoring metadata are not projected into learner questions.

Verification for the five-level increment: demonstrated red/green cycles followed by **132 Japanese placement tests, 35 corpus tests and 367 mirror regressions passing (534 total)**, with full TypeScript and focused ESLint passing. The content coverage check passes; the publication check still refuses the draft bank. The five placement database tests and one mirror database test remain opt-in and were not run in this content-only increment; three existing booking placeholders remain TODO. No browser server, database fixture or persistent process was started. The earlier N2/N3 increment passed 526 tests across those suites.

Verification for the word-level increment: TDD red/green, **145 Japanese placement tests, 35 corpus tests and 367 mirror regressions passed (547 total)**, with full TypeScript and focused ESLint. The content strict check passed; the publication check rejected the unpublished sample bank. Existing opt-in database tests were not rerun for that data/import change.

## Full-bank integration — 2026-10-23

The catalog now compiles into one schema-v4 private bank through `buildContentBank`. It does not maintain a second checked-in copy of the questions or a separate assessment engine. The v4 pool cap is 1,000, while attempt length comes from domain quotas (initial target 24, maximum sixty) and the timer remains twenty minutes. Provisional authoring bands remain separate from empirical `calibration.band`, so later calibration can revise item difficulty without erasing source provenance.

The 200 reading questions refer to 100 passages. Each attempt can use only one question from a passage, even if it is skipped. Selection, replay and posterior updates enforce that rule; readiness checks count distinct passages rather than question rows. All questions sharing a passage must agree on normalized stimulus text, reference band and sources. A single text cannot be split across different passage IDs. The other question remains available for a different attempt. PostgreSQL independently guards against recording another response from the same passage under its existing attempt lock.

Schema v4 uses policy `japanese-posterior-passages-v2` and scoring `japanese-reading-writing-passages-v2`. Schema v3 keeps its 120-item cap, original digest and `japanese-posterior-v1` / `japanese-reading-writing-posterior-v1` semantics. Active v3 attempts resume and finish with their original snapshot even after a v4 publication; finished v2/v3 results are not rewritten or regraded. One runtime implements both formats, and private grouping/reference fields never appear in learner questions.

The additive migration `20261023000000_japanese_placement_grouped_bank` is tested and applied locally. It expands capacity only for v4 and preserves existing rows. The full 470-item service journey, using only a test-fixture model and approvals, completes at 24 questions with four distinct reading passages in a disposable schema. No synthetic parameters are copied into content or the application database.

The default `yarn japanese-placement:audit --strict` now audits this full catalog and exits 1 while release inputs are absent; `--samples` selects the original twelve examples. `japanese-placement:content --strict` passes authoring coverage and native bank integration, and reports 100 independent passages. Neither success nor source-band membership establishes calibrated placement difficulty.

Integration verification: **162 Japanese placement unit/API/component tests, seven Japanese PostgreSQL tests, 367 mirror regressions, 35 corpus tests and one English PostgreSQL regression passed (572 total)**, plus TypeScript, focused ESLint and whitespace checks. No browser or production assessment was launched.

The subsequent editorial increment passes **173 Japanese placement tests, seven Japanese PostgreSQL tests, 367 mirror regressions and 35 corpus tests (582 total)**, plus TypeScript, focused ESLint and checksum/coverage checks. The English database regression was not repeated for this content change. [The editorial handoff](japanese-placement-quality.md) records the eleven corrected authoring records, 110 retained construction keys, disclosed sale-notice adaptation and format/difficulty risks. No approvals or likelihoods were assigned. No application data migration, publication, commit or push was introduced by that increment; temporary schemas/connections and task-owned processes were cleaned up.

## Remaining section 4e work

1. Complete independent content/rights checks against the revised digest. The initial AI-assisted screen and corrections are documented, including unresolved format/difficulty limits. Source labels and authoring labels do not establish validated placement difficulty. This is reusable bank content work, never individual student review.
2. Prepare an offline pilot-data/calibration workflow, then validate response likelihoods, timing, evidence minima and level interpretations with Japanese learner evidence. Some construction tasks test a short grammatical phrase inside fixed context; source-band tags alone cannot show that they distinguish N2 from N3 learners. The editorial handoff identifies the required data fields and study decisions.
3. Publish the resulting versioned snapshot after those checks, then run the real-bank learner completion and teacher-result journeys already specified in the plan. No per-attempt marking or pre-lesson response review is introduced.

See [the accepted source proposal](japanese-n2-n3-solution.md) for pinned primary sources and [the mirror plan](../MIRROR_PLAN.md) for the wider sequence. Brandon retains commit and push responsibility.
