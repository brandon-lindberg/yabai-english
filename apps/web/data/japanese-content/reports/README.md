# Japanese content — source reconciliation

This is a research artifact for section 1 of [the mirror plan](../../../../../MIRROR_PLAN.md).

Teacher review: **pending**. Publication: **blocked**.

Every input is pinned in [source-lock.json](../source-lock.json) and checked before use. The full JMdict English dataset is used; its common-only subset can omit JLPT-listed words. A successful audit command means the report was generated, not that the content was approved.

## Corpus counts

| Community level | Vocabulary | Kanji |
|---|---:|---:|
| N5 | 674 | 84 |
| N4 | 630 | 169 |
| N3 | 1659 | 387 |
| N2 | 1778 | 398 |
| N1 | 3070 | 1345 |
| Total | 7811 | 2383 |

Supplementary/inferred kanji classifications: **172**. These are preserved separately from Waller's community classifications.

## Dictionary and coverage checks

- Dictionary-verified vocabulary records: **7778**.
- Dictionary-verified kanji records: **2383**.
- Reference rows accounted for: **8293**.
- Uniquely matched reference rows: **8155**.
- Ambiguous reference rows: **3**.
- Unmatched reference rows: **135**.

Vocabulary verification checks primary and declared variant spelling/reading compatibility. Kanji verification compares complete on/kun reading sets with KANJIDIC2, retaining dot/hyphen notation. It does not validate the meanings of every word, example suitability, level assignments, or every possible cross-combination of alternative forms. A dictionary match is evidence for a reviewer, not pedagogical approval.

All source rows, including unresolved ones, appear in [reconciliation.jsonl](./reconciliation.jsonl). A unique match records a candidate correspondence; it does not silently merge or delete records. [audit.json](./audit.json) contains every issue, including dictionary-version differences and level disagreements.

## Findings requiring review

| Code | Records/issues |
|---|---:|
| INVALID_DICTIONARY_PAIR | 11 |
| INVALID_DICTIONARY_VARIANT | 11 |
| LEVEL_DISAGREEMENT | 408 |
| MISSING_DICTIONARY_LINK | 11 |
| MISSING_EXAMPLES | 566 |
| MISSING_REFERENCE_DICTIONARY_LINK | 14 |
| MISSING_REFERENCE_GLOSS | 48 |
| REFERENCE_DICTIONARY_ID_DIFFERENCE | 29 |

The corpus and dictionary releases are independently pinned. Changed dictionary IDs/readings and source corrections require reconciliation; the audit never rewrites the downloaded data. Review each ambiguity, unmatched row, invalid pair, missing dictionary link, and level disagreement before deciding the final import corpus. Missing examples remain explicit.

## Source-verified sample card data

These are data samples, not UI designs or published cards. Primary/variant word pairs and kanji reading sets pass the pinned dictionary checks. Meanings, examples, and levels remain pending Japanese-teacher review; an N5 target word does not make its source sentence an N5 sentence.

| Level | Kind | Written form | Readings | Source meanings |
|---|---|---|---|---|
| N5 | vocabulary | 今年 | ことし | this year |
| N5 | kanji | 一 | On: イチ、イツ; Kun: ひと-、ひと.つ | one; one radical (no.1) |
| N4 | vocabulary | そろそろ | そろそろ | gradually; soon |
| N4 | kanji | 不 | On: フ、ブ; Kun: — | negative; non-; bad; ugly; clumsy |
| N3 | vocabulary | 気候 | きこう | climate |
| N3 | kanji | 与 | On: ヨ; Kun: あた.える、あずか.る、くみ.する、ともに | bestow; participate in; give; award; impart; provide; cause; gift; godsend |
| N2 | vocabulary | せっせと | せっせと | diligently; assiduously; industriously; beavering away |
| N2 | kanji | 並 | On: ヘイ、ホウ; Kun: な.み、なみ、なら.べる、なら.ぶ、なら.びに | row; and; besides; as well as; line up; rank with; rival; equal |
| N1 | vocabulary | 遅くとも | おそくとも | at the latest |
| N1 | kanji | 丁 | On: チョウ、テイ、チン、トウ、チ; Kun: ひのと | street; ward; town; counter for guns, tools, leaves or cakes of something; even number; 4th calendar sign |

Full records and provenance are in [samples.json](./samples.json). Each carries an explicit pending teacher-review state. Example sentences are source material and have not been adapted or generated.

## Scope and attribution

Modern JLPT does not publish an exhaustive official vocabulary/kanji list. The coverage target is a named community corpus with every source row accounted for. Vocabulary and kanji study alone do not constitute a complete Japanese placement assessment.

See [ATTRIBUTION.md](../ATTRIBUTION.md) for the data licence and upstream credits. No application database was read or seeded, no cards were published, and no English placement implementation was imported by this tooling.
