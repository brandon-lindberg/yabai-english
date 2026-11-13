# Word-level assessment draft attribution

170 private draft choices, prepared 2026-10-23. The local content and excerpts are pinned by `content-lock.json`. Each retained external record identifies its upstream file and SHA-256 in `source-excerpts.json`. None is an official JLPT question, published assessment, human approval or empirical difficulty estimate.

## Vocabulary and kanji readings: 100 records

- [OpenJLPT](https://github.com/evanclan/OpenJLPT/tree/0d1d3410bec90bd4098a7c72de820543cb4f707c), CC BY-SA 4.0: selected vocabulary IDs, words, readings, English glosses and community level tags. Full [licence](../licences/openjlpt-LICENSE) and [field-provenance notice](../licences/openjlpt-NOTICE.md) are retained. No OpenJLPT/Tatoeba example sentences are imported.
- [Jonathan Waller's JLPT Resources](https://www.tanos.co.uk/jlpt/), CC BY, through [stephenmk/yomitan-jlpt-vocab](https://github.com/stephenmk/yomitan-jlpt-vocab/tree/b062d4e38c4bdd0950ae1d4ec55f04b176182e03), CC BY-SA 4.0: same-band reference rows, readings, spellings and dictionary IDs. Full [reference licence](../licences/waller-LICENSE.txt) retained. These lists share ancestry; agreement is not independent pedagogical validation.
- [JMdict, Electronic Dictionary Research and Development Group](https://www.edrdg.org/), Jim Breen and EDRDG contributors, under the [EDRDG dictionary licence](https://www.edrdg.org/edrdg/licence.html), CC BY-SA 4.0: dictionary spelling/reading restrictions. The [scriptin/jmdict-simplified conversion](https://github.com/scriptin/jmdict-simplified/releases/tag/3.6.2%2B20261019180022) supplies the full pinned English dictionary. Selected dictionary IDs, spellings, readings and restrictions are retained. Preserve EDRDG attribution and data-freshness requirements in later publication.

Changes: selected ten reading words and ten different vocabulary words per source band; authored new Japanese contexts, distractors and explanations; balanced choice positions. Only dictionary-verified vocabulary IDs with a resolved same-band reference match were selected from the section 1 audit. This does not resolve or authorize publication of the full flashcard corpus. Whole-word readings are checked against the dictionary; compound readings are never synthesized from on-yomi/kun-yomi lists.

All dictionary-valid readings are excluded from wrong answers. In particular, 図書館「ずしょかん」 and 案内「あない」 were rejected as distractors. 共存 retains OpenJLPT's「きょうぞん」and the reference's「きょうそん」with both supported by the same dictionary entry; neither is used as a distractor. Contextual synonyms still require linguistic assessment beyond dictionary-identity checks.

## Grammar: 50 records

- Ten N5 keyed MCQs from [JLPTSuccess](https://github.com/gauravhq/JLPTSuccess/blob/708a995691dcd0983e2ede47db423281b1cd343a/N5/data/questions.json), educational content CC BY-SA 4.0. [Full licence](../licences/jlptsuccess-LICENSE.txt), [original-content/AI-review disclosure](../licences/jlptsuccess-CONTENT.md). Source stems, all choices and keys retained; spacing/blank presentation normalized, choices reordered, translated cues and AI-review/difficulty flags omitted. These are not human-reviewed flags.
- Forty second examples from [nihongo-mono](https://github.com/stndaru/nihongo-mono/tree/ec0ba4a0ce1611c568b0e4f8a223eb8029249a25/src/data/grammar), ten each N4–N1. Copyright (c) 2026 Stefanus Ndaru Wedhatama. [Full MIT licence](../licences/nihongo-mono-MIT.txt) and [explicit original-data notice](../licences/nihongo-mono-DATA.md). The complete Japanese sentence is retained exactly as the keyed completion. One span is blanked; distractors, explanations and occasional Japanese disambiguating contexts are authored. These are different source records from the first-example sentence assemblies. Individual adaptations are recorded in `changes`.

The new 394-row selection ledger covers these 100 selected lexical records, forty selected second grammar examples, and all 254 N5 MCQ candidates (ten selected, 244 deferred). It is not an exhaustive ledger for every word or grammar example in the upstream repositories. The earlier pack's N5 deferrals describe that earlier authoring stage and are not overwritten.

## Kana: 20 original exercises

English Platform contributors, 2026. Original AI-assisted hiragana/katakana recognition choices, including voiced marks, small kana, gemination and long-vowel notation. N5 literacy floor only. There is no advanced kana anchor or recording task.

New content and CC BY-SA adaptations are shared under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), with upstream credits and full MIT notices preserved. The generic English interface instructions reveal no Japanese answer; Japanese context and assessed content remain Japanese. The keyed data stay outside `public/`.

Editorial revision 2, 2026-10-23: the N1 missed-meal example now blanks the complete compound and uses an explicit missed-opportunity context with grammatical past-tense alternatives. A valid casual alternative and malformed distractors were removed; the original keyed source sentence and upstream excerpt remain unchanged. See the [editorial handoff](../../../../../docs/japanese-placement-quality.md). No human approval or empirical difficulty claim was added.
