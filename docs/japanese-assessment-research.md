# Japanese assessment repository research

Checked 2026-10-22 for section 4e of [the mirror plan](../MIRROR_PLAN.md). Research only: no application code, question import, publication, database data, commit or push changed in this pass.

**N2/N3 follow-up:** the [targeted solution proposal](japanese-n2-n3-solution.md) adds a licensed twenty-passage N3 reading collection, an MIT N2 reading seed (three passages/six questions), and a defined authoring path for expanded N2 reading and both levels' sentence assembly. It also records concrete defects found in a large generated bank. This narrows the gaps below without claiming a completed five-level import.

**Implementation follow-up:** the accepted reading/construction authoring targets now have 300 private draft items across N5–N1. N5 uses selected JLPTSuccess content; N4 uses Japaneseness's licensed twenty-passage collection; N1 uses selected Yomitaku readings. Nihongo-mono examples supply the remaining construction work. The [content handoff](japanese-placement-content.md) records source-preserving excerpts, question/order adaptations and the source-selection ledger. No starred-position key is treated as a complete ordering, no audio/free-response tasks are imported, and no source review flag is represented as human approval. This does not complete the other four domains, learner calibration or publication; the research findings below remain the original candidate audit.

## Finding and recommended direction

An actual N5–N1 diagnostic repository exists: **christopherliu830/jlpt-check**. Its committed YAML contains vocabulary/grammar questions for every level, answer keys and complete sentence-order keys. It is a close functional match, but the checked repository has no reuse licence and the files identify the official 2012 JLPT workbook as their source. Public visibility does not establish permission to republish those questions.

There are also original, openly licensed question collections that can reduce authoring substantially: **JLPTSuccess** for N5 and some N4 material, and **Yomitaku/Kumitaku** for N1 reading/grammar/construction. **nihongo-mono** and **Hanabira's content repository** supply structured grammar examples across all five levels, useful for filling the remaining gaps. Those examples are source material, not finished assessment questions.

Recommend reusing question content through one importer into our existing Japanese assessment contracts. Begin with the ready-made text questions and full-order sentence items, then measure coverage by domain and level. In the candidates checked here, **N2/N3 passage comprehension and fully keyed sentence assembly remain the main gaps in a directly reusable question collection**. Keep those gaps explicit rather than relabelling vocabulary quizzes or tiny fixtures as complete tests. No second assessment app or engine is needed.

This search did not verify a complete, openly reusable, calibrated N5–N1 placement instrument matching all six of our domains. It does establish that creating every question from scratch is unnecessary. The distinction matters: existing N-level labels can anchor a provisional lesson-placement assessment, but none of the checked repositories supplied validated response likelihoods for our particular adaptive model. Model defaults authored from those labels must be described honestly and checked as learner evidence becomes available.

## Closest complete diagnostic implementation

### christopherliu830/jlpt-check

