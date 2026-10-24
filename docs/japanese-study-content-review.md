# Japanese usage labels and content review inventory

Section 5k of `MIRROR_PLAN.md`, 2026-10-24. Branch: `the-mirror`. Brandon owns commits and pushes.

## Learner-facing usage

The shared Japanese practice view now expands all **82 usage values** in the pinned draft: 66 grammar/spelling/domain codes and 16 source notes. English and Japanese display labels use one registry. `rK` (rare kanji spelling) and `rk` (rare kana spelling) remain distinct, as do vocabulary readings, kanji reading categories and exact source members. The longest English note expands the source abbreviation “neg.” to “negative.” Each value has its own language attribute; an unknown future value preserves its source text with the English-source fallback rather than disappearing or receiving an invented translation.

The compiler and review inventory share one extraction of the original member's POS, spelling/reading tags and selected-sense usage notes. Public question `usage` values, identities, private keys and grading remain unchanged. Both full practice and dashboard daily review use the same `JapaneseStudySession` renderer. No new examples, gloss corrections, level changes, tokens or separate card implementation are introduced.

The labels are authored display translations informed by the pinned JMdict metadata and its [official entity definitions](https://www.edrdg.org/jmdict/jmdict_dtd_h.html); [jmdict-simplified's tag contract](https://scriptin.github.io/jmdict-simplified/types/Tag.html) describes the converted source values. They do not constitute teacher signoff on the underlying lexical content. Original codes and notes remain in the source-bound review inventory.

## Reproducible content inventory

From the repository root:

```sh
yarn japanese-content:review
yarn japanese-content:review --check
```

The command loads the exact artifacts already bound by tracked catalog digests, reuses the existing import-plan validator, verifies pinned source bytes and loads the complete relevant dictionary entries. It reads no credentials and performs no database writes, fetching or publication. Only an optional `--check` argument is accepted.

Default output is [the tracked summary](../apps/web/data/japanese-content/reports/content-review.json) plus ignored `.cache/japanese-content/content-review-v1.jsonl` under `apps/web`. The JSONL has one row for each of the 10,307 source members, retaining canonical ownership, source/introduction bands, source file and complete-record hash. Vocabulary rows carry original meanings, full dictionary sense/gloss/restriction/usage context with exact-pair eligibility, original example objects and sentence IDs, usage values and review signals. Kanji rows account for identity and provenance only; this inventory adds no kanji meaning approval. Existing character reading verification remains separate.

The summary binds source/study/lock digests, the display-label digest and the complete row-stream digest. `--check` recomputes those findings in memory, compares the tracked summary and writes nothing. An optional full-corpus regression uses the same loader as the command; synthetic fixture tests run without downloaded artifacts.

## Current findings

| Measure | Count |
| --- | ---: |
| Canonical units / source records | 10,291 / 10,307 |
| Vocabulary / kanji source members | 7,924 / 2,383 |
| Vocabulary meaning strings | 17,431 |
| Normalized exact eligible English dictionary matches | 12,713 |
| Meaning strings requiring further review | 4,718 |
| Vocabulary records with at least one meaning signal | 3,078 |
| Source examples | 13,714 |
| Vocabulary records without examples | 682 |
| Examples without a literal target-form match | 2,477 |
| Repeated identical example pairs within a record | 0 |
| Sentence IDs associated with different normalized pairs | 0 |
| Usage values with both display languages | 82 / 82 |

These are deliberately conservative review signals, not error counts. Exact matching normalizes NFC, case and whitespace, then checks only English glosses in senses permitted for the primary spelling/reading pair. It does not certify whether the sense is appropriate for that card or level, and it does not reject a valid paraphrase merely because wording differs. The 4,718 include 21 construction-supported and six phrase-attested meanings whose form evidence is retained without claiming an exact dictionary gloss. Four attested phrase records legitimately have no dictionary sense context.

Literal example matching checks the word, reading and declared accepted spellings. An inflected form can fail this check while being valid: examples containing 離れて or 離れられない do not literally contain 離れる. Conversely, a literal match does not establish the intended sense, translation quality, reading, politeness, or sentence difficulty. A target word's community level does not label its whole source sentence. Examples remain undisplayed in the learner practice view pending their content work; missing examples are not fabricated.

One concrete semantic review candidate is `ja-vocabulary:002ee4fb5a` (奨励, しょうれい): the source includes “message” and “address,” while its eligible pinned dictionary sense supports encouragement/promotion. The report retains those original glosses and the dictionary context for an explicit correction decision. Differences such as 液体's source “fluid” versus the dictionary's “liquid” illustrate why the remaining findings cannot all be automatically deleted or treated as mistakes.

## Verification and boundaries

TDD red/green covers missing labels/review tooling, bilingual rendering and language fallback, case-sensitive tags, exact member extraction, spelling-restricted senses, original-content retention, missing dictionary context, stale artifacts, example duplicates/nonliteral forms/source-ID variants and full source-member coverage. **174 study tests, 123 content tests, 11 isolated PostgreSQL study tests and 375 mirror regressions pass (683 targeted tests)**. TypeScript, focused ESLint, whitespace and the production build pass. The review command reproduces its tracked summary with `--check`.

Impeccable governs the existing Operate surface. Six component captures cover the short and longest source usage notes at 1440px English/light, 390px English/dark and 320px Japanese/light. Actual production components/CSS/fonts render public questions compiled from the draft corpus; the API responses, XP and outer fixture are synthetic. Captures omit authenticated app journeys and do not approve senses, distractors or corpus publication. The launcher/detector remain unavailable; no clean detector result is claimed. The initial finish review found one copy issue: the raw abbreviation “neg.” remained in the longest English label. After a red/green regression, display-only fix, rebuild and second capture batch, the reviewer scored that fix **resolved** and returned **ship** at the fix-list scope. Both capture batches show zero overflow and browser errors. Documentation outcome is recorded separately.

The separate documentation handoff found no material mismatch, preserved the incumbent design-system files and recorded pre-existing product/design drift without repair.

The Japanese catalog remains **DRAFT with 10,291 units**, English remains PUBLISHED with 3,284 cards, and the published version-3 Japanese assessment is unchanged. Local Japanese progress/card-state/question-ledger rows and temporary schemas/connections remain zero. No migration, learner-state change, commit or push is part of this increment.

Next: resolve the meaning/sense findings through explicit source-bound correction decisions, distinguish harmless wording differences from incorrect glosses, and select sense-appropriate examples with supported readings/translations before flashcard release preparation. The earlier assessment publication authorization remains separate.
