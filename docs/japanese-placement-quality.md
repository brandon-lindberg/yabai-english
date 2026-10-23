# Japanese assessment editorial screen

2026-10-23, section 4e on `the-mirror`. This is an AI-assisted editorial screen of the private catalog, with regression tests for the corrections below. It is not an independent Japanese teacher approval, learner calibration, exhaustive proof of sentence-order completeness or authorization to publish.

Reviewed draft: `japanese-content-catalog` version 2, schema 4, 470 items. Its digest is:

```text
33ed9d52018f5a2d4cd615fbe2cfa3472fc303112eb6c2076c37516c52e40037
```

This record applies to that digest. Later content, provenance or model changes require a fresh check. The three authoring packs are revision 2; the 333 pinned upstream excerpt records and their file bytes remain unchanged. Item IDs, source records and passage IDs are retained.

## Scope and method

| Material | Count | What was screened |
| --- | ---: | --- |
| Reading choices | 200, from 100 passages | Questions, keyed answers, distractors, evidence quotations, conditional assumptions and comparisons of two writers |
| Kana choices | 20 | Requested script, small kana, voiced marks, long-vowel notation and unique keys |
| Kanji-reading choices | 50 | Displayed word/context and dictionary-backed readings; valid dictionary alternatives remain excluded from wrong answers |
| Vocabulary choices | 50 | Context, selected word, competing choices and retained dictionary identity evidence |
| Grammar choices | 50 | Cloze completion, source sentence/key, alternate readings of the question and grammatical competing answers |
| Sentence assemblies | 100 | Fixed context, supplied tiles and all 110 explicitly accepted visible orders |

The reading screen compared key/quotation alignment and competing options; it does not certify every factual assertion in source passages. Notices and narrative claims are assessed as reading material. The construction screen uses ordinary written Japanese in the supplied context; unrestricted conversational afterthoughts are not an exhaustive alternative-order inventory. No additional accepted order was confidently identified in this pass. The existing ten tasks with alternatives retain all 110 keyed orders across the hundred assemblies.

The N4 request/humble-language distinction was checked against the Agency for Cultural Affairs' [explanation of respectful and humble forms](https://www.bunka.go.jp/seisaku/kokugo_nihongo/kokugo_shisaku/keigo/chapter4/detail.html). The actor and recipient matter when choosing the form. No new passage or question was imported from that reference.

## Corrections

Eleven authoring records changed, affecting fourteen items: eight displayed question surfaces and six private evidence records. Correct answer positions remain balanced. Source attribution wording now accounts for reading edits, sentence assemblies and grammar choices consistently across the standalone packs.

| Record | Problem | Correction |
| --- | --- | --- |
| N3 `morning-habit`, q1/q2 | Waking at the last minute was described as being unable to wake; the compound q2 answer's phone premise had no supporting quote. | Ask about last-minute waking and retain the separate phone-exclusion statement. |
| N3 `volunteer-japanese-class`, q2 | The answer depends on experience, attitude and monthly availability; only the last condition was quoted. | Retain all three premises. |
| N2 `garden-views`, q1 | A shared claim had evidence from B alone. | Retain A's alternative roles and B's inclusion of other work. |
| N2 `translation-views`, q1 | A shared claim and B's qualification were supported only with B's words. | Retain A's revision proposal and B's agreement/condition. |
| N4 `japaneseness-the-town-festival`, q1 | A wrong answer described tent setup that the narrator also performed. | Ask specifically about the assignment carried out in three languages. |
| N4 `japaneseness-planning-a-trip`, q2 | The flexible third day could include either geographic destination listed as a wrong answer. | Ask how that day's schedule is planned. |
| N4 `japaneseness-a-notice`, q1 | The waterworks date changes if it rains. | State the no-rain assumption. |
| N4 `japaneseness-a-sale-advert`, q1/q2 | The notice first claimed every product was 20% off, then supplied exceptions and exclusions. | Scope the general rate to eligible products and introduce the following rates as exceptions. Keep the exact upstream text privately in `original`, verified against the unchanged source excerpt. |
| N5 `jlptsuccess-read-017`, q1/q2 | Addition and minimum-price answers require comparing two prices. | Retain both price premises for each key. |
| N1 `yomitaku-sim-togo4`, q2 | A broad wrong option about the essence of picture books encompassed the specific keyed claim. | Narrow the question to parent-child interaction and replace that option with a claim contradicted by the text. |
| N1 `grammar-sobireru` | The purported wrong ending produced the grammatical casual sentence `食べそびれてたの`. Other options were malformed inflections. | Test the complete compound's meaning with an explicit missed-opportunity context and three grammatical past-tense alternatives. The keyed completion still reproduces the source sentence exactly. |

The shared content contract now permits an explicitly edited adapted passage to retain its exact `original`. Provenance checks compare that field with the pinned upstream excerpt; quotations must still occur in the displayed text. Original-source overrides, unchanged overrides and mismatched source text are rejected. The original is not projected into learner questions. This corrects the notice without modifying the upstream evidence or claiming that the edited words are verbatim source text.

## What remains uncertain

The screen does not establish N5–N1 difficulty. In particular:

- Many grammar and construction tasks test a short morphological fragment. A source's advanced grammar label does not establish that the exercise discriminates advanced learners.
- There are eighty three-choice questions and 290 four-choice questions. Nominal uniform guessing rates are one third and one quarter. Construction guessing varies too: eight two-tile tasks have a 50% nominal rate; the other tasks range from about 4.17% to 33.33% depending on tile count and accepted orders. These are format baselines, not fitted response probabilities.
- Reading length is not monotonic by source band. Excluding whitespace, median passage lengths are 71.5 characters at N5, 302.5 at N4, 421.5 at N3, 330 at N2 and 440.5 at N1. Length alone does not measure linguistic complexity or justify a level.
- Dictionary identity checks reject alternate spellings/readings of the same entry; they cannot certify contextual synonym fairness. The absence of a further finding in this screen is not linguistic certification.

All calibration, policy and review fields remain null. The publication audit continues to fail its existing release requirements. This screen never marks an individual learner's answers or introduces a teacher response-review queue.

## Calibration handoff

The next executable increment is an offline pilot-data and calibration workflow. It needs a stable bank/form digest, item IDs/revisions, independent Japanese level evidence, submitted option/tile order or skip, question order and elapsed time. It should exclude recordings, free-text answers and personally identifying data. English-placement results cannot serve as Japanese ability labels.

Use separate pilot forms or a controlled test environment while the production bank remains unpublished. Compare timing, answer patterns, skips, item discrimination and the short-form guessing baselines across levels; fit likelihoods from learner evidence and check them on held-out learners. Sampling/precision targets and reference-level criteria must be specified for that study rather than inferred from source tags or synthetic fixtures. Publish the resulting versioned parameters and policy only after content and placement checks, then exercise real-bank learner/teacher browser journeys.

## Verification

TDD red/green demonstrated eleven failures before the data/contract corrections and passing regressions afterwards. **173 Japanese placement unit/API/component tests, seven Japanese PostgreSQL tests, 367 mirror regressions and 35 corpus tests pass (582 total)**, with full TypeScript, focused ESLint and checksum checks. The database tests complete the updated 470-item catalog using a synthetic fixture model only in disposable schemas. The English PostgreSQL migration regression was already verified in the preceding integration increment and was not rerun for this content change.

No application bank was published, no production calibration was fabricated and no application data migration was added. Existing uncommitted integration work is preserved. Brandon retains commit and push responsibility.
