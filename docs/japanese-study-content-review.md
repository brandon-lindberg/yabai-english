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

## Initial section 5k findings

These baseline figures predate [sections 5l–5ae's meaning/example decisions](japanese-vocabulary-meaning-reviews.md). The linked tracked report now contains the revised artifact's current counts; the table below records the original review inventory.

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

Sections 5l–5ae provide [explicit meaning/sense and example decisions](japanese-vocabulary-meaning-reviews.md), including corrected reading/spelling boundaries, the N5/N4 wording and construction cohorts, all 646 flagged N3 records, all 706 flagged N2 dictionary records plus four N2 constructions, and all 1,316 formerly flagged N1 dictionary records plus its final supported construction. The current inventory has 14,694 exact matches and 2,518 reviewed equivalent/construction strings among 17,218 meanings. All N5–N1 dictionary/construction meaning flags are resolved. Its only six remaining signals belong to four separately attested N2 phrases. Four N2 phrases retain six separately attested meanings under the existing strict source-bound contract; they are not direct dictionary matches. Example and curriculum review remain separate; literal target text does not prove sense compatibility. The final N2 decisions distinguish 治す from general fixing, 水平 from horizon, 人文科学 from social sciences, 政党 from a party member, 手前's singular pronoun from we, and 出来上がり's noun from 出来上がる. Homonyms retain separate pinned evidence, including コック's cook/tap and チップ's tip/chip. The N1 cohort additionally distinguishes 一定’s いちじょう reading from fixed/uniform いってい, the 偏 radical from 偏る, and the sixth lunar month from Gregorian June. Independent entries preserve foam/form, hanger/hangar/hunger and seat/sheet rather than discarding rare homonyms. The second N1 cohort distinguishes ordinal 番目 from cardinal numbers, 地方・じかた from ちほう, 弟・おと from general おとうと and transitive/intransitive verb direction. Five additional entries preserve hall/hole, puncture/punk, conditional/shogi と, Jesus/yes and sports-bat/shallow-tray meanings. The third N1 cohort separates 万人・ばんじん from numeric まんにん, the 乾・けん trigram from 乾く, 染まる’s passive/intransitive state from actively dyeing, and vocabulary/answer/first-visit categories from broader English paraphrases. Independent entries preserve pair/European pear and best/vest. The fourth N1 cohort clarifies negative 否・いな, gathering 会・え, heat quantity 熱量, active accepting 受け付ける, pickled 梅干 and timetable 時刻表. Independent entries preserve the fish あら, 南・なん’s geographic meaning, 了’s rare understanding spelling and club/crab while keeping 南・みなみ separate. The fifth N1 cohort separates 民俗 from 民族, subfamily from suborder, morae from syllables, giving from receiving, and the reading-specific 華奢・かしゃ and 立方・たちかた meanings. Independent evidence preserves race/lace; three incompatible examples are omitted with originals intact. The sixth N1 cohort clarifies 甲・きのえ, 反・たん’s thousandfold area error, sensitivity 感度, verb direction and the 御/的/助動詞 grammatical roles. Nine incompatible examples are omitted with full originals retained; 御・ご and 御・お remain separate units. The seventh N1 cohort distinguishes anatomy, 大事 readings, magnification/ratios, exchange/dodging, childcare/institution/address categories and transformations; independent evidence preserves lever/liver. Fifteen examples are omitted with originals preserved, and the two 大事 readings retain separate units. The eighth N1 cohort clarifies active guidance, primary reading boundaries, degree/possession categories, the 改定/改訂 distinction and nominal 出直し. Independent evidence preserves lamp/ramp, while the rare 重宝 treasure sense and both 賜る directions remain. Eleven examples are omitted with full originals retained. The final 117 decisions clarify reading-specific historical senses, counters, ethnic groups, the prior-time 兼ねて adverb and quantities. Independent entries preserve fan/fun, base/bass and volt/bolt; 煌々と keeps its declared construction evidence. Two further mismatched examples are omitted with originals retained. Broader example curation, deliberate draft refresh and section 6 verification remain before flashcard release preparation. The earlier assessment publication authorization remains separate.