- [Question directory](https://github.com/christopherliu830/jlpt-check/tree/bd28c7b4b4a42d90a72735de058718b5a2e91e8e/packages/jlpt-exams/exercises): ten files, vocabulary and grammar for each of N5, N4, N3, N2 and N1. Filenames identify the 2012 source workbook.
- [Question types](https://github.com/christopherliu830/jlpt-check/blob/bd28c7b4b4a42d90a72735de058718b5a2e91e8e/packages/jlpt-exams/directives.yml): word readings, orthography, grammar completion, meaning, usage and ordered completion. Here “reading” means reading a word, not a passage-comprehension test.
- [N1 grammar data](https://github.com/christopherliu830/jlpt-check/blob/bd28c7b4b4a42d90a72735de058718b5a2e91e8e/packages/jlpt-exams/exercises/2012N1G.yml): scalar answer keys and full permutations for ordered completion; difficulty anchors are present. The web source also contains IRT utility modules. Their presence is not evidence of learner calibration.
- The checked root has no LICENSE file or explicit reuse grant. The N1 data also contains transcription/furigana errors; importing its structure would not remove those defects.
- Decision: strongest format reference and a possible rights-clearance lead. Do not redistribute the question text on the basis of the repository alone. The official [JLPT FAQ](https://www.jlpt.jp/e/faq/index.html) identifies organizer/third-party question rights; permission for the actual question content must come from the relevant rights holders.

## Original question collections worth adapting

### gauravhq/JLPTSuccess — N5 and partial N4

The [root README](https://github.com/gauravhq/JLPTSuccess/blob/708a995691dcd0983e2ede47db423281b1cd343a/README.md) marks N5 active, N4 paused, and N3–N1 coming soon. It is not a completed five-level collection.

The actual [N5 questions.json](https://github.com/gauravhq/JLPTSuccess/blob/708a995691dcd0983e2ede47db423281b1cd343a/N5/data/questions.json) contains **284 records: 254 multiple choice, 16 sentence-order, 14 text input**. These counts were calculated from the array; its older metadata still says 290. The 16 sentence items include explicit `tiles` and `correctOrder`, an unusually close match to our automatic construction format. Exclude the 14 text-input questions under our product requirements. The [version file](https://github.com/gauravhq/JLPTSuccess/blob/708a995691dcd0983e2ede47db423281b1cd343a/N5/data/version.json) also reports 54 reading passages and 402 paper questions across 28 subject papers; these are not additive counts of verified unique placement items.

N4's [standalone questions file](https://github.com/gauravhq/JLPTSuccess/blob/708a995691dcd0983e2ede47db423281b1cd343a/N4/data/questions.json) is empty. Its paper manifest lists 402 questions, while its [reading file](https://github.com/gauravhq/JLPTSuccess/blob/708a995691dcd0983e2ede47db423281b1cd343a/N4/data/reading.json) actually contains 10 passages and 26 questions. A sampled N4 grammar paper asks learners to identify a grammar expression by an English meaning; that is a different task from constructing or comprehending Japanese. Content selection matters more than the folder label or total count.

The [root licence](https://github.com/gauravhq/JLPTSuccess/blob/708a995691dcd0983e2ede47db423281b1cd343a/LICENSE) explicitly separates MIT software from **CC BY-SA 4.0 educational content**. The older [N4 content notice](https://github.com/gauravhq/JLPTSuccess/blob/708a995691dcd0983e2ede47db423281b1cd343a/N4/CONTENT-LICENSE.md) says CC BY 4.0, so the source terms have drift. Preserve the notices and use the stricter root share-alike terms for a derived collection unless clarified. The [N5 provenance notice](https://github.com/gauravhq/JLPTSuccess/blob/708a995691dcd0983e2ede47db423281b1cd343a/N5/CONTENT-LICENSE.md) explicitly explains that its “native reviewed” flags refer to an LLM reviewer persona. Do not present those flags as human Japanese-teacher validation.

Decision: good first import candidate, especially N5 sentence assembly and selected reading/choice items. Audit actual records, ambiguity, duplication and skill mapping before serving them.

### Mocas-12/jlpt-n1-Yomitaku — N1 reading

The [README](https://github.com/Mocas-12/jlpt-n1-Yomitaku/blob/2f4ed8ef8c1ac3da343d4adac86969acfe23aaac/README.md) describes **1,034 original mock sets / 2,000 questions**, with passages, choices, keys and explanations across six reading task types. The bank is committed in six data shards. The sampled short-reading shard contains 336 question records. The project is [MIT licensed](https://github.com/Mocas-12/jlpt-n1-Yomitaku/blob/2f4ed8ef8c1ac3da343d4adac86969acfe23aaac/LICENSE) and explicitly distinguishes its original mocks from copyrighted past papers.

Decision: substantial N1 reading candidate. The large advertised count has not been independently checked item by item, nor has its N1 difficulty been validated in this pass. Some item types use multiple passages or visual information and will need a deliberate projection into our text-only item model. Explanations need not be imported into the learner assessment.

### Mocas-12/jlpt-n1-Kumitaku — N1 grammar and assembly

The [README](https://github.com/Mocas-12/jlpt-n1-Kumitaku/blob/87bafea1e360a2b88d94cd3f4447b50de9dcf48c/README.md) describes **1,004 original questions: 590 grammar-form and 414 assembly items**, under MIT. The [assembly shard](https://github.com/Mocas-12/jlpt-n1-Kumitaku/blob/87bafea1e360a2b88d94cd3f4447b50de9dcf48c/js/bank/kumi.js) really contains 414 question records.

Important format difference: the numerical key identifies the fragment occupying the starred slot, not the complete order. Our assessment checks the whole construction. Full accepted permutations must therefore be established, including alternative grammatical orders. A sampled `km-01` item asserts a unique place-adverb position even though an alternative natural ordering is possible. A collection's assertion of uniqueness is not sufficient validation. Also, the N1-labelled file includes simple daily-action constructions; do not assume every row is an N1 difficulty anchor.

Decision: useful construction/grammar candidates, with more conversion and ambiguity work than the N5 explicit-order source. Do not turn the starred-slot key directly into a single accepted full permutation.

## Five-level material for filling gaps

### stndaru/nihongo-mono

Actual per-level [grammar JSON](https://github.com/stndaru/nihongo-mono/tree/ec0ba4a0ce1611c568b0e4f8a223eb8029249a25/src/data/grammar) counts:

| Level | Grammar entries | Example sentences |
| --- | ---: | ---: |
| N5 | 119 | 238 |
| N4 | 189 | 378 |
| N3 | 248 | 496 |
| N2 | 208 | 416 |
| N1 | 267 | 534 |
| Total | 1,031 | 2,062 |

Entries include level, formation, usage warnings, English meanings and Japanese/English examples with furigana. Its [data licence](https://github.com/stndaru/nihongo-mono/blob/ec0ba4a0ce1611c568b0e4f8a223eb8029249a25/LICENSE-DATA.md) explicitly grants **MIT for its original grammar explanations/examples**; dictionary and kanji data carry separate upstream terms. This distinction is more useful than a blanket software licence badge.

Decision: strong five-level source for adapting original construction/context questions. It supplies grammar material rather than ready-made distractors, comprehension questions, full tile keys or calibrated assessment items. Its per-entry source labels reference study inventories; independent linguistic accuracy is still unverified here.

### tristcoil/hanabira.org-japanese-content

The separate [content licence](https://github.com/tristcoil/hanabira.org-japanese-content/blob/1462bb37f0eb229fea58a18eb4855428bdbffa25/LICENSE) explicitly says **CC BY 4.0**, with Hanabira attribution required by its README. This is distinct from the main app's MIT software licence.

The five [grammar JSON files](https://github.com/tristcoil/hanabira.org-japanese-content/tree/1462bb37f0eb229fea58a18eb4855428bdbffa25/grammar_json) contain **828 entries**: N5 136, N4 124, N3 132, N2 191, N1 245. They include formations, explanations and translated examples. These counts were calculated from the files. The main site now advertises exam drills, but those current drills were not found in the checked public release/content paths, so their availability on a website is not evidence that their question bank can be imported from these repositories.

Decision: another useful source of grammar examples across all levels, especially N2/N3, with adaptation required. The broader sentence directory references textbook-derived inventories; it was not cleared as a blanket import in this research pass.

## Other candidates checked

| Candidate | Result |
| --- | --- |
| [5Mcv4He/jlpt-freq](https://github.com/5Mcv4He/jlpt-freq) and its eulerex/jlpt-test fork | 158 historical sessions across N5–N1, with OCR text and partial answer keys. No repository reuse licence found; underlying past-paper rights remain. Its own README reports answers for only 20% of N5 and 43% of N4 sessions. Not a direct import candidate. |
| [VictorAurelius/2026-Smart-Quiz](https://github.com/VictorAurelius/2026-Smart-Quiz/blob/main/svelte-app/src/lib/data/exams/papers.ts) | Actual committed papers are small fixtures plus generated vocabulary quizzes: N5 36 questions; each other level 30. Only 8 non-vocabulary items for N5 and 4 for each other level. The README's full-mock framing overstates the committed material. Not a substantial five-level placement bank. |
| [hatwarsanskar95-web/japanese-JLPT-learner](https://github.com/hatwarsanskar95-web/japanese-JLPT-learner) | Questions labelled N5–N1, but no licence found and sampled items contain ambiguous answer choices. Do not import on the strength of its coverage claim. |
| [csolis-97/japanese-placement-test](https://github.com/csolis-97/japanese-placement-test) | Actual placement app and SQL seeds, GPL-3.0; five stages cover Minna no Nihongo Beginner I and some Beginner II. Its “Advanced” stage is not evidence of N1 coverage. |
| [OlSeb/JLPT-N3](https://github.com/OlSeb/JLPT-N3) | Diagnostic, reading and exam JSON are described, but no explicit reuse licence was established. A permission lead, not a cleared N3 collection. |
| [realdavian/jlpt-quiz](https://github.com/realdavian/jlpt-quiz) | MIT app code, but its questions are a separate jlpt-quiz-data submodule; the referenced public data repository returned 404. The software licence does not supply the missing data. |
| [joppe2001/NihonMaster](https://github.com/joppe2001/NihonMaster) | README advertises all-level content, but the checked public root only exposes README/docs/assets. The advertised assessment content was not available there for verification/import. |
| [iamcheyan/jlpt-drill](https://github.com/iamcheyan/jlpt-drill/blob/master/data/SOURCES.md) | Follow-up correction: its README declares MIT, though no standalone licence or content-specific terms were found. Actual N3 reading placeholders and a malformed N2 assembly example make it unsuitable for direct import; see the targeted N2/N3 report. |
| [OpenJLPT](https://github.com/evanclan/OpenJLPT) | Useful vocabulary/kanji/grammar foundation already audited in section 1. It does not supply a complete placement-question collection. |
| [hikma-exam/core](https://github.com/hikma-exam/core) | Architecture/specification. The named public hikma-jlpt implementation path returned 404. No reusable implemented bank established. |

## Integration sequence after the research decision

1. Select a source revision and preserve its content terms/attribution. Normalize with one importer and source IDs/hashes; reject duplicate identities/exercises. Keep the source records separate from our curated bank.
2. Start with N5 explicit-order sentence questions and selected original reading/choice questions. Exclude text-input/audio items. Report what survives the audit by level and domain, including every rejected row and reason.
3. Evaluate N1 reading/grammar candidates and establish complete accepted sentence orders rather than relying on starred-slot keys. Check alternatives and level anchors. Use the five-level grammar/example sources for targeted gap filling.
4. Finish the N2/N3 passage/construction gaps and any missing kana/reading/word-use coverage. Existing labels are a starting point; do not advertise official or empirically validated proficiency from labels alone.
5. Exercise the real imported content through start/resume/timeout/automatic result and the authorized teacher result view. An individual learner still completes and receives the result automatically, with no teacher marking or approval step.

No source maintainer or rights holder was contacted. Software and content licence statements above record what their publishers declare; they do not establish authorship or accuracy independently. No repository code or question set was executed or imported into the app.

Search method: broad web searches and direct GitHub reads, followed by public GitHub repository search for `jlpt test`, `japanese placement`, `jlpt quiz`, `jlpt assessment` and `jlpt license:mit`. The search result sets were screened for actual content paths and subject relevance; selected candidates above were inspected beyond README claims. JSON counts were computed directly; JS shards were inspected as data text without executing them. This is a bounded audit of the checked candidates, not a proof that no other suitable collection exists.
