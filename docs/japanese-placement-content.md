# Japanese placement content catalog

Section 4e authoring increments, 2026-10-22–23, on `the-mirror`. The declared authoring targets now cover all six domains across **N5–N1**, with **470 draft items in three packs**. Kana is an N5 literacy check only. This is not a published assessment or a calibrated JLPT instrument. There is no listening, recording, free-text response or teacher marking queue.

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

`yarn japanese-placement:content --items` writes all 470 **private keyed items** to stdout in the existing Japanese item format, with deduplicated source notices. Keep any saved export outside `public/`. This remains an uncalibrated authoring pool, not a bank snapshot: there are no approvals, assessment policy or guessed likelihoods. Every item's calibration is `null`.

Validation rejects unrecognized fields/response types, duplicate content or source identities, unknown source references, missing/duplicated choices, incomplete tile permutations, missing retained sentences, evidence quotes absent from a passage, source-level/text disagreement, unused excerpts and changed local file hashes. Editing a question or key requires a revision increment and corresponding lock refresh; editing retained upstream text requires a new source adaptation/excerpt workflow rather than falsely claiming exact preservation.

Verification for the five-level increment: demonstrated red/green cycles followed by **132 Japanese placement tests, 35 corpus tests and 367 mirror regressions passing (534 total)**, with full TypeScript and focused ESLint passing. The content coverage check passes; the publication check still refuses the draft bank. The five placement database tests and one mirror database test remain opt-in and were not run in this content-only increment; three existing booking placeholders remain TODO. No browser server, database fixture or persistent process was started. The earlier N2/N3 increment passed 526 tests across those suites.

Latest verification: TDD red/green, **145 Japanese placement tests, 35 corpus tests and 367 mirror regressions pass (547 total)**, with full TypeScript and focused ESLint. The content strict check passes; the publication check still rejects the unpublished sample bank. Existing opt-in database tests were not rerun for this data/import change. No browser, database fixture or persistent process was started.

## Remaining section 4e work

1. Integrate the full 470-item pool with TDD. The current bank schema caps its pool at 120 items; increase that capacity before consuming this catalog. Preserve passage identities and ensure two questions on one text do not inadvertently count as independent evidence. The served question budget remains separate.
2. Review content, distractors, provisional anchors and alternative tile orders across the assembled pool. Source labels and authoring labels do not establish validated placement difficulty. This is reusable bank content work, never individual student review.
3. Validate response likelihoods, timing, evidence minima and level interpretations with learner data. Some construction tasks test a short grammatical phrase inside fixed context; source-band tags alone cannot show that they distinguish N2 from N3 learners.
4. Publish the resulting versioned snapshot after those checks, then run the real-bank learner completion and teacher-result journeys already specified in the plan. No per-attempt marking or pre-lesson response review is introduced.

See [the accepted source proposal](japanese-n2-n3-solution.md) for pinned primary sources and [the mirror plan](../MIRROR_PLAN.md) for the wider sequence. Brandon retains commit and push responsibility.
