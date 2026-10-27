# Japanese meaning decisions and example selection

Sections 5l–5ca of `MIRROR_PLAN.md`, updated 2026-10-27. Branch: `the-mirror`. Brandon owns commits and pushes.

## First batch (5l)

The first batch added 21 explicit meaning reviews to the existing [correction ledger](../apps/web/data/japanese-content/vocabulary-corrections.json): **14 corrected records** and **seven records retaining their wording**. It addresses every one of the initial inventory's 13 records with an exact gloss match to a dictionary sense disallowed for the primary spelling/reading, plus 奨励's unrelated message/address glosses. This does not imply that all remaining semantic errors have been found.

| Word and primary reading | Corrected boundary |
| --- | --- |
| 奨励・しょうれい | Retain encouragement/promotion; remove message/address, unsupported by the selected sense. |
| 冠・かんむり | Retain crown/diadem; first/best belong to the かん restriction. |
| 納める・おさめる | Use explicit fee/payment, supply and gift-acceptance meanings; distinguish 収める's results sense. |
| 手数・てすう | Retain trouble; number of moves is restricted to てかず. |
| あんまり | Retain the selected negative-context adverb glosses; remainder/rest belong to あまり. |
| 水気・みずけ | Retain moisture/dampness; vapor and edema meanings are restricted to すいき. |
| 上手・うわて | Retain upper part/comparative skill; river/stage senses belong to かみて. |
| 収まる・おさまる | Clarify containment, taking a position and settling a matter; payment/delivery belongs to 納まる. |
| 有様・ありさま | Retain state/condition/circumstances; ideal-state/truth senses belong to ありよう. |
| 昇る・のぼる | Specify natural rising; distinguish the dictionary's climbing restrictions. |
| 落ち葉・おちば | Retain fallen leaves/leaf litter; separate the らくよう process sense. |
| 乳・ちち | Retain milk/breast; loop is restricted to ち. |
| 収める・おさめる | Select achievement, acceptance and capturing an image, matching its source examples; distinguish 納める's supply/payment sense. |
| しかる | Preserve the declared prenoun-modifier identity with that-kind-of/such-a; the particular/certain sense is restricted to さる. Scolding examples do not authorize changing this record to 叱る. |

The separate 叱る・しかる record remains present. No source member, card identity, primary spelling/reading, level or canonical partition is removed or changed.

Seven wording decisions retain eight nonexact gloss strings: question marks on いくつ's interrogatives, object parentheses in 無くす, a trailing ellipsis in じゃ, good-bye/goodbye hyphenation for さようなら, English language/English (language), third/3rd for 三日, and senior citizen/senior-citizen for お祖父さん. Other meanings on those records remain accounted for. These are explicit, cited wording decisions; no general synonym detector or punctuation-stripping acceptance rule is introduced.

## Source and sense validation

`meaningReviews` is an optional, strict extension of the existing vocabulary correction ledger. Each decision binds the complete effective record before the review with `beforeSha256`, names retain/correct, and lists every resulting meaning with its dictionary entry, one-based sense, exact English dictionary gloss, relation and rationale. The existing pinned loader and dictionary spelling/reading/sense rules remain authoritative.

Validation rejects missing entries/senses, wrong spelling or reading restrictions, fabricated gloss citations, duplicate resulting meanings, stale hashes and protected fields. An exact relation requires a direct eligible primary pair and a match under the shared conservative NFC/case/whitespace normalizer. An equivalent relation can retain an existing source meaning only; it cannot invent a new gloss. From 5n, an equivalent may cite the exact base sense of an already-declared construction after the shared construction validator rechecks its suffix, base spelling/reading, part of speech and sense. From 5o, an explicit `construction` relation also permits authored English grammatical wording against that same verified base sense; it cannot be used for a direct-only headword. The exact dictionary `gloss` and authored `text` remain separate. A retain action must leave the whole meaning array unchanged. Equivalence/construction reasons are authored decisions, not a machine proof of translation or teacher signoff.

Meaning decisions run after the existing form/dictionary corrections. Both the initial source content and the effective pre-review snapshot survive, so a later semantic decision cannot overwrite an earlier original. After 5bi there are **2,479 complete original-content snapshots**, plus explicit pre-review snapshots for all 5,977 meaning decisions (2,442 originals/5,909 reviews after 5bh; 2,399 originals/5,805 reviews after 5bg; 2,361 originals/5,710 reviews after 5bf; 2,320 originals/5,619 reviews after 5be; 2,287 originals/5,519 reviews after 5bd; 2,247 originals/5,419 reviews after 5bc; 2,208 originals/5,309 reviews after 5bb; 2,174 originals/5,212 reviews after 5ba; 2,137 originals/5,158 reviews after 5az; 2,093 originals/5,068 reviews after 5ay; 2,040 originals/4,982 reviews after 5ax; 1,991 originals/4,890 reviews after 5aw; 1,950 originals/4,789 reviews after 5av; 1,920 originals/4,701 reviews after 5au; 1,871 originals/4,599 reviews after 5at; 1,826 originals/4,504 reviews after 5as; 1,786 originals/4,409 reviews after 5ar; 1,744 originals/4,323 reviews after 5aq; 1,702 originals/4,229 reviews after 5ap; 1,664 originals/4,129 reviews after 5ao; 1,627 originals/4,088 reviews after 5an; 1,562 originals/4,002 reviews after 5am; 1,518 originals/3,903 reviews after 5al; 1,465 originals/3,799 reviews after 5ak; 1,425 originals/3,689 reviews after 5aj; 1,357 originals/3,571 reviews after 5ai; 1,323 originals/3,419 reviews after 5ah; 1,287 originals/3,297 reviews after 5ag; 1,260 originals/3,185 reviews after 5af; 1,210 originals/3,074 reviews after 5ae; 1,159 originals/2,957 reviews after 5ad; 1,098 originals/2,807 reviews after 5ac; 1,037 originals/2,657 reviews after 5ab; 981 originals/2,507 reviews after 5aa; 927 originals/2,357 reviews after 5z; 863 originals/2,207 reviews after 5y; 804 originals/2,057 reviews after 5x; 743 originals/1,907 reviews after 5w; 683 originals/1,757 reviews after 5v; 638 originals/1,647 reviews after 5u; 593 originals/1,497 reviews after 5t; 532 originals/1,347 reviews after 5s; 458 originals/1,197 reviews after 5r; 390 originals/1,047 reviews after 5q; 282 originals/751 reviews after 5p; 203 originals/551 reviews after 5o; 141 originals/396 reviews after 5n; 92 originals/197 reviews after 5m; 53 originals/21 reviews after 5l). The compiler, correction validator and inventory reuse one text normalizer; no second importer, grader or patch engine is added.

The content inventory revalidates each decision against its snapshot and dictionary context, then verifies that applying it yields the persisted artifact's effective content. Only then can it report `reviewed-equivalent`. Its JSONL includes the decision and pre-review content as well as the effective content. Forged evidence, missing snapshots and content drift cannot be treated as resolved findings.

## Existing examples

The 14 corrected records have **25 original examples**. The decisions select **18 unchanged examples** and omit seven from effective card content. Each selected example cites a sense represented by that record's reviewed meanings and carries an AI-assisted contextual rationale. Every original index must appear exactly once in keep/omit; omissions also have reasons. No new sentence, translation, reading or furigana is generated, and no sentence is reassigned to another card.

The omitted examples concern a different 収める spelling, an undeclared/different あまり pronunciation or sense, tree climbing on the natural-rise 昇る card, an unannotated ambiguous 落葉 reading, and the scolding homophone on the しかる modifier card. An omitted sentence is not necessarily wrong in isolation. Its complete text, translation, sentence ID and any source furigana remain in the original/pre-review snapshots. Selecting an example does not assign it a JLPT sentence level or certify its translation, politeness or teaching suitability. Examples remain undisplayed in practice.

## First-batch artifact comparison

| Inventory measure | Before 5l | After 5l |
| --- | ---: | ---: |
| Vocabulary meaning strings | 17,431 | 17,407 |
| Normalized exact eligible dictionary matches | 12,713 | 12,728 |
| Explicitly retained equivalent strings | 0 | 8 |
| Meaning strings still requiring review | 4,718 | 4,671 |
| Records with remaining meaning signals | 3,078 | 3,057 |
| Retained effective examples | 13,714 | 13,707 |
| Records without effective examples | 682 | 684 |
| Examples without a literal target-form match | 2,477 | 2,472 |

The 47 resolved flags combine corrected meanings, removed unsupported meanings and explicit retained wording. Remaining findings still include valid synonyms and inflected forms; they are not an error count. A repeat of the narrow disallowed-sense/exact-gloss heuristic finds zero remaining matches, without claiming that all reading/sense leakage has been eliminated.

The existing flashcard build and review commands reproduce the revised draft artifacts:

```sh
yarn japanese-content:flashcards --check
yarn japanese-content:review --check
yarn japanese-content:prompts
```

The [source summary](../apps/web/data/japanese-content/reports/flashcards.json), [study summary](../apps/web/data/japanese-content/reports/study.json) and [review summary](../apps/web/data/japanese-content/reports/content-review.json) bind the new content. The canonical policy was rebound only after comparing all units, member ownership and reference ownership with the prior artifact: the 10,291 units, 10,307 source members, 16 variant groups and 408 level decisions remain unchanged. The prompt audit still covers all members and 19,016 default task projections with zero omitted units.

After-5l source catalog SHA-256: `ac6a783328cb1348eabec5aeeb8085f2ba449bab36df71a87fc0dd6b6b26e542`.
After-5l canonical study SHA-256: `c540644abd5141770a6a5ed6f2c8a35e5dc38d052e28e9c24f7727f96c21af0e`.

## Beginner meaning cohort (5m)

The next batch reviews all **172 remaining N5-introduction records with `needs-review` meanings**, plus four clear N4 corrections. It appends **176 decisions: 38 corrected records and 138 retained wording decisions**. The cumulative ledger has 197 reviews: 52 corrected and 145 retained. The existing strict validator and artifact pipeline process every decision; no new synonym matcher, grading rule or import implementation is introduced.

| Boundary | Representative correction |
| --- | --- |
| Liking versus being liked | 好き → liking/being fond of; 大好き → liking very much/being very fond of, replacing likeable. |
| Quantity, age and duration | 半分 → half, removing half minute; 二十歳 → 20 years old; 一日・いちにち retains one day, with ついたち kept separate. |
| Conventional expressions | ごちそうさま → thank you (for the meal), replacing feast; こんにちは loses its internal source annotation. |
| Verb direction and context | 入る・はいる → to enter/to be contained (in); 弾く・ひく explicitly includes stringed and keyboard instruments; 撮る separates photograph and recording meanings. |
| Calendar dates | 二十日, 四日, 五日, 七日, 九日 and 十日 distinguish dates from durations and correct the source typo. |
| Scope and grammar | 先生 distinguishes occupation from respectful address; 私・わたくし uses I/me rather than myself; 夕方, 差す and 遊ぶ gain explicit sense context. |
| Four N4 entries | 入院 → hospitalization; ちゃん → suffix for familiar person, removing female-only; ビル → multi-floor building, removing bill; 複雑 → complex/complicated. |

Other decisions explicitly retain existing articles, parentheses, spelling, ordinals, inflection, ordinary contextual synonyms and noun/suru-verb renderings. Each retained string has an eligible pinned dictionary sense, an exact supporting gloss and an authored rationale. Dictionary qualifiers remain in the evidence; retaining a concise source gloss does not license every English homonym or remove its Japanese context.

コート already had both coat and tennis court, but linked only JMdict **2842174 (court)**. The existing dictionary-evidence correction mechanism adds **1049000 (coat)** for the same verified コート/コート pair, with an empty content patch. Both original meanings and the original primary dictionary ID remain. Tennis court is explicitly supported by the court gloss; the unchanged source example about trying on a coat is selected against the clothing entry. No separate study unit is merged or created.

The pinned full JMdict remains the imported lexical source. Additional corroboration comes from the Japan Foundation: [Irodori lesson 17](https://www.irodori.jpf.go.jp/assets/data/elementary01/pdf/Y_L17.pdf) describes ごちそうさま as thanks after food/drink; the [Marugoto calendar](https://words.marugotoweb.jp/static_contents/sp/collection/calendar.php?lang=en) distinguishes the ついたち calendar reading. These are contextual citations; no PDF content, exercises or new sentences are imported.

Fifteen decisions account for **29 existing examples**, all kept unchanged with explicit sense references. This includes the coat example and the distinct quantity/time uses of 少し. The other new decisions do not assert example approval. Cumulatively there are 47 selected examples and seven earlier omissions, with all originals preserved. Effective example counts remain unchanged.

| Inventory measure | Before 5m | After 5m |
| --- | ---: | ---: |
| Vocabulary meaning strings | 17,407 | 17,413 |
| Exact eligible dictionary matches | 12,728 | 12,780 |
| Explicit retained equivalents | 8 | 154 |
| Meaning strings still requiring review | 4,671 | 4,479 |
| Records with remaining meaning signals | 3,057 | 2,881 |
| N5 `needs-review` meanings | 187 | 0 |
| Original-content snapshots | 53 | 92 |

The reduction of 192 flags is the 187-string N5 cohort plus five N4 strings; corrected meaning arrays also split or clarify some original combined strings. N5 still has two construction-supported signals. Remaining `needs-review` counts by introduction band are N4 218, N3 990, N2 1,059 and N1 2,185; 27 construction/phrase-supported meanings are counted separately within the 4,479 total. These signals remain review work, not a count of proven mistakes. This batch does not certify all N5 meanings, examples, levels or pedagogy.

Rebinding compared every canonical unit, member mapping and reference mapping against the before-5m artifacts. All 10,291 units, 10,307 members, 161 overlap families, 16 variant groups and 408 level decisions are unchanged. All 19,016 default prompt projections still compile and grade with zero omitted units.

After-5m source catalog SHA-256: `74cb1ad71c6b2d39597a797f09094f4acc4add847a80f1ee21652cf321a09ae6`.
After-5m canonical study SHA-256: `73952117ddabb9b74bd77a8ba45bfadc8921e8b9c31faf185e0357c52ca7bc9e`.
After-5m review-row SHA-256: `7b6c59f022f38db4005b1a38f3489c26566c8a29e1ec971be7aebfa450c23d3d`.

## N4 meanings and N5 constructions (5n)

This batch covers **197 N4-introduction records with 218 `needs-review` strings**, plus the two remaining N5 construction-supported meanings. It appends **199 decisions: 49 corrected records and 150 retained wording/construction decisions**. All source records retain their identities, primary spellings/readings and levels; no canonical units are merged or removed.

| Boundary | Decision |
| --- | --- |
| Delivery versus arrival | 届ける → to deliver/to report, matching the two existing examples; remove to reach. |
| Complete versus partial negation | ぜんぜん → (not) at all/completely; not entirely incorrectly means only partial negation. The two examples illustrate the negative and complete-result contexts separately. |
| Quarrel versus unrelated failure | 喧嘩 retains quarrel/brawl and removes failure and the unnecessary drunken restriction. |
| Relationship and gender | 家内 → (my) wife, not the occupation housewife; 金持ち → rich person; 君・きみ → you without the false men-towards-women restriction. The distinct くん suffix member remains. |
| Place versus person | 林 retains woods and removes forester. |
| Declared auxiliary sense | そう → appearing that/seeming that/looking like. Both original examples concern appearance/likelihood, and the existing dictionary entry is the appearance auxiliary; no identity change to another そう is made. |
| Numeric inclusivity | 以上 adds ... or more alongside valid more than (beyond expectations) and that's all. The numeric threshold must not imply exclusion of equality. |
| Explicit contexts and split definitions | 特急 loses an unsupported faster-than-express guarantee; 都 names a metropolitan prefecture; 写す, 毛, 折る, 折れる and other fused answers receive separate eligible glosses. |

The other decisions explicitly retain ordinary contextual synonyms, English articles, parentheses, number/compound spelling, register qualifiers and suru-verb renderings. Each nonexact string is tied to a specific eligible dictionary sense and an authored rationale; no universal synonym acceptance rule is introduced. Corrections clarify the selected source senses rather than claiming to list every meaning of each word.

ゆっくりと and コピーする remain **derived constructions**, supported respectively by ゆっくり＋と (entry 1013050, sense 1, `adv-to`) and コピー＋する (entry 1050590, sense 1, `vs`). Their existing slowly/to copy meanings are explicitly retained. The meaning validator now accepts a construction only through the already-declared evidence and the shared `vocabularyPairEvidence` rules. It rechecks the exact suffix, base pair, part of speech and cited sense. Omitted construction evidence, a wrong base reading, unrelated sense, wrong part of speech, or an exact/direct-headword assertion is rejected. The inventory replays this same validator using the catalog evidence before assigning `reviewed-equivalent`; its direct `pairAllowed` flags remain false. Other unreviewed constructions receive no automatic approval.

Twelve decisions select **24 unchanged examples**, with complete original-index accounting and no omissions. They include the two N5 constructions and ten N4 records illustrating the semantic boundaries above. No source sentence, translation, ID, reading or furigana is generated or rewritten. Cumulatively, 71 examples are selected and seven earlier omissions remain; other examples are not approved by this increment.

The pinned JMdict remains the imported source. The Japan Foundation's [Marugoto vocabulary index](https://marugoto.jpf.go.jp/assets/docs/download/starter_c/MarugotoStarterCompetencesVocabularyIndex_EN.pdf) corroborates ぜんぜん with a negative predicate as not at all. Its [teaching resource on そう](https://classroomresources.sydney.jpf.go.jp/resources/youth-issues-reported-information/) distinguishes appearance from reported information. These are contextual citations, not newly imported exercises or source sentences.

| Inventory measure | Before 5n | After 5n |
| --- | ---: | ---: |
| Vocabulary meaning strings | 17,413 | 17,434 |
| Exact eligible dictionary matches | 12,780 | 12,862 |
| Explicit retained equivalents | 154 | 313 |
| Meaning strings still requiring review | 4,479 | 4,259 |
| Records with remaining meaning signals | 2,881 | 2,682 |
| N4 `needs-review` meanings | 218 | 0 |
| N5 construction-supported signals | 2 | 0 |
| Original-content snapshots | 92 | 141 |

The 220 resolved signals comprise the 218 N4 strings and two explicitly reviewed N5 construction meanings. N4 still has five construction/phrase-supported signals. N3/N2/N1 `needs-review` counts remain 990/1,059/2,185; the total also includes 19 construction-supported and six phrase-supported meanings. Zero wording flags does not certify complete meanings, examples, proficiency levels or pedagogy.

The cumulative ledger has **396 reviews: 101 corrected and 295 retained**. All 10,291 canonical units, 10,307 members, 161 overlap families, 16 variant groups and 408 level decisions are unchanged, verified against the previous complete unit/member/reference mappings before rebinding the source digest. The full audit still compiles and grades all 19,016 default prompt projections with zero omitted units. The application database remains on its earlier immutable Japanese DRAFT snapshot; no refresh, publication, migration or learner-state write occurs.

After-5n source catalog SHA-256: `085c46bbb970a5e3455f5c559c6a4dae80dfd0bbb5c7eeb4b52b65476ca4fb8d`.
After-5n canonical study SHA-256: `ba9a55a06ac7b43145219921b8799adb56fbd9e25067e52f02fffd430f798198`.
After-5n review-row SHA-256: `b1395be93aa0dcbfd6f3ac5dc4ad32526afc4dc1271c540d55614dc42ba87c05`.

## Final N4 constructions and first N3 cohort (5o)

This batch appends **155 decisions: 61 corrected and 94 retained**. It covers all five remaining N4 constructions and the first 150 flagged N3-introduction records in stable source-ID order, through `ja-vocabulary:38191588bb`. The cumulative ledger has **551 reviews: 162 corrected and 389 retained**. This explicit boundary defines the delivered batch; the rest of N3 remains under review.

| Boundary | Decision |
| --- | --- |
| Actual injury versus a substring | けがする uses the authored construction rendering to be injured, citing the injury base sense. Its only example contains 胸やけがする: heartburn + が + する, not the injury verb. Omit it from effective content and retain the complete original. |
| Exact construction sense | けんかする, びっくりする and あいさつする retain their declared quarrel/surprise/greeting senses. チェックする retains inspection sense 2; its check-off-list example belongs to sense 3 and is not selected. |
| Girl versus kinship/sexual status | 少女 → girl (usu. between 7 and 17)/young lady, removing daughter/virgin and other ambiguous glosses. Both original examples describe girls. |
| Descriptive state versus transitive action | 明確 → clear/precise/definite; 現れる's expression sense → to be expressed, not express oneself. |
| Gradual progression versus quietness | 徐々に retains slowly/little by little/gradually/steadily and removes quietly. |
| Reading/spelling context | 帯・おび gains the kimono-sash meaning illustrated by its examples; 音・おん excludes the musical-note sense; 指す excludes 差す's umbrella meaning and qualifies shogi play. |
| Incorrect English or unrelated sense | ライター excludes rider (ライダー); 縄 excludes raw-material hemp; 筋肉 excludes tendon/sinew; 評判 excludes arrant; そっくり corrects splitting image to spitting image. |
| Explicit contexts | 越す uses crossing/passing a winter rather than the English audience-response idiom go over; 国境 specifies a national border; 今回 excludes lately; other incomplete, fused or overbroad definitions receive explicit eligible glosses. |

Four evidence-only corrections preserve existing source homonyms without duplicating cards or merging study units:

| Word | Existing entry | Added entry |
| --- | --- | --- |
| ライター | 1137880, lighter | 2844121, writer |
| グラス | 1046430, glass | 2847461, grass |
| パス | 1101440, game/admission pass | 2861508, computing path |
| サイン | 1056230, autograph/sign | 2844545, sine |

All entries independently allow the exact primary spelling/reading. The original primary dictionary IDs and content snapshots remain. Meanings are accounted for separately: computing path and game passes are made explicit, while glass/grass and autograph/sign/sine retain their source words. This does not attach every homonym found in the dictionary to the cards.

The new `construction` relation addresses a real limitation: a correct English verb rendering of a Japanese noun+suru construction need not be an exact noun gloss or already exist in an erroneous source array. It permits authored wording only when the existing declared construction evidence validates the exact base pair, suffix, part of speech and sense. In this batch, only けがする uses it. Its dictionary gloss remains injury and its authored text is to be injured. Missing evidence, a direct-only word, wrong sense or fabricated dictionary gloss is rejected. The inventory revalidates the same decision and reports it as `reviewed-equivalent`, while keeping the direct pair flag false. It does not relabel authored English as an exact dictionary quotation or automatically approve other constructions.

Cambridge's publisher dictionary corroborates the distinction between [怪我 / getting injured](https://dictionary.cambridge.org/ja/dictionary/japanese-english/%E6%80%AA%E6%88%91) and [heartburn / 胸焼け](https://dictionary.cambridge.org/ja/dictionary/english-japanese/heartburn). These are lexical citations; no new sentence is imported and no health advice is inferred.

Sixteen decisions account for 30 original examples: **27 kept unchanged and three omitted**. The omissions are the heartburn substring, the unselected check-off sense, and a greeting-noun sentence that does not instantiate the declared する construction. Original sentences, translations, IDs and furigana remain intact. Other source examples are not approved by this increment. The false heartburn match demonstrates that even an exact literal substring is only a review signal.

| Inventory measure | Before 5o | After 5o |
| --- | ---: | ---: |
| Vocabulary meaning strings | 17,434 | 17,402 |
| Exact eligible dictionary matches | 12,862 | 12,934 |
| Reviewed equivalents/construction renderings | 313 | 437 |
| Meaning strings still requiring review | 4,259 | 4,031 |
| Records with remaining meaning signals | 2,682 | 2,527 |
| N3 `needs-review` strings / records | 990 / 646 | 767 / 496 |
| N4 construction-supported signals | 5 | 0 |
| Effective examples | 13,707 | 13,704 |
| Original-content snapshots | 141 | 203 |

The 228 resolved signals comprise 223 N3 strings and five N4 constructions. N5/N4 now have zero current meaning signals. Remaining N2/N1 `needs-review` counts are 1,059/2,185; the total also includes 14 construction-supported and six phrase-supported meanings. These are review findings, not a count of proven errors or certification that N5/N4 example/curriculum work is complete.

Only 63 effective content records change: 61 meaning corrections and two retained-meaning records with example omissions. All 10,291 canonical units, 10,307 source members, 161 overlap families, 16 variant groups and 408 level decisions remain unchanged, verified against every prior unit/member/reference mapping before digest rebinding. The full audit still compiles and grades all 19,016 default prompt projections with zero omitted units. The application keeps its earlier immutable Japanese DRAFT snapshot; no refresh, publication, migration or learner-state write occurs.

After-5o source catalog SHA-256: `d0eb036efc5000dee1396c8a1ba00b5541a9c4bc4ca292a47fdbd0a0aeed2954`.
After-5o canonical study SHA-256: `bbfa5a83c9a51082e23a6b9613cda8740992f083b08223c3730f45d61c622a26`.
After-5o review-row SHA-256: `be4538054c0cdd7cfadfff1521ad3961b332249a2dd23fc52fe01998aba370ca`.

## Second N3 cohort (5p)

This batch appends **200 decisions: 76 corrected and 124 retained**, covering the next flagged N3-introduction records after `38191588bb` through `8822903a55`. The cumulative ledger has **751 reviews: 238 corrected and 513 retained**. It uses the existing source loader, correction contract, validators and compiler; production logic and the review schema do not change.

| Boundary | Selected wording or treatment |
| --- | --- |
| Marital status | 独身 → unmarried/single, avoiding a male-only or sexual-abstinence implication. |
| Individual versus team | 選手 → player (of a sport)/team member, rather than an entire team. |
| Duration versus frequency | 週間 → week; weekly is a different spelling/use. 少々 separates a brief interval from a small quantity. |
| Catching up versus passing | 追い付く → to catch up (with)/to draw level; the source's overtook translation is not selected because it can imply passing ahead. |
| Primary reading | 末・すえ excludes powder; 品・しな selects article/goods; 市場・いちば names a physical market rather than the abstract しじょう concept; 避ける・さける excludes the よける-restricted physical-dodging sense. |
| Distinct existing lexical members | 回り retains rotation; its surroundings/circumference examples are not selected, while the separate 周り card remains unchanged. 位 selects rank/grade/decimal place; approximation remains represented by the separate ぐらい member. |
| Other clear distinctions | バッグ excludes バグ's bug; 贈る specifies giving a gift; 体育 names physical education rather than individual sports; 通じる clarifies being understood. |

The remaining decisions account explicitly for articles, plurals, punctuation, qualifiers, context-specific synonyms, noun/adjective forms and suru renderings. Corrections often make existing meanings clearer rather than proving the old wording impossible in every historical or idiomatic context. Exact-match flags remain review signals, not error counts.

Five evidence-only corrections preserve legitimate existing source homonyms:

| Word | Existing entry | Added entry |
| --- | --- | --- |
| ボール | 1123550, ball | 1123750, bowl |
| トラック | 1085760, truck | 2850185, running track |
| ジュース | 1065950, beverage | 2843595, deuce |
| ミス | 1130650, mistake | 2849826, Miss |
| ダイヤ | 2855660, railway schedule/diagram | 1076860, diamond |

Each added entry independently allows the exact primary spelling/reading. Original primary dictionary IDs and all existing source identities remain. The ミス gloss separates mistake from the title Miss; ダイヤ removes unsupported dyer while keeping the independently evidenced diamond. No unrelated homonyms are added and no canonical cards are merged or duplicated.

Fourteen decisions account for **28 original examples: 22 selected unchanged and six omitted**. The omissions concern the approximation particle on the rank-noun card, グランド inside イングランド (England), two surroundings/circumference examples on the rotation member, the overtook translation, and a compound/suffix 品 sentence without an independently evidenced bare しな instance. Their full text, translations, IDs and furigana remain in original snapshots. ダイヤ's railway and diamond examples cite their respective entries. Examples outside these decisions remain separate review work.

グランド keeps the declared grand/large sense and its grand-opening example. The gland/electrical-ground strings lack support under that selected pinned entry and stay in the original snapshot for any later specialized review; this is not a claim that those strings cannot occur in technical Japanese. The England substring is not treated as lexical evidence for grand.

The chosen classroom wording is also supported by publisher material: [Collins's 追いつく entry](https://www.collinsdictionary.com/dictionary/japanese-english/%E8%BF%BD%E3%81%84%E3%81%A4%E3%81%8F) uses catching-up contexts, and [Bonjinsha's vocabulary list](https://publishing.bonjinsha.co.jp/wp/wp-content/uploads/2015/10/shokyu_hinshi_vocab_en.pdf) lists single/unmarried for 独身. These are contextual citations; no sentences or exercises are imported.

| Inventory measure | Before 5p | After 5p |
| --- | ---: | ---: |
| Vocabulary meaning strings | 17,402 | 17,359 |
| Exact eligible dictionary matches | 12,934 | 13,037 |
| Reviewed equivalents/construction renderings | 437 | 600 |
| Meaning strings still requiring review | 4,031 | 3,722 |
| Records with remaining meaning signals | 2,527 | 2,327 |
| N3 `needs-review` strings / records | 767 / 496 | 458 / 296 |
| Effective examples | 13,704 | 13,698 |
| Original-content snapshots | 203 | 282 |

The 309 resolved signals are the next N3 cohort's nonexact strings. N5/N4 remain at zero current meaning signals; N2/N1 remain at 1,059/2,185 `needs-review` strings, with 14 construction-supported and six phrase-supported meanings included in the total. No complete example, curriculum or pedagogy certification is implied.

Only the 76 corrected records change effective content. Comparison against every prior unit/member/reference mapping preserves all **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups and 408 level decisions**. The complete prompt audit still compiles and grades all 19,016 default projections with zero omitted units. The application retains its earlier immutable Japanese DRAFT snapshot; this build is not a database refresh or publication.

After-5p source catalog SHA-256: `200013281ecbad94014c3e3ebad531c2f1058733de05b198f242f87fdf1a874b`.
After-5p canonical study SHA-256: `950d639c8b2015f2a8444bb7aae7f6c7a1ff90376d262fac8efd70c82623aa3f`.
After-5p review-row SHA-256: `fff659084dc36972785d770bc98a573f1ce75327be45e1878ab3ed5f26b01843`.

## Final N3 meaning cohort (5q)

This batch appends **296 decisions: 104 corrected and 192 retained**, covering every remaining N3-introduction record with `needs-review` meanings, from `88947a7f87` through `ff035a2a04`. Cumulatively the ledger has **1,047 reviews: 342 corrected and 705 retained**. The existing source loader, correction ledger, validators, compiler and review inventory process the decisions without production logic or schema changes.

| Boundary | Selected wording or treatment |
| --- | --- |
| Primary reading | 支える・ささえる selects support/sustain/hold at bay, excluding つかえる's blockage/choking; 直に・じかに selects directly/in person/firsthand rather than immediately; 陸・りく selects land/shore rather than the numeral ろく. |
| People and agreement | 方々・かたがた selects people/persons rather than ほうぼう's directions. 全員's all members does not imply unanimous agreement. |
| Adjective versus noun | 臭い・くさい selects stinking/smelly/suspicious rather than におい's odor/scent nouns. |
| Verb direction | 育つ selects growing up/being raised rather than actively raising someone; 済ませる selects finishing an activity rather than passive to be finished. |
| Other source mix-ups | 能 selects talent/function/Noh; 命・いのち selects life/destiny rather than command/decree; 住宅 is residence/housing rather than a resident person; 単語 loses the false usually-single-character claim. |
| Prefix and context | 御・お is an honorific/polite/humble prefix. It does not acquire 御社's おん reading or a standalone お interjection from example sentences. 注ぐ・そそぐ gains explicit pouring/watering/devoting-attention wording. |

Other decisions explicitly account for articles, plurals, qualifiers, noun/adjective forms and contextual synonyms. Exact dictionary matches remain a lexical evidence check, not certification of sentence quality or curriculum suitability. Corrections choose clearer classroom wording without claiming every omitted source string is impossible in all historical or technical contexts.

Six evidence-only corrections add eight independent pinned entries for existing meanings of the same primary written/reading pair:

| Word | Existing entry | Added entries |
| --- | --- | --- |
| コード | 1049010, code | 2855837, cord; 2855838, chord |
| カード | 1036400, card | 2848325, curd |
| バン | 1100090, hairstyle bun | 2849429, van; 2156750, value-added network |
| ロケット | 1147220, rocket | 2862534, locket |
| ホーム | 1121740, platform | 2855797, home |
| 元 | 1260670, origin/cause | 2219590, former/previous state |

Every added entry passes the existing exact-pair/sense validator. The original primary dictionary IDs and source identities remain. バン uses the full network term to keep van and case-insensitive VAN from becoming duplicate answers. 元's previous-state and cause examples cite their respective entries. No new lexical member or canonical group is created.

Thirteen decisions account for **26 original examples: 20 selected unchanged and six omitted**. The omissions are both 御 prefix examples, 方々's conflicting ask-around context, 臭い's noun-scent example, 陸's wind translation without explicit land context, and the explicit 溺れ死ぬ death compound on the standalone 溺れる card. These omissions select examples suitable for the reviewed record/senses; they do not claim every sentence is intrinsically wrong. Full original text, translation, IDs and furigana survive. Conflicting source readings are not silently corrected, and examples outside explicit decisions remain separate work.

| Inventory measure | Before 5q | After 5q |
| --- | ---: | ---: |
| Vocabulary meaning strings | 17,359 | 17,317 |
| Exact eligible dictionary matches | 13,037 | 13,194 |
| Reviewed equivalents/construction renderings | 600 | 859 |
| Meaning strings still requiring review | 3,722 | 3,264 |
| Records with remaining meaning signals | 2,327 | 2,031 |
| N3 `needs-review` strings / records | 458 / 296 | 0 / 0 |
| Effective examples | 13,698 | 13,692 |
| Records without effective examples | 686 | 687 |
| Examples without a literal target-form match | 2,470 | 2,469 |
| Original-content snapshots | 282 | 390 |

N5/N4/N3 now have zero current meaning signals. The remaining N2/N1 bands have 1,059/2,185 `needs-review` strings, plus 14 construction-supported and six phrase-supported signals. These counts do not certify all unflagged meanings, examples, levels or pedagogy. Cumulatively 140 examples are explicitly selected and 22 omitted; the 13,692 effective examples have not all received contextual review.

Only the **104 corrected records** change effective content. Every prior unit/member/reference mapping compares identically before source-digest rebinding: all **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups and 408 level decisions** remain unchanged. The full prompt audit compiles and grades all 19,016 default projections with zero omitted units.

After-5q source catalog SHA-256: `189a38b91ef1641ac6219257bb70d9f07df081bedec81dba955513839189bc39`.
After-5q canonical study SHA-256: `1700ea9b9c2f12a3d5cf6fd2f32814529059af8aedde3169c4e0de4ec2ee9a63`.
After-5q review-row SHA-256: `01b991d55b265680d2ad1ba32daa2ea9c9fa951b747b1b5807c7950ac987f1fc`.

## First N2 meaning cohort (5r)

This batch adds **150 decisions: 68 corrected and 82 retained**, covering the first N2-introduction records with `needs-review` meanings through `3744253331` (215 flagged strings). The earlier cross-level reviews of 冠 and 納める remain separate. Cumulatively there are **1,197 meaning reviews: 410 corrected and 787 retained**. The existing correction/compiler/inventory pipeline processes this data without new production logic, schema changes or additional dictionary entries.

| Boundary | Selected wording or treatment |
| --- | --- |
| Verb direction | 片付く becomes to be put in order/disposed of/solved/finished; 建つ becomes to be erected/built; くるむ becomes to wrap/roll up. |
| Spelling and roles | ダム corrects dumb to dam; ブラシ removes brushy; 務める selects serving/acting in a role, distinguishing employment by 勤める; 正面 selects front/frontage rather than honesty. |
| Context and category | 不運 selects misfortune/bad luck; 中性 separates neutrality, neuter gender and sexlessness from sterility; オルガン explicitly names the musical instrument; うどん and 乾電池 gain specific food/battery categories. |
| Explicit polysemy | バンド separates music/material/frequency; スライド separates projection/microscope slides from sliding/indexing; プログラム separates event/booklet/computer contexts under existing eligible entries. |
| Grammar and incomplete wording | 送り仮名 specifies kana after a kanji completing the word's reading/inflection; 出来上がる removes by definition; 有無 preserves both presence and absence while removing the opaque flag-indicator claim. |

Other changes make selected dictionary wording clearer without proving every omitted source phrase impossible in every context. Retained decisions explicitly cover articles, plural forms, punctuation, illustrative qualifiers and contextual synonyms. 液体 retains fluid in its liquid-material context, supported by liquid and the source's water/oil examples; this does not assert that all fluids, including gases, are 液体. Context remains in the cited evidence rather than being accepted by a broad synonym matcher.

Seventeen decisions account for **33 original examples: 31 selected unchanged and two omitted**. 務める's second example has differing Japanese/English proper names (オリビア/Olivier); neither name is silently rewritten. 撒く's kana-only sowing proverb does not independently establish the selected spelling/sense rather than 蒔く, whose separate card is retained. Both omitted examples survive completely in the original snapshots. スライド's microscope and pension-indexing examples cite distinct senses, as do はめる's entrapment and ring examples. No sentence, translation or reading is generated, and unselected examples remain separate review work.

| Inventory measure | Before 5r | After 5r |
| --- | ---: | ---: |
| Vocabulary meaning strings | 17,317 | 17,320 |
| Exact eligible dictionary matches | 13,194 | 13,312 |
| Reviewed equivalents/construction renderings | 859 | 959 |
| Meaning strings still requiring review | 3,264 | 3,049 |
| Records with remaining meaning signals | 2,031 | 1,881 |
| N2 `needs-review` strings | 1,059 | 844 |
| Effective examples | 13,692 | 13,690 |
| Examples without a literal target-form match | 2,469 | 2,467 |
| Original-content snapshots | 390 | 458 |

N5/N4/N3 retain zero current meaning signals. N2 has 564 records with remaining signals; N1 still has 2,185 `needs-review` strings. The overall remaining count includes 14 construction-supported and six phrase-supported meanings across N2/N1. These are inventory findings, not a count of proven errors or complete curriculum approval. Cumulatively 171 examples are explicitly selected and 24 omitted; 687 vocabulary records have no effective examples. The 13,690 effective examples have not all received contextual review.

Only the **68 corrected records** change effective content. Before digest rebinding, every canonical unit, member mapping and reference mapping compares identically with the previous artifacts: **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups and 408 level decisions** are preserved. The complete prompt audit still compiles and grades all 19,016 default projections with zero omitted units.

After-5r source catalog SHA-256: `cc9c0e4b46248d4f530bf7a473ff01a20aa1c6af16c6570867720d93de32c8d3`.
After-5r canonical study SHA-256: `b3bf1a8157ad2eca3d4bb65bb35091d94be54e91fd2c0468b8e7af390777fdbc`.
After-5r review-row SHA-256: `9ec521c86585ac76362d9df0789a44dad17c79c9505347250ca3ccf815a89c03`.

## Second N2 meaning cohort (5s)

This batch adds **150 decisions: 73 corrected and 77 retained**, covering the next N2 `needs-review` records after `3744253331` through `69caece3b1` (220 flagged strings). Cumulatively the ledger has **1,347 reviews: 483 corrected and 864 retained**. The existing loader, correction contract, validators, compiler and inventory process every decision; production logic and schemas do not change.

| Boundary | Selected wording or treatment |
| --- | --- |
| Primary readings and spellings | 工夫・くふう selects devising/idea/plan rather than こうふ's laborer; 日日・ひにち selects an event date or number of days rather than daily; 湧く selects welling/arising rather than 沸く's boiling. |
| Returning and apparent feelings | 引き返す selects turning back/returning rather than sending another object back. 嫌がる specifies apparent/expressed dislike rather than only the private feeling. |
| Context and category | 重量 selects weight rather than a heavyweight boxer; 電波 specifies radio waves/signals/reception; 白髪 removes the trendy-bleaching claim; 平仮名 removes the unsupported 47-syllables count. |
| Dates and regions | 中旬 explicitly means days 11–20, rather than a mathematical third of every month. 関東 distinguishes the modern Tokyo region from the historically qualified eastern-half meaning. |
| Grammar and register | だらしない uses untidy/undisciplined adjectives rather than a sexualized person noun; 御覧 separates try-to/look/looking; おめでたい separates celebratory and naive/foolish uses. |

Other decisions clarify dictionary wording or retain explicit articles, plurals, spelling, register, illustrative qualifiers and contextual synonyms. Selected wording is not a claim that every omitted string is impossible in all historical, technical or idiomatic contexts. Exact-gloss differences remain review signals rather than an error count.

Two evidence-only corrections preserve independently attested source homonyms. ランチ retains its original lunch entry **1140100** and adds **2854169**, with the precise gloss **launch (boat)**; this does not assert a product/rocket-launch sense. カラー retains color/colour under **1038500** and adds collar entry **2853151**, keeping its original meanings unchanged. Both added entries independently allow the same primary written/reading pair. The original primary dictionary IDs remain, no new source member is created and no canonical group changes. コレクション's correction wording lacks support in its selected pinned entry and stays in the original snapshot rather than acquiring fabricated evidence.

Thirty-one decisions account for **60 original examples: 59 selected unchanged and one omitted**. The omission is 無数's fixed-number English paraphrase of an uncounted multitude. Its full original text, translation, sentence ID and furigana remain; this is a contextual selection decision, not a claim that the sentence is intrinsically wrong. 日日's date/duration, 御覧's try/look and 湧く's emotion/tears examples cite their distinct selected senses. No sentence, translation, reading or furigana is generated. Broader example curation remains separate.

| Inventory measure | Before 5s | After 5s |
| --- | ---: | ---: |
| Vocabulary meaning strings | 17,320 | 17,340 |
| Exact eligible dictionary matches | 13,312 | 13,461 |
| Reviewed equivalents/construction renderings | 959 | 1,050 |
| Meaning strings still requiring review | 3,049 | 2,829 |
| Records with remaining meaning signals | 1,881 | 1,731 |
| N2 `needs-review` strings | 844 | 624 |
| Effective examples | 13,690 | 13,689 |
| Original-content snapshots | 458 | 532 |

N5/N4/N3 retain zero current meaning signals. N2 has 414 records with remaining signals; N1 still has 2,185 `needs-review` strings. The total includes 14 construction-supported and six phrase-supported meanings across those bands. Cumulatively 230 examples are explicitly selected and 25 omitted; 687 vocabulary records have no effective examples and 2,467 examples lack a literal target-form match. The effective examples have not all received contextual review, and unflagged senses, levels and curriculum suitability are not certified by these counts.

Only the **73 corrected records** change effective content. Every prior canonical unit, member mapping and reference mapping compares identically before digest rebinding: **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups and 408 level decisions** are preserved. All 19,016 default prompt projections compile and grade with zero omitted units.

After-5s source catalog SHA-256: `9f06ce4aa2d2761ddb2c0f99e424a5f7eca106d0491a48566053809070afd476`.
After-5s canonical study SHA-256: `bb24f2bd7da0041b8d536321ea5211d5f6cf2319e23c863292ec664ee402b3f4`.
After-5s review-row SHA-256: `f29e0bf21d4bedd873cfa7f0dcd30258120be9606f2b132c34e812454da86180`.

## Third N2 meaning cohort (5t)

This batch adds **150 decisions: 61 corrected and 89 retained**, covering the next N2 `needs-review` records after `69caece3b1` through `a1b5b4da89` (227 flagged strings). Cumulatively the ledger has **1,497 reviews: 544 corrected and 953 retained**. The existing correction/validation/compiler/inventory pipeline processes all decisions without production logic, schema or root dictionary-evidence changes. The N2 regressions share one assertion helper for reviewed meanings and protected source fields.

| Boundary | Selected wording or treatment |
| --- | --- |
| Numerical rules | 未満 states a strict less-than boundary, rather than subjective insufficiency. 四捨五入 specifies rounding off/half away from zero rather than always rounding up. |
| Institutional categories | 郡 corrects country to county. 学級 is a school class rather than an entire grade/year; 学部 is a university faculty/department rather than an undergraduate person. |
| Primary spelling | 永い selects temporal long/prolonged; 係わる excludes the ineligible sticking-to-opinions sense; 生長 specifies plant growth. |
| Roles and direction | 助かる includes receiving help rather than being helpful; 兼ねる specifies simultaneous roles/jobs and the unable-to verb construction. |
| Specific context | 古典 names a classic rather than any old book; 小遣い names available spending money rather than expenses; 琴 names a koto/zither rather than a harp; 水平線 explicitly identifies the water-related horizon. |

Other decisions retain articles, plurals, punctuation, register, state/action renderings and contextual synonyms, each tied to an eligible exact dictionary gloss with an explicit rationale. No general synonym matcher is added. A correction often makes wording clearer without proving every discarded string impossible in every context.

拡張's **escape (ESC)** is retained under pinned JMdict entry **1205220, sense 2**, alongside expansion/extension/enlargement. It denotes the technical control character rather than escaping confinement. Independent corroboration comes from the [Keio-hosted JIS X 0202 terminology table, section 5.1.11](https://www.ny.ics.keio.ac.jp/ipsjts1/1st-ver/X0202.htm), which records the older JIS X 0201 name for ESC. This is a contextual citation, not an imported standard or an assertion about current standards requirements. The source's unusual wording is not automatically discarded simply because it looks unfamiliar.

Twenty-four decisions account for **42 original examples: 41 selected unchanged and one omitted**. 永い keeps the temporal day-length example using the shared dictionary entry's 長い spelling; its long-letter example concerns textual extent and is omitted from effective content. Both original sentences, translations, IDs and furigana survive. Other selected examples distinguish class/department, strict age thresholds, rounding, involvement/serious bearing and being saved. 拡張's two examples explicitly remain attached to expansion, not the ESC sense. No sentence, translation, reading or spelling is rewritten, and examples outside explicit decisions remain separate review work.

| Inventory measure | Before 5t | After 5t |
| --- | ---: | ---: |
| Vocabulary meaning strings | 17,340 | 17,332 |
| Exact eligible dictionary matches | 13,461 | 13,563 |
| Reviewed equivalents/construction renderings | 1,050 | 1,167 |
| Meaning strings still requiring review | 2,829 | 2,602 |
| Records with remaining meaning signals | 1,731 | 1,581 |
| N2 `needs-review` strings | 624 | 397 |
| Effective examples | 13,689 | 13,688 |
| Examples without a literal target-form match | 2,467 | 2,466 |
| Original-content snapshots | 532 | 593 |

N5/N4/N3 retain zero current meaning signals. N2 has 264 records with remaining signals; N1 still has 2,185 `needs-review` strings. The overall count includes 14 construction-supported and six phrase-supported meanings across those bands. Cumulatively 271 examples are explicitly selected and 26 omitted; 687 vocabulary records have no effective examples. The 13,688 effective examples have not all received contextual review, and unflagged senses, levels and curriculum suitability are not certified by these figures.

Only the **61 corrected records** change effective content. Every prior canonical unit, member mapping and reference mapping compares identically before digest rebinding: **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups and 408 level decisions** are preserved. All 19,016 default prompt projections compile and grade with zero omitted units.

After-5t source catalog SHA-256: `42386c8d2a457b1c1cc9b43413e54dc052627c04f5db8d7a06591bddeba46b0e`.
After-5t canonical study SHA-256: `1ad2c9aeaf5fe4d61438f1868dcb840c1159494fefeccbabbbef9bdb0539d0ae`.
After-5t review-row SHA-256: `9bb7f5aa2ebc2e527be35744ce1f9ecc9a2ed6f94e92110f683ded6476b5650c`.

## Fourth N2 meaning cohort (5u)

This batch adds **150 decisions: 45 corrected and 105 retained**, covering the next N2 `needs-review` records after `a1b5b4da89` through `d5be746bde` (219 flagged strings). Cumulatively the ledger has **1,647 reviews: 589 corrected and 1,058 retained**. The existing correction/compiler/inventory pipeline processes the data; production logic and schemas do not change, and the new corpus regressions reuse the existing reviewed-card assertion.

| Boundary | Selected wording or treatment |
| --- | --- |
| Different same-reading verbs | 努める selects striving/making an effort rather than employment/holding a post. 揚げる specifies hoisting, flying a kite and deep-frying. |
| Unrelated source meanings | 統計 becomes statistics rather than scattering/dispersion; 濃度 selects concentration/density rather than brightness; 佚 selects its eligible comfortable/relaxing vocabulary sense rather than a list of disparate character meanings. |
| Verb direction | 隔てる selects separating/isolating rather than passive be shut out; 交ぜる selects mix/stir/blend rather than passive be mixed; 着せる specifies dressing someone else. |
| Distinct existing members | 椀 explicitly names the wooden bowl and 碗 the ceramic/porcelain bowl. Both source members and separate canonical units remain. |
| Other context | 三日月 selects a visible crescent/young moon; 宛名 names the addressee/name-and-address; 整備 specifies maintenance/servicing; 形容詞 separates the general adjective category from its Japanese i-adjective use. |

Other decisions explicitly retain articles, plurals, register, qualifiers, descriptive/nominal forms and contextual synonyms. Corrections clarify selected senses without asserting that every omitted phrase is impossible in every historical or idiomatic context. 怠る's unusual illness-improvement meaning is preserved with its explicit eligible dictionary context rather than discarded for unfamiliarity; its examples remain tied to neglect. No general synonym acceptance rule is introduced.

An evidence-only correction adds pinned JMdict **2854421** for チョーク's existing chock meaning alongside its original chalk entry **1078240**. The primary spelling/reading is independently eligible in both entries. The precise answer **chock (wedge placed under a wheel)** distinguishes the object from chalk. The original primary dictionary ID remains, no additional headword or canonical unit is created, and unrelated choke/doorstop senses are not added. Root dictionary/form/evidence corrections now total 54.

Sixteen decisions account for **30 original examples: 29 selected unchanged and one omitted**. The omission is a 形容詞 sentence making an unqualified noun-modifier classification claim without sufficient language/grammar context. Its complete original text, translation, sentence ID and furigana survive; it is not rewritten into a newly authored grammar lesson. Other selected examples cover effort, statistics, mixing/dressing direction, maintenance, rice fields, mail addressees and distinct hoisting/frying senses. Examples outside these explicit decisions remain separate work.

| Inventory measure | Before 5u | After 5u |
| --- | ---: | ---: |
| Vocabulary meaning strings | 17,332 | 17,326 |
| Exact eligible dictionary matches | 13,563 | 13,641 |
| Reviewed equivalents/construction renderings | 1,167 | 1,302 |
| Meaning strings still requiring review | 2,602 | 2,383 |
| Records with remaining meaning signals | 1,581 | 1,431 |
| N2 `needs-review` strings | 397 | 178 |
| Effective examples | 13,688 | 13,687 |
| Original-content snapshots | 593 | 638 |

N5/N4/N3 retain zero current meaning signals. N2 has 114 records with remaining signals; N1 still has 2,185 `needs-review` strings. The overall count includes 14 construction-supported and six phrase-supported meanings across those bands. Cumulatively 300 examples are explicitly selected and 27 omitted; 687 vocabulary records have no effective examples and 2,466 examples lack a literal target-form match. The effective examples, unflagged senses, community levels and curriculum suitability are not all certified by these figures. Unusual source members are preserved with their existing identities/levels for that later review.

Only the **45 corrected records** change effective content. Every prior canonical unit, member mapping and reference mapping compares identically before digest rebinding: **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups and 408 level decisions** are preserved. All 19,016 default prompt projections compile and grade with zero omitted units.

After-5u source catalog SHA-256: `05405434fe153ca38d6907e533db9442fd1990706e1ef29837475624b15efdb6`.
After-5u canonical study SHA-256: `238ee36671738155c8ce0228b1729fa0b15549a0260fed2dc91665a61a034189`.
After-5u review-row SHA-256: `4861da33f95aa522aba5c82c4cc6314b04547230b23f1db1a7e655a2a7defa19`.

These are revised build artifacts. The application database still holds the earlier immutable **DRAFT** snapshot; it was not replaced, refreshed or published. The importer continues to refuse silent replacement of an existing snapshot. A deliberate draft refresh belongs after the remaining content work. English study, application learner state and the published Japanese assessment are unchanged.

## Final N2 dictionary and construction cohort (5v)

This batch adds **110 decisions: 45 corrected and 65 retained**, covering the final 106 N2 `needs-review` dictionary records (178 strings) and four supported adverb constructions (12 strings). Cumulatively the ledger has **1,757 reviews: 634 corrected and 1,123 retained**. Existing correction, validation, compilation and inventory code processes every decision; no new production logic, schema or phrase-review mechanism is introduced.

| Boundary | Selected wording or treatment |
| --- | --- |
| Primary spelling and direction | 治す selects cure/heal rather than general fixing/repairing; 煮える explicitly describes being boiled/cooked; 開放 specifies opening/access rather than 解放's liberation. |
| Category and identity | 水平 selects horizontal/level/even rather than horizon; 人文科学 selects humanities/arts rather than social sciences; 政党 denotes the political party rather than its member. |
| Pronouns and calendar | 手前's first-person pronoun is I/me rather than we; its spatial senses and register-restricted you remain. 下旬 explicitly names the 21st through the month's final day. |
| Word form and context | 出来上がり names completion/finish/workmanship/result rather than finite being ready or being cut out for something. 恋しい specifies yearning/missing; 傑作 separates excellent work from the ironic absurd-blunder sense. |
| Declared constructions | 一段と selects comparative even/still/much more/further through its declared adverb-to base sense. やたらに/矢鱈に retain random/indiscriminate adverbial wording through their declared sense-2 adverb-ni derivations; しいんと retains the grave/deathly silence rendering through adverb-to. |

The construction validator continues checking the exact declared base pair, suffix, part of speech and sense. No direct-headword claim or general synonym acceptance is added. やたらに and 矢鱈に retain their different source levels and shared canonical unit. Source level, identity and original spelling/reading are preserved for every record.

Two evidence-only root corrections add independent pinned JMdict entries for existing homonyms: **2862559** for コック's tap/spigot/faucet alongside original cook entry **1050310**, and **2850287** for チップ's chip alongside original tip/gratuity entry **1077740**. The original primary dictionary IDs remain. The bare cock and internal Dutch-origin annotation are replaced with clear cook/tap/spigot/faucet wording; unrelated bird, anatomical, wrist, golf or food senses are not added. Root dictionary/form/evidence corrections total **56**, plus four phrase-attested records.

The four N2 phrases **お待ちください, 行っていらっしゃい, お元気で and ご存じですか** retain their existing pinned source-bound attestations and six meanings. Their contract already checks the full expression, reading, meanings and declared normalization. They remain separately reported as `phrase-attested`; this batch does not copy that contract into a dictionary review, treat them as direct matches or certify all pedagogy.

Fourteen decisions account for **27 original examples: 24 selected unchanged and three omitted**. 治す omits an English sentence missing its infinitive marker. 出来上がり omits two finite 出来上がる examples, already present on the separate verb card. Complete originals, translations, IDs and furigana remain; no replacement sentences are generated. Selected examples include distinct 傑作 senses, comparative 一段と, spatial 手前, calendar 下旬, humanities, political parties and intransitive cooking.

| Inventory measure | Before 5v | After 5v |
| --- | ---: | ---: |
| Vocabulary meaning strings | 17,326 | 17,312 |
| Exact eligible dictionary matches | 13,641 | 13,720 |
| Reviewed equivalents/construction renderings | 1,302 | 1,399 |
| Remaining meaning signals | 2,383 | 2,193 |
| Records with remaining meaning signals | 1,431 | 1,321 |
| N2 `needs-review` / construction strings | 178 / 12 | 0 / 0 |
| N2 separately attested phrase meanings | 6 | 6 |
| Effective examples | 13,687 | 13,684 |
| Original-content snapshots | 638 | 683 |

N5/N4/N3 retain zero current meaning signals. N1 has **1,317 records with 2,185 `needs-review` strings and two construction meanings**. The four separately attested N2 phrase records account for the remaining six signals. Cumulatively 324 examples are explicitly selected and 30 omitted; 688 records lack effective examples and 2,466 examples lack a literal target-form match. These numbers do not certify unflagged senses, examples, disputed community levels or curriculum suitability.

Only the **45 corrected records** change effective content. Every canonical unit, member and reference mapping compares identically before policy digest rebinding: **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups and 408 level decisions** remain. All 19,016 default prompt projections compile and grade, with zero omitted units.

After-5v source catalog SHA-256: `63f015425c565b8cd2790eaf3859494e91b1d00248e90dc3afd770300d510668`.
After-5v canonical study SHA-256: `c6ef19f47c819a90b18b495fec33fada0dfb21a79601802f4f1e9952800a3c57`.
After-5v review-row SHA-256: `d9aa5c2961e113bc44c2ab00dac0f6afd3bf381baf8f30292fc7739ed8a9425c`.

The application keeps its earlier immutable Japanese **DRAFT** snapshot. No draft refresh, publication, migration or application learner-state write occurs. English publication and the active Japanese assessment stay unchanged.

## First N1 meaning cohort (5w)

This batch adds **150 decisions: 57 corrected and 93 retained**, covering the first flagged N1 dictionary records through `1e2592203e` (245 strings). Cumulatively the ledger has **1,907 reviews: 691 corrected and 1,216 retained**. The existing correction, validation, compilation and inventory pipeline processes the data; production logic and schemas stay unchanged. N1 and N2 corpus regressions now share the existing reviewed-card assertion instead of copying its protected-field checks.

| Boundary | Selected wording or treatment |
| --- | --- |
| Primary reading | 一定・いちじょう selects certainly/certain/definite rather than fixed/uniform/standardized meanings from いってい. 入る・いる keeps entering and the setting of the sun/moon. Source readings and levels are unchanged. |
| Independent word forms | 偏・へん selects the left-hand character radical, distinct from 偏る. 修業 specifies study/training rather than transferring ascetic 修行 meanings. |
| Action and direction | 勤まる specifies being fit/qualified for a role rather than arbitrary mechanical functioning; 治まる specifies settling/peace/subsiding rather than active clamping down. 乗り込む specifies boarding/entering oneself rather than shipping passengers or staffing a ship. |
| Categories and English errors | 浴室 is the bathroom rather than bathing or a bathtub. 兵器 corrects ordinance to ordnance; 粘り corrects stickyness to stickiness; 廃棄 corrects annullment to annulment. |
| Calendar and context | 未・ひつじ separates the zodiac sign, traditional hour, direction and sixth lunar month; that month is not invariably Gregorian June. 消息 specifies news/contact/whereabouts; 進出 separates market expansion from advancing in a competition. |

Other corrections clarify career-track civil-service キャリア, common reed 葦, the chopping sound 丁々, negative-context 一切, self-rotation 自転, full-of だらけ, romantic 恋愛, practical/fund management 運用, account-closing 決算 and event-hosting 主催. 俺 retains the I/me meaning with informal/rough/blunt register in its evidence rather than requiring every speaker to boast. Retained definitions have explicit contextual rationales; they are not a general synonym acceptance rule or a teacher signoff.

Three evidence-only root corrections add **four independently pinned entries** for existing homonyms:

| Source member | Original primary entry | Added entry/meaning |
| --- | --- | --- |
| フォーム | 1110340, form | 2855933, foam |
| ハンガー | 1096430, coat hanger | 2861509, hangar; 2861510, hunger |
| シート | 1059450, seat | 2851348, sheet |

All primary spelling/reading pairs are independently eligible. The rare hangar/hunger and foam meanings are preserved rather than deleted for unfamiliarity. Original primary IDs, source identities and community levels remain; unrelated spreadsheet and other senses are not added. Root dictionary/form/evidence corrections total **59**, plus four phrase-attested records.

Twenty-four decisions account for **44 original examples: 37 selected unchanged and seven omitted**. The omissions are two different-loanword substring matches (ユニフォーム/リフォーム) on フォーム, two inflected 偏る examples on the radical noun 偏, two fixed/deadline examples that do not attest 一定's rare いちじょう reading, and one かぶれる English translation introducing infection where the Japanese does not establish that cause. Complete original text, translations, IDs and furigana survive; no replacement sentence is invented. Selections include distinct filling/satisfaction, bodily pain subsiding, melody/investigation, flood-engulfing/understanding, boarding/entering and market/competition senses. Unselected examples remain separate content work.

| Inventory measure | Before 5w | After 5w |
| --- | ---: | ---: |
| Vocabulary meaning strings | 17,312 | 17,285 |
| Exact eligible dictionary matches | 13,720 | 13,821 |
| Reviewed equivalents/construction renderings | 1,399 | 1,516 |
| Remaining meaning signals | 2,193 | 1,948 |
| Records with remaining meaning signals | 1,321 | 1,171 |
| N1 `needs-review` strings | 2,185 | 1,940 |
| Effective examples | 13,684 | 13,677 |
| Original-content snapshots | 683 | 743 |

N1 retains **1,167 records with 1,940 `needs-review` strings and two construction meanings**. The four separately attested N2 phrases retain six meanings. N5/N4/N3 still have zero current meaning signals and N2 has zero dictionary/construction meaning flags. Cumulatively 361 examples are selected and 37 omitted; 691 records lack effective examples and 2,465 examples lack a literal target-form match. This does not certify all unflagged senses, examples, community levels or curriculum suitability.

Effective content changes on **58 records: 57 meaning corrections plus the retained-meaning フォーム record's example omissions**. Every prior canonical unit, member and reference mapping compares identically before digest rebinding: **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups and 408 level decisions** remain. All 19,016 default prompt projections compile and grade with zero omitted units.

After-5w source catalog SHA-256: `b4fce38ea16ee212ee78f23b9ebf33dd06d0e7c7aac9701af30c4040aedbda34`.
After-5w canonical study SHA-256: `fbdbf9e5e7883a821376f02f8c42ecaef6b70e4ca34a64a2c1ef0db7ecf9022b`.
After-5w review-row SHA-256: `d146e0166e4800fdbc68476d8bde8017bb6c3834c0404d89599f8a5f9541b20b`.

The application retains its earlier immutable Japanese **DRAFT** snapshot. No refresh, publication, migration or application learner-state write occurs; English publication and the active Japanese assessment remain unchanged.

## Second N1 meaning cohort (5x)

This batch adds **150 decisions: 60 corrected and 90 retained**, covering the next flagged N1 records after `1e2592203e` through `3c74d17c1d` (253 strings). Cumulatively the ledger has **2,057 reviews: 751 corrected and 1,306 retained**. The existing loaders, correction ledger, validators, compiler, inventory and shared test assertion process every decision. Production logic and schemas remain unchanged.

| Boundary | Selected wording or treatment |
| --- | --- |
| Ordinal and quantity | 番目 selects the nth position rather than the erroneous cardinal-number label. 弱 corrects little less then to a little less than while preserving weakness/the weak. |
| Primary readings | 地方・じかた selects coast/shore/countryside rather than generic regions from ちほう. 流・りゅう selects style/manner/way rather than 流れる・ながれる. 悪い・にくい retains hateful/detestable rather than silently substituting わるい. 弟・おと specifies the entry's same-sex younger-sibling relation rather than silently changing to おとうと. |
| Verb direction | 弱る describes becoming weak, not actively impairing something; 潤う describes becoming moist or benefiting rather than favouring/charming; 成り立つ keeps passive agreement conclusion, composition, validity and viability. |
| Categories and false friends | 人質 is a hostage rather than every prisoner. 応急 specifies a temporary/emergency measure. カンニング specifies examination cheating rather than the English quality cunning. 切開 selects incision rather than land clearing. |
| Calendar and sound | 卯 separates the Rabbit sign, traditional hour, east and second lunar month; the lunar month is not invariably Gregorian February. 音色 selects timbre/tone quality rather than pitch tuning or an entire synthesizer patch. |

Other corrections clarify 上下・うえした, rough-sketch デッサン, maritime 海運, physical/histological 固定, the sake cup 杯, the traditional-house corridor 縁側, possibility-expression 事によると, compensation 弁償, occasional 間々, industry-promotion 興業, event/task 使命 and enrollment 加入. Retained wording has explicit contextual rationales; spelling preferences such as the usual 速める for a speed sense do not become invented restrictions excluding the unchanged eligible 早める pair. No general synonym acceptance rule or teacher signoff is introduced.

Five evidence-only root corrections preserve existing homonyms using independent pinned entries:

| Source member | Original primary entry | Added entry/meaning |
| --- | --- | --- |
| ホール | 1122130, hall | 2841290, hole |
| パンク | 1103110, puncture/bursting | 2846311, punk (music/fashion) |
| と | 1008490, conditional particle | 2872968, promoted pawn |
| イエス | 1021010, Jesus | 2843921, yes |
| バット | 1099230, sports bat | 2843630, shallow tray |

All resulting meanings cite an eligible primary spelling/reading pair and exact selected gloss. バット's tray entry gives **vat as its English etymology**, while its Japanese meaning is a **shallow tray, usually steel or plastic**. The correction preserves that homonym with the precise Japanese meaning rather than claiming a large English vat; the separate VAT tax acronym is not added. Unrelated whole, technical-hole and other senses are not imported. Original primary IDs, source identities and community levels remain. Root dictionary/form/evidence corrections total **64**, plus four phrase-attested records.

Thirty decisions account for **58 original examples: 42 selected unchanged and 16 omitted**. Eight omissions concern the unchanged primary readings/forms 地方・じかた, 流・りゅう, 悪い・にくい and 弟・おと (two each). Two と examples do not isolate the selected conditional/pawn senses, with one additionally translating confidence as bravery. Six single omissions concern a changed snake proverb, an added interested-we proposition on 応急, creative love/treat-ourselves wording on 潤う, arm/hand on 引きずる, an unselected politeness sense on 様 and pitch/timbre on 音色. Complete source text, translations, IDs and furigana remain; no replacement sentence is authored. Selections include ordinal positions, literal and metaphorical hostages, becoming weaker, fixing objects, possibility, compensation, reluctant action, custody/collection, timbre, enrollment and theoretical validity. Remaining examples are separate content work.

| Inventory measure | Before 5x | After 5x |
| --- | ---: | ---: |
| Vocabulary meaning strings | 17,285 | 17,260 |
| Exact eligible dictionary matches | 13,821 | 13,932 |
| Reviewed equivalents/construction renderings | 1,516 | 1,633 |
| Remaining meaning signals | 1,948 | 1,695 |
| Records with remaining meaning signals | 1,171 | 1,021 |
| N1 `needs-review` strings | 1,940 | 1,687 |
| Effective examples | 13,677 | 13,661 |
| Original-content snapshots | 743 | 804 |

N1 retains **1,017 records with 1,687 `needs-review` strings and two construction meanings**. Four separately attested N2 phrases retain six meanings. N5/N4/N3 have zero current meaning signals; N2 has zero dictionary/construction meaning flags. Cumulatively 403 examples are selected and 53 omitted; 696 records lack effective examples and 2,462 examples lack a literal target-form match. These figures do not certify unflagged senses, examples, community levels or curriculum suitability.

Only the **60 corrected records** change effective content. Every prior canonical unit, member and reference mapping compares identically before digest rebinding: **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups and 408 level decisions** remain. All 19,016 default prompt projections compile and grade with zero omitted units.

After-5x source catalog SHA-256: `f95ad3dcebc766d14a5826a0b0547a4b3d6ac766dbcfc1114a90b00cdaf6152b`.
After-5x canonical study SHA-256: `8a14540c77a0ac419504ac0e08ba09cf6d9e65674ace42e945fd5c6873cc3148`.
After-5x review-row SHA-256: `7a1f8e80cbff22560558de7805c520c2611f0c801c5e1965cdc88173fdad6000`.

The application retains its earlier immutable Japanese **DRAFT** snapshot. No draft refresh, publication, migration or application learner-state write occurs. English publication and the active Japanese assessment remain unchanged.

## Third N1 meaning cohort (5y)

This batch adds **150 decisions: 58 corrected and 92 retained**, covering the next flagged N1 records after `3c74d17c1d` through `5aa2622835` (232 strings). Cumulatively the ledger has **2,207 reviews: 809 corrected and 1,398 retained**. Existing loaders, ledger, validators, compiler, inventory and shared test assertions process every decision; production logic and schemas stay unchanged.

| Boundary | Selected wording or treatment |
| --- | --- |
| Primary reading | 万人・ばんじん selects all people/everybody rather than numeric まんにん. 乾・けん selects the qian/heaven trigram rather than the drying verb or an unrestricted emperor noun. 来る・きたる retains the forthcoming modifier/original arriving sense rather than borrowing くる causative examples. |
| Grammatical role | 共・とも separates together/both/all/inclusion from a different concessive particle or plural ども. 染まる describes being dyed/tainted/steeped rather than actively dyeing; 結び付く explicitly describes being connected/related/joined. |
| Category | 正解 names a correct answer/solution/interpretation rather than every correct thing. 長編 names a long work, full-length novel or feature-length film. 一見・いちげん specifies a first unintroduced visit rather than any unfamiliar person. |
| Meaning context | 自覚 specifies self-awareness rather than necessarily shyness. 漢語 is a Chinese-origin Japanese word rather than every kanji compound. 語彙 is vocabulary/lexicon rather than a glossary document. 脳 is brain/mind rather than memory alone. |
| Precision | 発病 names illness onset; 追及 separates investigation/questioning and catching up rather than guaranteeing a solved crime. 元年 specifies an imperial era rather than necessarily a whole reign. 社宅 specifies company-provided housing without requiring company ownership. |

Other corrections clarify staged 上演, unclear/unknown/ignorance distinctions in 不明, erasure/deletion context in 消去, regional 特産, receiving/enjoying rights or benefits in 享受, late-hours activity 夜更かし rather than a nighthawk, and the game category パチンコ rather than treating it as ordinary pinball. The unfamiliar dictionary-containing sense on 収容 and eligible psychology extinction sense on 消去 remain explicitly evidenced rather than deleted merely for unfamiliarity. Retained nominal/adjectival forms and contextual renderings are individual authored decisions, not a general synonym rule or teacher signoff.

Two evidence-only root corrections preserve existing homonyms with independent pinned entries:

| Source member | Original primary entry | Added entry/meaning |
| --- | --- | --- |
| ペア | 1120690, pair | 2849141, European pear |
| ベスト | 1119530, best | 2856634, vest |

The pear is explicitly qualified as European pear by its entry. Best/vest retains its original meaning array. Both primary pairs are independently eligible; original primary IDs, source identities and levels remain unchanged. No unrelated boat, card or other senses are added. Root dictionary/form/evidence corrections total **66**, plus four phrase-attested records.

Twenty-three decisions account for **41 original examples: 33 selected unchanged and eight omitted**. Omissions concern a concessive とも outside 共's selected senses, an あからさま sentence without 明白, numeric まんにん on 万人・ばんじん, two common くる causatives on 来る・きたる, an English kanji-compound generalization wider than 漢語 and two 乾く drying-clothes sentences on 乾・けん. Complete originals, translations, IDs and furigana survive. No replacement sentence is authored. Selections include all-people scope, explicit いちげん/くだん readings, self-awareness, correct answers, figurative 染まる, proposal/offer and questioning. Other examples remain separate content work.

| Inventory measure | Before 5y | After 5y |
| --- | ---: | ---: |
| Vocabulary meaning strings | 17,260 | 17,249 |
| Exact eligible dictionary matches | 13,932 | 14,027 |
| Reviewed equivalents/construction renderings | 1,633 | 1,759 |
| Remaining meaning signals | 1,695 | 1,463 |
| Records with remaining meaning signals | 1,021 | 871 |
| N1 `needs-review` strings | 1,687 | 1,455 |
| Effective examples | 13,661 | 13,653 |
| Original-content snapshots | 804 | 863 |

N1 retains **867 records with 1,455 `needs-review` strings and two construction meanings**. Four separately attested N2 phrases retain six meanings. N5/N4/N3 have zero current meaning signals and N2 has zero dictionary/construction meaning flags. Cumulatively 436 examples are selected and 61 omitted; 699 records lack effective examples and 2,459 examples lack a literal target-form match. These counts do not certify unflagged senses, examples, community levels or curriculum suitability.

Only the **58 corrected records** change effective content. Every prior canonical unit, member and reference mapping compares identically before digest rebinding: **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups and 408 level decisions** remain. All 19,016 default prompt projections compile and grade with zero omitted units.

After-5y source catalog SHA-256: `3429d591566735fa69e4dacc1142c393a90cc2faf68f416cae927f6102e19ede`.
After-5y canonical study SHA-256: `e8db89e6f47ba0ed9f0972cb0cf6f135219b375a82f7d30d5590b2df9d44ee32`.
After-5y review-row SHA-256: `99885fd86f12af9ad4717ef1db596beb02fa899b6c50440fa1348e565cf5ed49`.

The application retains its earlier immutable Japanese **DRAFT** snapshot. No draft refresh, publication, migration or application learner-state write occurs. English publication and the active Japanese assessment remain unchanged.

## Fourth N1 meaning cohort (5z)

This batch adds **150 decisions: 60 corrected and 90 retained**, covering the next flagged N1 records after `5aa2622835` through `74638a00a2` (238 strings). Cumulatively the ledger has **2,357 reviews: 869 corrected and 1,488 retained**. Existing loaders, correction ledger, validators, compiler, inventory and shared test assertions process every decision; production logic and schemas stay unchanged.

| Boundary | Selected wording or treatment |
| --- | --- |
| Negation and primary reading | 否・いな retains no/nay rather than yes/well. 会・え names a gathering rather than understanding. 少女・おとめ preserves its source reading and girl/young-lady meaning without requiring a daughter relationship or virginity. |
| Physical quantity and food | 熱量 is heat quantity/value, distinct from temperature. 梅干 explicitly names the pickled dried plum. あられ names hail or roasted mochi pieces rather than every cookie or a generic cartoon character. |
| Grammatical role | 受け付ける means actively accepting/receiving; a source example's ordinary passive inflection does not make the lemma passive. 埋蔵 names burying/having deposits rather than the treasure itself. 着席 names taking one's seat rather than chair furniture. |
| Categories | 時刻表 is a timetable/schedule rather than every table/chart. 誤差 qualifies measurement/calculation error. 語源 is a word's origin rather than necessarily a morphological root. 発芽 names germination/sprouting rather than every figurative burgeoning. |
| Context | 相対・あいたい specifies involvement between the parties concerned rather than every confrontation. 一筋・ひとすじ preserves a single line/strand or earnest single-mindedness rather than borrowing annotated 一条・いちじょう examples. 周 separates a circuit counter, perimeter and dynasty. |

Other changes clarify an actual encounter versus passing/missing each other in 擦れ違い, confirmation 確定 rather than a mathematical definition, work attendance 出社 rather than arrival in an arbitrary country, and a question/exclamation in 何と rather than indefinite whatever. 単一 corrects unitory to unitary. 造り and 作り keep their distinct source members and existing shared canonical unit while clarifying structure/appearance and sashimi contexts. The unfamiliar dictionary senses already supported by pinned evidence remain traceable; no broad synonym rule or teacher signoff is introduced.

Four evidence-only root corrections preserve existing meanings through independent entries:

| Source member | Original primary entry | Added entry/meaning |
| --- | --- | --- |
| あら | 1000520, interjection | 1000525, saw-edged perch (Niphon spinosus) |
| 南・なん | 2833068, mahjong | 2869020, geographic south prefix |
| 了 | 1553290, finish/completion | 2511770, understanding through the irregular 了 spelling of 諒 |
| クラブ | 1243910, club | 2846405, crab |

The complete pinned dictionary independently allows each primary spelling/reading pair. 南's geographic meaning is cited from its own prefix entry, not inferred from a mahjong tile. 了's understanding meaning is retained because its independent entry explicitly lists that spelling, despite its rarity. No unrelated fish remains/flaws, nanban food, nightclub/golf/card or additional truth/fact senses are added. Every original primary ID remains. The authoring helper selects the already-bounded cohort identity when the same written form also exists with another reading; this does not add a second production selector/importer. **南・なん and 南・みなみ remain separate canonical units**. Root dictionary/form/evidence corrections total **70**, plus four phrase-attested records.

Eighteen decisions account for **33 original examples: 27 selected unchanged and six omitted**. Two omissions do not attest 少女's preserved おとめ reading; one uses the かい suffix in 陸上競技会 rather than 会・え; one illustrates physical facing rather than 相対's selected private-party noun meaning; two explicitly annotate 一条 as いちじょう rather than 一筋・ひとすじ. Complete original text, translations, IDs and furigana survive. No replacement sentence is authored. Selections include ordinary active/passive acceptance, negative answers, confirmation, burial, circuits, plural address, work attendance, interjections, pickled plums, numerical error, timetables and game challenges. Other examples remain separate content work.

| Inventory measure | Before 5z | After 5z |
| --- | ---: | ---: |
| Vocabulary meaning strings | 17,249 | 17,247 |
| Exact eligible dictionary matches | 14,027 | 14,145 |
| Reviewed equivalents/construction renderings | 1,759 | 1,877 |
| Remaining meaning signals | 1,463 | 1,225 |
| Records with remaining meaning signals | 871 | 721 |
| N1 `needs-review` strings | 1,455 | 1,217 |
| Effective examples | 13,653 | 13,647 |
| Original-content snapshots | 863 | 927 |

N1 retains **717 records with 1,217 `needs-review` strings and two construction meanings**. Four separately attested N2 phrases retain six meanings. N5/N4/N3 have zero current meaning signals; N2 has zero dictionary/construction meaning flags. Cumulatively 463 examples are selected and 67 omitted; 703 records lack effective examples and 2,457 examples lack a literal target-form match. These figures do not certify unflagged senses, examples, community levels or curriculum suitability.

Only the **60 corrected records** change effective content. Every prior canonical unit, member and reference mapping compares identically before digest rebinding: **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups and 408 level decisions** remain. All 19,016 default prompt projections compile and grade with zero omitted units.

After-5z source catalog SHA-256: `e1da1eb38254d7ef43b18918ea2c9cc964f7aad84afaaa948af3894740c38d7f`.
After-5z canonical study SHA-256: `f3fd694f8b374cdf20523e888d7fd04aa8eede17f0f4f4a89c4fc99214123275`.
After-5z review-row SHA-256: `7e377c37c90ce81fa86a5c9639bd46a76a1f894429fa0652cbb5e6e9e71848f5`.

The application retains its earlier immutable Japanese **DRAFT** snapshot. No draft refresh, publication, migration or application learner-state write occurs. English publication and the active Japanese assessment remain unchanged.

## Fifth N1 meaning cohort (5aa)

This batch adds **150 decisions: 53 corrected and 97 retained**, covering the next flagged N1 records after `74638a00a2` through `91a314706a` (240 strings). Cumulatively the ledger has **2,507 reviews: 922 corrected and 1,585 retained**. The existing pinned loaders, correction ledger, validator, compiler, review inventory and shared test assertions process every decision; production code and schemas are unchanged.

| Boundary | Selected meaning |
| --- | --- |
| 民俗・みんぞく | Folk customs/folkways/ethnic customs; the distinct 民族 member and its unit remain. |
| 亜科・あか | Subfamily, not the different taxonomic rank suborder. |
| 短歌・たんか | Tanka/31-mora Japanese poem; morae and syllables are distinct. |
| 給う・たまう | To give and the honorific auxiliary after a verb stem, not to receive. |
| 華奢・かしゃ | Lavish/luxurious/showy/gaudy rather than delicate/slender from another reading. |
| 立方・たちかた | A dancer in a Japanese performance, not the activity or mathematical りっぽう. |
| 碌に | Explicit negative-context (not) well/enough/sufficiently. |
| 床・とこ | Bed/sickbed/alcove and the tatami straw core, not arbitrary padding; ゆか remains separate. |
| 仏・ふつ / 心情 | France; emotional sentiment/feelings rather than general mentality. |
| 溝・こう | 10^32/hundred nonillion rather than incompatible numerical scale labels. |
| 読み上げる / 夕焼け | Reading aloud versus finishing a text; evening glow rather than every sunset. |

The existing レース record retains race and lace. An evidence-only root correction adds JMdict **2848479** (lace) alongside the original **1144380** (race), both independently verified for レース/レース against the full pinned dictionary. The separate lathe homonym is not imported. Its primary ID, word, reading and level stay unchanged. Root dictionary/form/evidence corrections total **71**, plus four phrase-attested records. 主人公's independently attested household-head meaning is explicitly retained rather than deleted because it is unfamiliar.

Twenty-seven decisions account for **52 original examples: 49 selected unchanged and three omitted**. Omissions concern the 短歌 translation that repeats the syllable/mora error, the proper name クルーズ matched as a substring of ルーズ, and an お手上げ translation that fails to express being at a loss/giving up. Selected examples distinguish 給う's honorific auxiliary, 読み上げる's reading-aloud/reading-through senses, and physical/figurative 手掛かり and 打ち込む. Complete originals, translations, sentence IDs and furigana remain. No sentence or translation is generated or moved.

| Inventory measure | Before 5aa | After 5aa |
| --- | ---: | ---: |
| Vocabulary meaning strings | 17,247 | 17,256 |
| Exact eligible dictionary matches | 14,145 | 14,261 |
| Reviewed equivalents/construction renderings | 1,877 | 2,010 |
| Remaining meaning signals | 1,225 | 985 |
| Records with remaining meaning signals | 721 | 571 |
| N1 `needs-review` strings | 1,217 | 977 |
| Effective examples | 13,647 | 13,644 |
| Original-content snapshots | 927 | 981 |

N1 retains **567 records with 977 `needs-review` strings and two construction meanings**. Four separately attested N2 phrases retain six meanings. N5/N4/N3 have zero current meaning signals; N2 has zero dictionary/construction meaning flags. Cumulatively 512 examples are selected and 70 omitted; 704 records lack effective examples and 2,457 examples lack a literal target-form match. These figures do not certify unflagged senses, examples, community levels or curriculum suitability.

Only the **53 corrected records** change effective content. All prior canonical unit/member/reference mappings compare identically before digest rebinding: **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups and 408 level decisions** remain. All 19,016 default prompt projections compile and grade with zero omitted units.

After-5aa source catalog SHA-256: `b318dbe9dc9594173dc2da190dd86788acae12c4beeb6965666890e1a482eebc`.
After-5aa canonical study SHA-256: `343851a0e9acb11ca3ec71fcbcd772de3c3b4fcfc932412c8b76f1e813bfc537`.
After-5aa review-row SHA-256: `014d0d8e9670a7af0da11bc74211950dec7d91965dae5bbac88e397fe2eea9c6`.

The application retains its earlier immutable Japanese **DRAFT** snapshot. No draft refresh, publication, migration or application learner-state write occurs. English publication and the active Japanese assessment remain unchanged.

## Sixth N1 meaning cohort (5ab)

This batch adds **150 decisions: 56 corrected and 94 retained**, covering the next flagged N1 records after `91a314706a` through `aec7b25baf` (266 strings). Cumulatively the ledger has **2,657 reviews: 978 corrected and 1,679 retained**. The existing pinned loaders, correction ledger, validator, compiler, inventory and shared test assertions process every decision; production code and schemas are unchanged.

| Boundary | Selected meaning |
| --- | --- |
| 甲・きのえ | First calendar sign; rank/shell/instep/grade-A meanings belong to another reading. |
| 反・たん | Variable fabric measure; 300 tsubo/about 0.245 acres rather than 245 acres. |
| 感度・かんど | Instrument/reception/film sensitivity rather than earthquake intensity. |
| 捻じれる / 震わせる | Becoming twisted versus making an object quiver/shake. |
| 御・ご / 的・てき | Honorific/polite/humble prefix; adjective-forming suffixes. |
| 助動詞 | Japanese bound auxiliaries distinguished from auxiliary verbs in other languages. |
| 人材 / 棟 / 団扇 | Capable person without a male-only restriction; building/counter; traditional handheld fan. |
| 納まる | Eligible containment, position, delivery, payment and satisfaction; no conflict-settlement sense disallowed for this spelling. |
| 診療 / 円満 / 結核 | Diagnosis and treatment; harmonious relations; tuberculosis and separately classified geological concretion. |

No additional root dictionary/form/evidence correction is introduced: **71 root corrections and four phrase-attested records** remain. Existing independently eligible senses are retained, including 出産's goods-production sense. Primary IDs, spellings, readings and levels stay unchanged. 御・ご and 御・お remain separate canonical units; neither is merged to remove source variation.

Twenty-seven decisions account for **49 original examples: 40 selected unchanged and nine omitted**. The omitted examples are 富んだ on the unrelated とんだ modifier, a disciplinary-suspension translation on 休学, 寄る/causal によって on the result conjunction よって, a singular/plural translation mismatch on 的, an incorrect categorical English auxiliary-not-a-verb claim on 助動詞, an unrelated translation on 捻じれる and two explicitly different 収まる forms on 納まる. The first 納まる example also illustrates its disallowed conflict-resolution sense. Selected examples distinguish gunshot/departure 発, the building counter 棟, adjective formation, the honorific prefix, devoted 尽くす, active-object 震わせる and the distinct continuing/since uses of 切り. Complete originals, translations, IDs and furigana remain; no replacement sentence is authored or moved.

| Inventory measure | Before 5ab | After 5ab |
| --- | ---: | ---: |
| Vocabulary meaning strings | 17,256 | 17,237 |
| Exact eligible dictionary matches | 14,261 | 14,372 |
| Reviewed equivalents/construction renderings | 2,010 | 2,146 |
| Remaining meaning signals | 985 | 719 |
| Records with remaining meaning signals | 571 | 421 |
| N1 `needs-review` strings | 977 | 711 |
| Effective examples | 13,644 | 13,635 |
| Original-content snapshots | 981 | 1,037 |

N1 retains **417 records with 711 `needs-review` strings and two construction meanings**. Four separately attested N2 phrases retain six meanings. N5/N4/N3 have zero current meaning signals; N2 has zero dictionary/construction meaning flags. Cumulatively 552 examples are selected and 79 omitted; 708 records lack effective examples and 2,454 examples lack a literal target-form match. These figures do not certify unflagged senses, examples, community levels or curriculum suitability.

Only the **56 corrected records** change effective content. Every prior canonical unit/member/reference mapping compares identically before digest rebinding: **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups and 408 level decisions** remain. All 19,016 default prompt projections compile and grade with zero omitted units.

After-5ab source catalog SHA-256: `331e38aa33b8a16fa67a71233bcd0dde0f1f485812cff34b993a645f1f50063f`.
After-5ab canonical study SHA-256: `17eefccac346e0b5ca6da208f51acbb1b238de68b56383938c2ed5e529963e51`.
After-5ab review-row SHA-256: `1c88f899dbf2ebae1b6e0147a5d09a2834a2cb497107e8d72968016688977460`.

The application retains its earlier immutable Japanese **DRAFT** snapshot. No refresh, publication, migration or application learner-state write occurs. English publication and the active Japanese assessment remain unchanged.

## Seventh N1 meaning cohort (5ac)

This batch adds **150 decisions: 60 corrected and 90 retained**, covering the next flagged N1 records after `aec7b25baf` through `cd7c2b10e4` (264 strings). Cumulatively the ledger has **2,807 reviews: 1,038 corrected and 1,769 retained**. The existing pinned loaders, correction ledger, validator, compiler, inventory and shared test assertions process every decision; production code and schemas are unchanged.

| Boundary | Selected meaning |
| --- | --- |
| 腿・もも | Thigh, distinct from the femur bone. |
| 大事・おおごと | Serious matter/major incident, with the だいじ member preserved separately. |
| 倍率 | Magnification, scale factor and applicant-to-acceptance ratio. |
| 交わす / 閉口 | Exchanging messages/greetings/arguments; being stumped/at a loss/fed up. |
| 道場 / 保育 | Dojo and Buddhist practice place manda; childcare/rearing rather than lactation. |
| 酪農 / 塾 | Dairy farming activity; a private tutoring/cram school institution. |
| 丁目 / 尉・じょう | Numbered district/block suffix; historical inspector rank and noh old-man sense. |
| 科 / 徐々 | Department/study branch/taxonomic family; slow/gradual/steady progression. |
| 化ける / 絡む | Disguise/shape change and radical improvement; intransitive entanglement, involvement and pestering. |

The existing レバー record retains lever and liver. An evidence-only root correction adds JMdict **2855138** (mechanical lever) alongside the original **1145720** (food/liver), independently verified for レバー/レバー against the full pinned dictionary. Both original meanings, the primary ID, word, reading and level remain. Root dictionary/form/evidence corrections total **72**, plus four phrase-attested records. Full pair searches also confirm the reading/spelling boundaries for 交わす, 尉, 閉口 and 道場; unfamiliar senses are not removed without checking their eligible entries.

Forty-four decisions account for **77 original examples: 62 selected unchanged and 15 omitted**. The omitted examples concern a separate starting-over compound on 仕切る, scope/number mismatch on 絡む, two broad savage-tribe characterizations and one unspecified ethnic-group characterization, 科す on the 科 noun, the unselected gemstone sense on 玉, an unclear organ-location statement, 徐々's mistranslated predicate, deduction/exemption wording, two larger いざ constructions, a street/district substitution on 丁目 and degree/context mismatches on あくどい and 露骨. These are contextual selection decisions; they do not rewrite the upstream text or certify the selected examples' curriculum suitability. Complete originals, translations, IDs and furigana remain. No sentence is generated, translated or moved between cards.

| Inventory measure | Before 5ac | After 5ac |
| --- | ---: | ---: |
| Vocabulary meaning strings | 17,237 | 17,217 |
| Exact eligible dictionary matches | 14,372 | 14,481 |
| Reviewed equivalents/construction renderings | 2,146 | 2,281 |
| Remaining meaning signals | 719 | 455 |
| Records with remaining meaning signals | 421 | 271 |
| N1 `needs-review` strings | 711 | 447 |
| Effective examples | 13,635 | 13,620 |
| Original-content snapshots | 1,037 | 1,098 |

N1 retains **267 records with 447 `needs-review` strings and two construction meanings**. Four separately attested N2 phrases retain six meanings. N5/N4/N3 have zero current meaning signals; N2 has zero dictionary/construction meaning flags. Cumulatively 614 examples are selected and 94 omitted; 711 records lack effective examples and 2,452 examples lack a literal target-form match. These figures do not certify unflagged senses, examples, community levels or curriculum suitability.

Only the **60 corrected records** change effective content. Every prior canonical unit/member/reference mapping compares identically before digest rebinding: **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups and 408 level decisions** remain. 大事・おおごと and 大事・だいじ stay separate units. All 19,016 default prompt projections compile and grade with zero omitted units.

After-5ac source catalog SHA-256: `f3dc13cca5714ba7458342166a43433af2a0649746388e77e19aa00eba411218`.
After-5ac canonical study SHA-256: `25ffe93de5f9de8fb3655ff9ddc4f86b271dd06c4a7bdd3dfbbfea9e0341337d`.
After-5ac review-row SHA-256: `658748539cf695fd1af6d3a65dee9e457c496a5bb8f5b60c8169ca183a21eaf1`.

The application retains its earlier immutable Japanese **DRAFT** snapshot. No refresh, publication, migration or application learner-state write occurs. English publication and the active Japanese assessment remain unchanged.

## Eighth N1 meaning cohort (5ad)

This batch adds **150 decisions: 60 corrected and 90 retained**, covering the next flagged N1 records after `cd7c2b10e4` through `ea13ce8188` (241 strings). Cumulatively the ledger has **2,957 reviews: 1,098 corrected and 1,859 retained**. The existing pinned loaders, correction ledger, validator, compiler, inventory and shared test assertions process every decision; production code and schemas are unchanged.

| Boundary | Selected meaning |
| --- | --- |
| 導く | Active guiding/leading; the same verb's passive inflection remains a valid example. |
| 夜中・やちゅう / 種々・くさぐさ | During/at night; various kinds. Primary readings remain unchanged without claiming ambiguous examples attest them. |
| 例・ためし / 粋・いき | Precedent/example; chic/stylish/refined. Essence belongs to the すい entry. |
| 出来物・できもの | Skin-growth/eruption meanings, including correctly spelled abscess; the able-person entry has different readings. |
| 修士 / 所持 | Master's degree, not its programme; possession without required ownership. |
| 改定 / 改訂 | Rule/price revision; textual revision. Their source identities and units stay separate. |
| 賜る / 第 | Both receiving and bestowing; a prefix forming ordinal numbers. |
| 出直し / 異動 | A fresh start/redo or returning visit; personnel transfer/reassignment. |
| 三味線 / こたつ / 当たり | Japanese lute; the quilt/heater table; hits, rates and a fish bite, distinct from vicinity 辺り. |

The existing ランプ record retains lamp/ramp/headlight/light. An evidence-only root correction adds JMdict **2842180** (ramp) alongside the original **1140360** (lamp/light), independently verified for ランプ/ランプ against the full pinned dictionary. Its primary ID, word, reading and level stay unchanged; unrelated rump/LAMP-stack homonyms are not imported. Root dictionary/form/evidence corrections total **73**, plus four phrase-attested records. Full pair/reading searches confirm the 出来物 and 粋 boundaries and independently retain the rare treasure sense of 重宝・ちょうほう. The explicitly written したためた example remains on 認める・したためる, separately from 認める・みとめる.

Thirty-six decisions account for **59 original examples: 48 selected unchanged and 11 omitted**. Omissions concern a nursery/kindergarten substitution, two examples without attestation of 種々・くさぐさ, two without attestation of 夜中・やちゅう, an added pledge in the 賜る translation, two finite 出直す forms on the noun, and unqualified mastery-time, travel-document and health claims. No replacement factual claim is authored. Complete original text, translations, sentence IDs and furigana remain; sentences are not moved between cards. Selecting examples does not certify their politeness, curriculum level or every factual assertion.

| Inventory measure | Before 5ad | After 5ad |
| --- | ---: | ---: |
| Vocabulary meaning strings | 17,217 | 17,222 |
| Exact eligible dictionary matches | 14,481 | 14,595 |
| Reviewed equivalents/construction renderings | 2,281 | 2,413 |
| Remaining meaning signals | 455 | 214 |
| Records with remaining meaning signals | 271 | 121 |
| N1 `needs-review` strings | 447 | 206 |
| Effective examples | 13,620 | 13,609 |
| Original-content snapshots | 1,098 | 1,159 |

N1 retains **116 records with 206 `needs-review` strings plus two construction meanings on one further record**. Four separately attested N2 phrases retain six meanings. N5/N4/N3 have zero current meaning signals; N2 has zero dictionary/construction meaning flags. Cumulatively 662 examples are selected and 105 omitted; 717 records lack effective examples and 2,450 examples lack a literal target-form match. These figures do not certify unflagged senses, examples, community levels or curriculum suitability.

Only the **60 corrected records** change effective content. Every prior canonical unit/member/reference mapping compares identically before digest rebinding: **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups and 408 level decisions** remain. 改定/改訂 and the two 認める readings keep separate units. All 19,016 default prompt projections compile and grade with zero omitted units.

After-5ad source catalog SHA-256: `399b5d1454f8feeb5d2a83e8210df39b82823e9ba5be68fc1cec9ca0ca569f3c`.
After-5ad canonical study SHA-256: `22eb7b3dd534a4674b66e34356a5902095be9fc744fcdb8171fd431913613853`.
After-5ad review-row SHA-256: `a85fa11d6572127b83f4ac48c169c9098ac7f68f5b56df6f292cf1b2d83b5ca4`.

The application retains its earlier immutable Japanese **DRAFT** snapshot. No refresh, publication, migration or application learner-state write occurs. English publication and the active Japanese assessment remain unchanged.

## Final N1 meaning cohort (5ae)

This batch adds **117 decisions: 48 corrected and 69 retained**: the final 116 flagged N1 dictionary records after `ea13ce8188` through `ff9d085860` (206 strings), and the two supported construction meanings on 煌々と (`24113c7b64`). The eight preceding batches resolved 1,200 dictionary records; all **1,316 formerly flagged N1 dictionary records** and the construction now have decisions. Including eight earlier cross-level reviews, N1 has 1,325 reviews. The entire ledger has **3,074 reviews: 1,146 corrected and 1,928 retained**. Existing loaders, correction ledger, validators, compiler, inventory and shared assertions handle every decision; production logic and schemas are unchanged.

| Boundary | Selected meaning |
| --- | --- |
| 反感 / 教職 | Antipathy/animosity, rather than revolt; the teaching profession, rather than a certificate. |
| 兼ねて / 努めて | Previously/already/for some time; as much as possible/to the best of one's ability/diligently. |
| 民族 / 民主 | A people/race/nation/ethnic group; democracy/popular sovereignty. 民俗 remains a separate unit. |
| 奴・やっこ / 丈夫・じょうふ | A historical servant or chivalrous man; a hero/warrior/manly person. The latter stays separate from じょうぶ. |
| 問 / 匹 | Counters for questions and small animals; 匹 also retains a roll-of-cloth sense. |
| タイムリー / カルテ | Timely or a run-scoring/RBI hit; clinical records or a patient's chart. |
| 品種 / 年号 / 一連 | Goods types and biological varieties; era names; a series/chain or two reams (1,000 sheets). |
| 然も / 投入 / 協調 | Emphatic really/in that way; throwing in or committing resources; cooperation/conciliation/harmony. |
| 仕付ける / 出動 | Training/basting/planting senses; mobilization, going into action or being dispatched. |

Three evidence-only root corrections preserve legitimate homonyms rather than deleting existing meanings. ファン retains **fan/fun**, primary JMdict **1108540** plus **2844127**; ベース retains **base/bass**, primary **1119210** plus **2845313**; ボルト retains **volt/bolt**, primary **1124390** plus **2853387**. All additional entries independently permit the exact written/reading pair in the pinned full dictionary. Primary IDs, meaning arrays, readings and levels remain unchanged. Root dictionary/form/evidence corrections total **76**, plus four phrase-attested records.

煌々と retains **brilliantly/brightly** through its already-declared **煌々 + と** `adv-to` construction. Its equivalent relations cite base JMdict **1569020**, sense 1, exact glosses **brilliant/bright**. The inventory deliberately retains `pairAllowed: false` for a direct headword match and marks the explicitly reviewed renderings `reviewed-equivalent`. Neither a new direct dictionary identity nor a new validation exception is introduced. Both original examples (`3468683`, `408935`) remain unchanged.

Forty decisions account for **71 original examples: 69 kept unchanged and two omitted**. The sole 兼ねて example uses the distinct 兼ねる verb's te-form for combining purposes, rather than the prior-time adverb. 民族 example `234484` translates countable ethnic groups/peoples as individual people; example `210648` correctly uses several peoples and remains. Complete original text, translations, IDs and furigana survive. No new sentence or translation is authored.

| Inventory measure | Before 5ae | After 5ae |
| --- | ---: | ---: |
| Vocabulary meaning strings | 17,222 | 17,218 |
| Exact eligible dictionary matches | 14,595 | 14,694 |
| Reviewed equivalents/construction renderings | 2,413 | 2,518 |
| Remaining meaning signals | 214 | 6 |
| Records with remaining meaning signals | 121 | 4 |
| N1 `needs-review` strings | 206 | 0 |
| Unreviewed construction meanings | 2 | 0 |
| Effective examples | 13,609 | 13,607 |
| Original-content snapshots | 1,159 | 1,210 |

**All N5–N1 dictionary and construction meaning flags are resolved.** The only six remaining inventory signals belong to four N2 phrases (`321ba5716a`, `3db8531d3b`, `91b50bd069`, `feb110fb03`) with their separate, already verified source-attestation contract. They are not unresolved dictionary gaps and do not acquire direct dictionary matches. Cumulatively 731 examples are selected and 107 omitted; 718 records lack effective examples and 2,450 examples lack a literal target-form match. Completing this flagged queue does not certify every unflagged sense, example, community level or curriculum decision.

Only the **48 corrected records** change effective content; all 69 retained records keep their content unchanged. Every prior canonical unit/member/reference mapping compares identically before digest rebinding: **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups and 408 level decisions** remain. 民族/民俗 and both 丈夫 readings retain separate units. All **19,016** default prompt projections compile and grade with zero omitted units.

After-5ae source catalog SHA-256: `0fccd5db1811170df6afdfd142e6c9b035f5101f606dca456b383e1d0f4d5983`.
After-5ae canonical study SHA-256: `595a64155ead259426b1b4eac0347cc9ace32843ddc86f37857214e7fee66310`.
After-5ae review-row SHA-256: `3c61f3d698dd42964573ac1359ca803d3f33d7e65fbf0c92cabe79fd6170a3c1`.

The application retains its earlier immutable Japanese **DRAFT** snapshot. No refresh, publication, migration or application learner-state write occurs. English publication and the active Japanese assessment remain unchanged.

## N5 nonliteral example cohort (5af)

This cohort explicitly accounts for **348 examples on all 174 N5 records that had a nonliteral example match and no prior example decision**. Both examples on each record receive a contextual decision, including literal companions. **279 examples remain byte-for-byte unchanged; 69 are omitted only from effective content.** Substring absence does not authorize deletion, and substring presence does not prove sense compatibility.

The existing `meaningReviews.examples` contract is reused. **63 prior meaning decisions are extended in place**, preserving their wording, selected senses, reasons and before-hashes. **111 previously dictionary-exact records receive retain decisions** with unchanged definition arrays and exact pinned citations. No production code, schema, normalization rule or second selection engine is introduced. The ledger now has **3,185 meaning decisions: 1,146 corrected definitions and 2,039 retained**.

| Decision boundary | Examples |
| --- | --- |
| Keep productive forms | 無くした/無くして, 鳴いたら/鳴いて, irregular 来ます/来て, potential/passive/causative forms and adjective connective forms. |
| Keep equivalent written forms | 石けん, 子ども, 入り口, 花びん, メガネ, numeric dates/durations and ２０歳. |
| Respect the selected sense | Phone-call かける versus putting something on food; blowing wind versus playing an instrument; physical 円い versus peaceful settlement; giving 上げる versus raising a hand/speed. |
| Respect lexical and grammatical distinctions | Resource-cost かかる versus engine/aspectual uses; existence いる versus a completion auxiliary; なる becoming versus the classical adnominal copula; dislike versus tendency 嫌い. |
| Keep scope and spelling evidence | 伯母 and 叔母 differ by the aunt's relative age in the pinned note; selected physical length differs from duration; spatial nearness differs from temporal nearness. |
| Omit translation mismatches | Taking place versus being due; an omitted price question; a statement rendered as a toilet-location question; added rust/scraping and the incompatible lithe translation. |

Other omissions keep unselected food-serving, fire-extinguishing, ownership, acquisition, figurative, noun and auxiliary senses out of examples attached to narrower reviewed definitions. Definitions are not expanded to justify a sentence. Productive forms with the same selected sense remain, including 厚さ, 欲しがる and 楽しそう; these decisions do not create additional direct dictionary identities. A sentence may be valid independently while unsuitable for this card's current definition.

**Only the example arrays on 51 records change.** All definitions, primary IDs, spellings, readings, levels, dictionary evidence and canonical unit/member/reference mappings compare identically. Every kept sentence preserves its full Japanese/English text, sentence ID and any furigana. Every omitted sentence remains in the complete original/pre-review snapshots. There are **1,260 original-content snapshots**, 50 more than before. Eighteen records lose both examples; no replacements, new translations, furigana or factual claims are authored. Examples remain undisplayed in practice.

| Inventory measure | Before 5af | After 5af |
| --- | ---: | ---: |
| Explicit N5 example decisions | 14 | 188 |
| N5 records with unreviewed nonliteral examples | 174 | 0 |
| N5 effective examples | 1,345 | 1,276 |
| N5 nonliteral matches (includes reviewed forms) | 298 | 242 |
| All effective examples | 13,607 | 13,538 |
| All explicitly selected examples | 731 | 1,010 |
| All omitted examples | 107 | 176 |
| Records without effective examples | 718 | 736 |
| Global nonliteral matches (includes reviewed forms) | 2,450 | 2,394 |
| Original-content snapshots | 1,210 | 1,260 |

All **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups and 408 level decisions** remain. All 19,016 prompt projections compile and grade with zero omitted units. The meaning inventory remains **17,218 strings: 14,694 exact, 2,518 reviewed equivalents/construction renderings and six separately attested N2 phrase meanings**. No dictionary/construction meaning flags reopen.

After-5af source catalog SHA-256: `e9f3b3d14fd2fba7b9bcaa244808f45ae03a5242dddd7b762223663a19959cff`.
After-5af canonical study SHA-256: `301ffc78571dee56499983624f0db847070849e16d889ef2c615cd672245f5ec`.
After-5af review-row SHA-256: `76aaaadc0ce59d71b4c262b81ed5fba0e0cf57237495f0ed067a0a52db91cb41`.

This finishes the N5 nonliteral signal cohort, not all N5 examples: **489 other N5 records with 970 examples** still have no explicit example decision. The remaining nonliteral signals include reviewed valid forms, so progress is measured by explicit decisions rather than forcing those signals to zero. The application retains its earlier immutable Japanese **DRAFT** snapshot. No refresh, publication, migration or application learner-state write occurs; English publication and the active assessment remain unchanged.

## First remaining N5 example cohort (5ag)

This batch accounts for **297 sentences on the first 150 remaining N5 example-bearing records**, from `0020b9ee4e` through `5028971b39`: **264 kept unchanged and 33 omitted**. All were literal target matches. The existing contract receives **38 in-place extensions and 112 new retain decisions**; prior decision meanings, reasons and hashes stay intact. The ledger now has **3,297 decisions: 1,146 corrected definitions and 2,151 retained**.

| Boundary | Decision |
| --- | --- |
| Negation and conditions | Not both parents being alive does not mean neither is alive. If possible is different from asserting possibility. |
| Counters and particles | The bottle counter 本 is separate from book; no-matter でも is separate from but; being alone differs from counting one person. |
| Selected meanings | Welcoming/reproachful よく differs from often/well, and 先's continuation/direction differs from future/previous. Job-position ポスト and device 電話 retain their selected definitions without importing mailbox/call examples. |
| Explicit clothing evidence | ボタン keeps the unchanged button wording with eligible JMdict 1123880 sense 1, exact gloss button (clothing), as an authored equivalent. Both clothing examples stay. |
| Preserve rare valid forms | Full pinned JMdict 1144700 lists レーンコート as a search-only raincoat spelling; unfamiliarity does not justify deleting the example. |
| Measurements, readings and dictionary context | キロ separately cites kilogram and kilometre. Both 昨夜 examples explicitly annotate ゆうべ. 交番's selected sense includes a small neighborhood police station, supporting the existing translation. |
| Translation and context | Omissions also cover the lost daily frequency, added full-report requirement, a malformed trouser-alteration request, a permission/request mismatch, and unqualified factual claims or broad characterizations. |

The four-ocean sentence is omitted because its unqualified classification needs context; [NOAA describes the historical four-name scheme and widespread five-name recognition](https://oceanservice.noaa.gov/facts/howmanyoceans.html). No replacement count or history is authored. Other omitted contextual claims concern complete media replacement, the origin of zero, gender generalizations and a blanket marriage judgment. These selections do not certify every factual claim, politeness choice or sentence-level JLPT classification in retained examples.

The corpus regression exposed an **offline inventory bug**: an automatic exact gloss could override the entry/sense explicitly selected by a verified decision. The existing `reviewMeanings` function now reports that selected entry/sense/gloss after the shared validator checks it. Exact status requires the **cited** gloss itself to be an exact eligible primary-pair match; another sense's exact wording cannot override it. An equivalent-labelled decision with an exact cited gloss still reports exact, preserving the independently evidenced homonyms. Full eligible dictionary context remains available. 問題 explicitly selects its already existing exact problem/trouble evidence in sense 5. The button wording now reports its authored clothing equivalent. No second validator, matcher or import path is introduced.

**Only the example arrays on 27 records change.** All definitions, primary IDs, readings, spellings, levels, dictionary evidence and canonical unit/member/reference mappings compare identically. Six records lose both examples; the complete text, translation, IDs and any furigana remain in **1,287 original-content snapshots**, 27 more than before. The N5 一人・ひとり record and N1 一人・いちにん reference supplement retain separate identities/units. No sentence, translation or furigana is generated or moved between cards. Examples remain undisplayed in practice.

| Inventory measure | Before 5ag | After 5ag |
| --- | ---: | ---: |
| Explicit N5 example decisions | 188 | 338 |
| Pending N5 example-bearing records | 489 | 339 |
| Pending N5 sentences | 970 | 673 |
| N5 effective examples | 1,276 | 1,243 |
| All effective examples | 13,538 | 13,505 |
| All explicitly selected examples | 1,010 | 1,274 |
| All omitted examples | 176 | 209 |
| Records without effective examples | 736 | 742 |
| Exact meaning strings | 14,694 | 14,693 |
| Reviewed equivalent/construction strings | 2,518 | 2,519 |
| Original-content snapshots | 1,260 | 1,287 |

All **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups and 408 level decisions** remain. All **19,016** prompt projections compile and grade with zero omitted units. The 17,218 meaning strings retain zero dictionary/construction flags; six separately attested N2 phrase meanings remain under their distinct contract. Global nonliteral signals remain **2,394**, including reviewed valid forms. This cohort does not complete all N5 example or curriculum review.

After-5ag source catalog SHA-256: `6f124daac60ce3c2f80a89ed8ce0ba09fd86ce2f8caae95e3ed4e2a55d6c7497`.
After-5ag canonical study SHA-256: `54e061edb7826c138ce2962cbc20d00e31540f126447acfc09a57ba911f0a2c4`.
After-5ag review-row SHA-256: `adf9e39bef0ff8208b14cd98f5dbef372d4e02171136a872f05d76097b66ee85`.

The application retains its earlier immutable Japanese **DRAFT** snapshot. No refresh, publication, migration or application learner-state write occurs; English publication and the active assessment remain unchanged.

## Second remaining N5 example cohort (5ah)

This batch accounts for **298 sentences on the next 150 N5 example-bearing records**, after `5028971b39` through `98eace7008`: **254 kept unchanged and 44 omitted**. The existing contract receives **28 in-place extensions and 122 new retain decisions**, preserving prior meanings, reasons and before-hashes. There are now **3,419 decisions: 1,146 corrected definitions and 2,273 retained**. Existing validators, compilers, inventory and shared test assertions handle the batch; production logic and schemas are unchanged.

| Boundary | Decision |
| --- | --- |
| Substring matches | プログラム and インスタグラム do not illustrate the weight unit グラム. |
| Selected senses and compounds | Hand differs from a handle/strategy, height from a chair's back, and the dictionary noun from the separately attested 生き字引 person compound. |
| Changed propositions | Famous differs from able, being struck by a car does not assert death, and whether someone is present differs from asking who is present. |
| Grammar and frequency | A course differs from a classroom, regards from a first-meeting greeting, and a single unspecified sometime from recurring 時々. Two honorific misspellings and unsuitable sentence constructions are omitted without repairs. |
| Negative-answer convention | はい agrees with a negative statement even where English responds No; the example remains without adding a no definition. |
| Dictionary context and readings | お菓子's eligible sense explicitly includes cake. 九 retains accepted く alongside きゅう; 毎月/毎年 keep their alternative readings. |
| Explicit location evidence | あっち's unchanged over-there wording selects its already eligible exact location sense 4 for the elevator sentence. |

Other omissions distinguish ordinary water from tissue fluid, blue from inexperience, a general thing from the possessions use, and green colour from greenery. Full pinned JMdict **1587110** independently identifies 生き字引 as a walking dictionary/encyclopedia; **1000940** confirms standard いらっしゃる. The unrestricted any-colour chameleon sentence is omitted following [San Diego Zoo's guide](https://animals.sandiegozoo.org/animals/chameleon), without importing its prose or authoring a replacement biology claim. Unqualified characterizations and an unnecessary personal insult are also omitted. Retained examples are not a certification of every factual, politeness or curriculum choice.

**Only the example arrays on 38 records change.** Six lose both examples; every omitted sentence remains in complete original/pre-review snapshots with its full text, translation, ID and any furigana. There are **1,323 original-content snapshots**, 36 more than before. All definitions, IDs, primary readings, spellings, levels and dictionary evidence compare identically. 丈夫・じょうぶ and 丈夫・じょうふ remain separate canonical units. No new sentence, translation, furigana or factual claim is authored or moved between cards. Examples remain undisplayed in practice.

| Inventory measure | Before 5ah | After 5ah |
| --- | ---: | ---: |
| Explicit N5 example decisions | 338 | 488 |
| Pending N5 example-bearing records | 339 | 189 |
| Pending N5 sentences | 673 | 375 |
| N5 effective examples | 1,243 | 1,199 |
| All effective examples | 13,505 | 13,461 |
| All explicitly selected examples | 1,274 | 1,528 |
| All omitted examples | 209 | 253 |
| Records without effective examples | 742 | 748 |
| Original-content snapshots | 1,287 | 1,323 |

All **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups and 408 level decisions** remain. All **19,016** prompt projections compile and grade with zero omitted units. The meaning inventory stays at **17,218 strings: 14,693 exact, 2,519 reviewed equivalent/construction renderings and six separately attested N2 phrase meanings**. No dictionary/construction meaning flags reopen. Global nonliteral signals remain **2,394**, including reviewed valid forms. The final 189 N5 records still need example decisions; this batch does not complete curriculum review.

After-5ah source catalog SHA-256: `e787afc470a891e67b04d7adc6e6c020f888e8775b4407fe9880578c1288013a`.
After-5ah canonical study SHA-256: `4f0a2f2592b8a343d89f47fff9f2a3b250063782c9889dda3590e99b355c43a8`.
After-5ah review-row SHA-256: `5a23dbe2c0d24df76b7bc1ba5d6420af997046559a1db2def30e03a78eabeebd`.

The application retains its earlier immutable Japanese **DRAFT** snapshot. No refresh, publication, migration or application learner-state write occurs; English publication and the active assessment remain unchanged.

## Final N5 vocabulary example cohort (5ai)

The final **189 N5 example-bearing records**, from `992fc07339` through `ffa3dda331`, account for **375 sentences: 330 retained unchanged and 45 omitted**. There are **37 extensions and 152 new retain decisions**, preserving every prior meaning, rationale and before-hash. The ledger now has **3,571 decisions: 1,146 corrected definitions and 2,425 retained**. Existing validators, compilers, inventory and shared assertions are reused; production logic and schemas are unchanged.

| Boundary | Decision |
| --- | --- |
| Names and grammatical roles | 五つ inside a street name is not object counting; ordinal 目 is not eye; comparative 方・ほう differs from direction. |
| Homophones | Economy/thrift せっけん (JMdict 1386220) cannot use soap examples. The separate 石鹸 soap card (1382590) keeps its examples. Their identities and community/introduction levels remain unchanged. |
| Explicit readings | The retained 私 sentence annotates わたくし; an unannotated sentence does not establish that reading. The separate わたし reference supplement remains without examples. 何 explicitly annotated なに stays. |
| Grammar and lexical identity | Combined で + は differs from the では conjunction. Verb-form そうして differs from the dictionary conjunction. Humble receiving/drinking differs from meal-formula いただきます. |
| Selected senses | Career 道 differs from street; the money-throughflow idiom differs from literal 左/右. 青's traffic-signal green is a valid separate dictionary sense, but not the selected blue sense. |
| Valid context preserved | たくさん includes many/much; 料理 includes cooking/food/dish; ちょうど's exact/right sense and natural すみません politeness remain. These choices do not require invented definitions. |
| Translation propositions | Not understanding does not assert nonsensical content; a generic school reference does not assert high school; morning does not itself assert breakfast. |

Other omissions address unselected intensifier/interjection senses, sufficiency/permission, broad diet/body/fashion claims and specific semantic or grammar mismatches. The [Florida Aquarium mudskipper guide](https://www.flaquarium.org/explore/habitats/morphd/mudskipper/) informs omission of an unrestricted fish/out-of-water assertion. NHS pages on [chilblains](https://www.nhs.uk/conditions/chilblains/) and [frostbite](https://www.nhs.uk/conditions/frostbite/) support conservative treatment of an ambiguous injury translation. Pinned JMdict **1446365** includes both English glosses; the omission does not claim either is absent from the dictionary. No replacement factual claim, diagnosis, sentence, translation or furigana is authored or imported. These contextual citations leave the three pinned phrase-evidence sources unchanged.

**Only example arrays on 38 records change.** Seven lose both examples and バス loses its sole example. The complete originals retain text, translations, sentence IDs and any source furigana. There are **1,357 original-content snapshots**, 34 more than before; every existing original and pre-review meaning remains intact. Definitions, IDs, primary readings, spellings, levels, dictionary evidence and all canonical unit/member/reference/level mappings compare identically. Soap/economy and the two 私 readings remain separate units. Examples remain undisplayed in practice.

| Inventory measure | Before 5ai | After 5ai |
| --- | ---: | ---: |
| Explicit N5 example decisions | 488 | 677 |
| Pending N5 example-bearing records | 189 | 0 |
| Pending N5 sentences | 375 | 0 |
| N5 effective examples | 1,199 | 1,154 |
| All effective examples | 13,461 | 13,416 |
| All explicitly selected examples | 1,528 | 1,858 |
| All omitted examples | 253 | 298 |
| Records without effective examples | 748 | 756 |
| Original-content snapshots | 1,323 | 1,357 |

**The N5 vocabulary example queue is complete.** All 677 records that originally had examples have decisions. The other **13 N5 records had no examples before this work**: ここ, パン, コップ, いいえ, フォーク, 零・れい, どれ, その, どう, あれ, 行く・ゆく, 一日・ついたち and 私・わたし. Ten are original corpus records and three are reference supplements. Their IDs and empty arrays are asserted directly; no missing sentence is fabricated. Completion of this queue is not approval of curriculum placement, every factual proposition, sentence difficulty or learner display.

All **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups and 408 level decisions** remain. All **19,016** prompt projections compile and grade with zero omitted units. Meaning counts remain **17,218 strings: 14,693 exact, 2,519 reviewed equivalent/construction renderings and six separately attested N2 phrase meanings**. No dictionary/construction flag reopens. Global nonliteral signals remain **2,394**, including reviewed valid forms. N4 next has **615 pending records with 1,220 sentences**.

After-5ai source catalog SHA-256: `7fc2b54df8a8c80ceabf0d11da5750c72ed5f3c98d46a91aa05d502b95a31368`.
After-5ai canonical study SHA-256: `3ba0001a3c57990488afb7a52fc8f610422e36d450b5da7ee259f1465ec1cf16`.
After-5ai review-row SHA-256: `b4b608ed7a096819b0a1c1cd80a654f7c7e79f23e92b75ea914f3377ab749c4d`.

The application retains its earlier immutable Japanese **DRAFT** snapshot. No refresh, publication, migration or application learner-state write occurs; English publication and the active assessment remain unchanged.

## N4 nonliteral vocabulary example cohort (5aj)

This cohort accounts for **352 sentences on all 177 pending N4 records with a nonliteral example match**, including each record's literal companion sentences. **255 remain byte-for-byte unchanged and 97 are omitted**. The contract receives **59 extensions and 118 new retain decisions**, preserving every prior meaning, rationale and before-hash. There are now **3,689 decisions: 1,146 corrected definitions and 2,543 retained**. Existing validators, compiler, inventory and shared assertions handle the cohort; production logic and schemas are unchanged.

| Boundary | Decision |
| --- | --- |
| Productive conjugations | Train transfers, past actions, negatives, potentials, passives and result states remain where they preserve the selected sense. Absence of a literal dictionary form is not grounds for deletion. |
| Eligible spellings and numeric forms | Pinned JMdict verifies 船 on 舟, ご存知 on ご存じ and ＦＡＸ on ファックス. Explicit すいて on 空いて and the ２/二 quantity spelling remain, as do kana/katakana grapes. |
| Selected senses | Appearance differs from visibility, progress from transport, eliciting qualities from withdrawing money, exam failure/server downtime from physical falling, and clock/gambling uses from physical hitting. |
| Auxiliary and suffix boundaries | Beneficiary uses of いただく/もらう/くださる, continuative 続ける and excessive-degree 過ぎる do not illustrate their cards' selected standalone senses. |
| Reading and translation | 行う's annotated おこなった does not support went. 明日・あす does not acquire undeclared あした; an unannotated companion also fails to establish あす. Unknown quantities, agents and objects are not silently supplied. |
| Productive forms and names | 深さ preserves physical depth; 四つ折り preserves folding; the schedule-delay result noun 遅れ preserves delay. Cookie is a proper name in a raised-by construction. |

Three new retain decisions explicitly select eligible sense context without changing the English definitions. **深い** cites JMdict **1362640 sense 1**, `deep (hole, forest, snow, etc.)`, for ordinary physical depth rather than automatic exact sense 9's baseball context. **通る** cites **1433030 sense 1**, `to pass through`, for route passage rather than automatic exact sense 4's penetration context. Both are authored **reviewed equivalents**, not invented exact matches or a general synonym rule. **捕まえる** retains `to seize` with independently eligible exact grasping sense **1597780/2**; the hand example stays and taxi hailing is omitted as separate sense 3. Full dictionary context remains available. The existing selected-sense report and strict evidence validator are reused.

Other omissions distinguish separate senses, a nominal apology formula, home versus within, tight/formal versus the selected firm/stubborn meanings, and specific translation proposition changes. Unqualified cross-species/material claims and unidentified fixed-recovery assertions are omitted without replacement claims, medical guidance or new factual text. Retained source examples are not factual, politeness or curriculum certification. No new sentence, translation, furigana or dictionary/phrase source is imported or generated.

**Only example arrays on 72 records change; 25 lose both sentences.** Full original text, translation, sentence IDs and any furigana survive in snapshots. There are **1,425 original-content snapshots**, 68 more than before. Every previous snapshot, definition, identity, primary reading, spelling, level, dictionary link and canonical mapping compares identically. All 59 extended decisions retain their prior meanings/reasons/hashes; the 118 additions retain current wording. Examples remain undisplayed in practice.

| Inventory measure | Before 5aj | After 5aj |
| --- | ---: | ---: |
| Explicit N4 example decisions | 19 | 196 |
| N4 records with unreviewed nonliteral examples | 177 | 0 |
| Pending N4 example-bearing records | 615 | 438 |
| Pending N4 sentences | 1,220 | 868 |
| N4 effective examples | 1,252 | 1,155 |
| N4 nonliteral matches, including reviewed forms | 299 | 214 |
| All effective examples | 13,416 | 13,319 |
| All explicitly selected examples | 1,858 | 2,113 |
| All omitted examples | 298 | 395 |
| Records without effective examples | 756 | 781 |
| Original-content snapshots | 1,357 | 1,425 |
| Global nonliteral matches | 2,394 | 2,309 |

All **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups and 408 level decisions** remain, along with **76 root corrections, four phrase attestations and three pinned phrase-evidence sources**. All **19,016** prompt projections compile and grade with zero omitted units. Meaning counts are **17,218 strings: 14,691 exact, 2,521 reviewed equivalent/construction renderings and six separately attested N2 phrase meanings**. The two classification changes reflect the explicit physical-depth/passage citations; no dictionary/construction flag reopens. N5 remains complete at 677 example decisions, 13 accounted-for pre-existing empty records and 1,154 effective examples.

This completes the N4 nonliteral signal cohort. The remaining **438 N4 example-bearing records with 868 sentences** still need contextual decisions even though they contain literal target text. The 214 retained N4 nonliteral matches are reviewed forms, not errors to force to zero. Curriculum placement and learner display remain separate.

After-5aj source catalog SHA-256: `18498d91b27bdb6b3bfe5aa25e1e4891aa532cfd228cf0a533703b87acb34905`.
After-5aj canonical study SHA-256: `50c6814369f63fd82748a3a5355b174d9b18122f11f290aff9d64c9f771f36c5`.
After-5aj review-row SHA-256: `2aeeb52f5f5344dab8fb2bcebf32d9bcabf1a79256ce9e4d03c48ca1fcd15d01`.

The application retains its earlier immutable Japanese **DRAFT** snapshot. No refresh, publication, application migration or application learner-state write occurs; English publication and the active assessment remain unchanged.

## First remaining N4 vocabulary example cohort (5ak)

This batch accounts for **296 sentences on the first 150 remaining N4 example-bearing records**, from `0039e17a55` through `5f81e206e3`: **244 retained unchanged and 52 omitted**. The contract receives **40 extensions and 110 new retain decisions**, preserving every previous meaning, reason and before-hash. There are now **3,799 decisions: 1,146 corrected definitions and 2,653 retained**. Existing validators, compiler, inventory and shared assertions handle the batch; production logic and schemas are unchanged.

| Boundary | Decision |
| --- | --- |
| Grammatical roles | Exhortative about-time differs from soon/gradually; nominalizing こと differs from thing/matter; beneficiary 為 differs from in-order-to purpose; それ + に differs from moreover. |
| Selected senses | Amusement rides differ from transport; daughter differs from young lady; receipt differs from reception desk; refill differs from substitution; worms differ from insects; ancestry differs from bodily blood. |
| Activity versus food object | The retained 食事 wording describes having a meal. Sentences about preparing food objects or their deliciousness do not demonstrate that selected activity; the definition is not broadened to justify them. |
| Changed propositions | The English adds reciprocal companionship or male gender, substitutes smirking for an awkward smile, changes please-remember to I-must-remind, renders a directive as a descriptive rule, and replaces metropolitan government office with courthouse. |
| Units and grammar | A Fahrenheit scale disappears from the English temperature example. Principle/principal and appointment-construction issues are retained only in originals, without generated repairs. |
| Valid breadth preserved | Separate he/boyfriend citations remain on 彼. The selected ガラス sense includes material glass and pane; 気分 covers feeling, たいてい includes mostly, ごちそう includes delicacy, and よろしい includes permission. |

Other omissions concern separate senses, undated demographic/economic or national-habit claims and broad cultural comparisons. Both 億 examples retain the correct Japanese/English numeric scales: １０億 is one billion and ５０億 is five thousand million. The omissions concern their factual context, not arithmetic. [NASA’s Earth formation account](https://science.nasa.gov/earth/facts/) informs conservative handling of the coarse age assertion; no replacement science sentence, statistic, source prose or image is imported. The three pinned phrase-evidence sources remain unchanged. No new sentence, translation, reading or furigana is authored or moved between cards.

**Only example arrays on 42 records change; ten lose both sentences.** Full originals preserve text, translations, sentence IDs and any furigana. There are **1,465 original-content snapshots**, 40 more than before. All prior originals and decisions, definitions, identities, primary readings, spellings, levels, dictionary evidence and canonical mappings compare identically. Examples remain undisplayed in practice.

| Inventory measure | Before 5ak | After 5ak |
| --- | ---: | ---: |
| Explicit N4 example decisions | 196 | 346 |
| Pending N4 example-bearing records | 438 | 288 |
| Pending N4 sentences | 868 | 572 |
| N4 effective examples | 1,155 | 1,103 |
| All effective examples | 13,319 | 13,267 |
| All explicitly selected examples | 2,113 | 2,357 |
| All omitted examples | 395 | 447 |
| Records without effective examples | 781 | 791 |
| Original-content snapshots | 1,425 | 1,465 |

All **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups and 408 level decisions** remain, along with **76 root corrections and four phrase attestations**. All **19,016** prompt projections compile and grade with zero omitted units. Meaning counts stay at **17,218: 14,691 exact, 2,521 reviewed equivalent/construction strings and six separately attested N2 phrase meanings**. No dictionary/construction flag reopens. Global nonliteral signals stay at **2,309**, including 214 reviewed N4 forms. N5 remains complete at 677 example decisions, 13 accounted-for pre-existing empty records and 1,154 effective examples.

The remaining **288 N4 records with 572 sentences** still need contextual decisions. Literal target text does not prove the intended sense or translation. Completing this batch does not certify curriculum placement, every factual proposition or learner display.

After-5ak source catalog SHA-256: `c2598824fe28208aea1fe64f93878faacd5afa6e796504bbd688341315ea0e04`.
After-5ak canonical study SHA-256: `90ebf6cedcf9cd0f8f174c944fa8292fa91497f9f73c0ff62c200e08dca46b53`.
After-5ak review-row SHA-256: `ef2b827cff950043429d925f0578da688de67f263f5f8d071ebeb5e440e12ece`.

The application retains its earlier immutable Japanese **DRAFT** snapshot. No refresh, publication, application migration or application learner-state write occurs; English publication and the active assessment remain unchanged.

## Second remaining N4 vocabulary example cohort (5al)

This batch accounts for **297 sentences on the next 150 N4 records**, after `5f81e206e3` through `b377c7b2ea`: **232 retained unchanged and 65 omitted**. The strict contract receives **46 extensions and 104 new retain decisions**, preserving every previous meaning, reason and before-hash. There are now **3,903 decisions: 1,146 corrected definitions and 2,757 retained**. Existing validators, compiler, inventory and shared assertions handle the batch; production logic and schemas are unchanged.

| Boundary | Decision |
| --- | --- |
| Numerical and calendar anchors | Numerical 以下 includes the boundary whereas English under excludes it. Week-after-next Thursday and two-weeks-from-Thursday need different anchors. Neither sentence is repaired by inventing a reference date. |
| Changed propositions | At least does not mean day after day; Japanese people and Japan's residents define different populations; a simple soon becomes soonest; law-related work becomes obeying a law; excessive cooling becomes a repair question. |
| Selected senses | Employment differs from anatomical neck; paper face/outside from building front; glyph stars from celestial bodies; knowledge from consent; meticulousness from courtesy; midway from en route. |
| Word identity and grammar | 急がなく is a form of 急ぐ, not the adjectival 急, and its きゅう annotation is unsuitable. The convenience sentence lacks an action construction, the office connection sentence has malformed English, and 近づきにやすい adds an unsuitable に. |
| Quantities and noun/verb scope | A sip/mouthful does not establish a prescribed dose. Amount or whole-day いっぱい differs from the selected full-state adjective; the adverbial 十分 use differs from the selected adjective. |
| Valid context preserved | The second ああ in ああ、ああいう is the like-that target, distinct from the leading interjection. Bite/chew and laboratory senses remain separately cited. Few and a few preserve the contrasting Japanese attendance quantities. |

Two new retain decisions select eligible sense context without changing definitions. **夢** cites exact aspiration sense **1529410/2**, rather than the automatic sleep-dream match; the wishes-coming-true example stays while the fleeting-life/illusion use is omitted. **ステレオ** cites noun/player-set sense **1070650/2**, `stereo (player, set)`, as a reviewed equivalent of existing `stereo`. Its automatic exact match was attributive adjective sense 3, which does not describe the purchased device or record player. This changes one inventory classification, not the source definition or dictionary identity. Full eligible context remains available, and the existing report/validator handles both decisions.

The declared コンピューター variant remains on コンピュータ with both examples. Accepted やっぱり remains on やはり; its examples are omitted for selected-sense/translation issues, not spelling. Full pinned JMdict **1455140** independently identifies 特待生 as scholarship student, distinct from the source honor-student rendering. Entry **2079010** independently identifies 気が多い as a fickleness/romantic-interests idiom rather than general interests or the selected spirit/mood senses. These contextual lookups do not add new card identities or dictionary links.

The [U.S. Fish & Wildlife Service condor recovery program](https://www.fws.gov/program/california-condor-recovery/what-we-do) provides contextual evidence for omitting the unrestricted no-zoo-breeding assertion; the Japanese 育つ also does not itself mean breed. Other omissions concern unqualified claims, separate senses and specific translation changes. No replacement biology, demographic, clinical or economic claim is authored. No sentence, translation, reading, furigana, agency prose or image is imported or moved between cards. The three pinned phrase-evidence sources remain unchanged.

**Only example arrays on 56 records change.** Nine lose both sentences; 再来週 loses its sole sentence. Complete original text, translation, sentence IDs and any furigana survive in **1,518 original-content snapshots**, 53 more than before. All prior originals, meanings, decisions, identities, primary readings, spellings, levels, dictionary links and canonical mappings compare identically. Examples remain undisplayed in practice.

| Inventory measure | Before 5al | After 5al |
| --- | ---: | ---: |
| Explicit N4 example decisions | 346 | 496 |
| Pending N4 example-bearing records | 288 | 138 |
| Pending N4 sentences | 572 | 275 |
| N4 effective examples | 1,103 | 1,038 |
| All effective examples | 13,267 | 13,202 |
| All explicitly selected examples | 2,357 | 2,589 |
| All omitted examples | 447 | 512 |
| Records without effective examples | 791 | 801 |
| Original-content snapshots | 1,465 | 1,518 |

All **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups and 408 level decisions** remain, along with **76 root corrections and four phrase attestations**. All **19,016** prompt projections compile and grade with zero omitted units. Meaning counts are **17,218: 14,690 exact, 2,522 reviewed equivalent/construction strings and six separately attested N2 phrase meanings**. Only stereo changes classification; no dictionary/construction flag reopens. Global nonliteral signals remain **2,309**, including 214 reviewed N4 forms. N5 remains complete at 677 example decisions, 13 accounted-for pre-existing empty records and 1,154 effective examples.

The final **138 N4 records with 275 sentences** still need contextual decisions. This batch does not certify curriculum placement, every factual proposition or learner display.

After-5al source catalog SHA-256: `1a55c1c0d17c68810e53e8ec278cd083b47da9c7ddef4924bb7bde0860e3cc95`.
After-5al canonical study SHA-256: `eb7cfb81158a5d9c920914a9f0a90fc0e93b8ed7e49a95c7f8f42a07854f061d`.
After-5al review-row SHA-256: `4664625c0acedb4b6b17df3dfcd9705131c5ec972c26b34a22d4e7adea25f8e3`.

The application retains its earlier immutable Japanese **DRAFT** snapshot. No refresh, publication, application migration or application learner-state write occurs; English publication and the active assessment remain unchanged.

## Final N4 vocabulary example cohort (5am)

The final **138 N4 records**, from `b3c360789e` through `ff9e385277`, account for **275 sentences: 215 retained unchanged and 60 omitted**. The strict contract receives **39 extensions and 99 new retain decisions**, preserving every previous meaning, reason and before-hash. There are now **4,002 decisions: 1,146 corrected definitions and 2,856 retained**. Existing validators, compiler, inventory and shared assertions handle the batch; production logic and schemas are unchanged.

| Boundary | Decision |
| --- | --- |
| Grammatical roles and numeric scale | Comparison/approximation ほど particles differ from the selected extent noun. Fivefold and tenfold 倍 are not double; the dollar arithmetic itself is correct. |
| Selected senses | Checkout/cashier differs from a register device; month from Moon; components from part-time work; interpersonal relations/among from physical space; anticipation from enjoyment; circumference from surroundings. |
| Names, contractions and idioms | Bell the surname does not demonstrate a bell. やっとる is a verb contraction rather than at last. 味噌's selling-point idiom does not demonstrate fermented condiment. |
| Quantities and propositions | English over 200 adds a bound absent from Japanese 200. Long enough adds sufficiency to considerable duration; any job adds unrestricted scope. Other omissions concern added recipients/identity details, unsuitable constructions or unqualified claims. |
| Explicit reading | Pinned JMdict permits both みな and みんな for 皆, but this card declares only みな. Unannotated sentences cannot establish that primary reading; no alternate reading is added. |
| Valid context retained | Sound/note, guest/customer, valuable/important and usually/ordinary retain separate citations. Negative exclusions, clothing at the wearer's back and contextual inn/museum references remain. |

Two new retain decisions select eligible context without changing definitions. **苦い** cites **1244310 sense 1**, `bitter (taste)`, as an explicit equivalent of existing `bitter`, retaining coffee and beer examples. Its automatic exact match was the displeased-expression sense. **スーツ** cites **1066680 sense 1**, `suit (clothing)`, as an explicit equivalent of existing `suit`, retaining wearing and tailoring examples. Its automatic exact match was the playing-card sense. These are authored contextual decisions, not a general synonym rule; full eligible dictionary context remains available.

[Tokyo Gas Network](https://www.tokyo-gas.co.jp/network/en/earthquake.html) supplies timing context missing from the unqualified earthquake instruction. [Cornell's Northern Hawk Owl account](https://www.allaboutbirds.org/guide/Northern_Hawk_Owl/overview) informs omission of the blanket daytime-blindness assertion, and [the National Park Service Edison FAQ](https://www.nps.gov/edis/faqs.htm) informs omission of the insufficiently qualified electric-light invention attribution. Other unqualified craft, demographic and physiological claims are omitted without replacement assertions. No source prose, image, new emergency instruction, science/history sentence, translation, reading or furigana is imported or authored. The three pinned phrase-evidence sources remain unchanged.

**Only example arrays on 48 records change.** Twelve lose both sentences; 味噌 loses its sole sentence. Complete original text, translations, sentence IDs and any furigana survive in **1,562 original-content snapshots**, 44 more than before. All prior snapshots, meanings, decisions, identities, primary readings, spellings, levels, dictionary evidence and canonical mappings compare identically. Examples remain undisplayed in practice.

| Inventory measure | Before 5am | After 5am |
| --- | ---: | ---: |
| Explicit N4 example decisions | 496 | 634 |
| Pending N4 example-bearing records | 138 | 0 |
| Pending N4 sentences | 275 | 0 |
| N4 effective examples | 1,038 | 978 |
| All effective examples | 13,202 | 13,142 |
| All explicitly selected examples | 2,589 | 2,804 |
| All omitted examples | 512 | 572 |
| Records without effective examples | 801 | 814 |
| Original-content snapshots | 1,518 | 1,562 |

**The N4 vocabulary example queue is complete.** All **634 records that originally had examples** have explicit decisions. The other **nine N4 members already lacked examples**: ビル, ガス, こう, 妻, アルバイト, いらっしゃる, 君・くん, チェック and 止める・やめる. Six are original corpus records and three are reference supplements. Their IDs, current arrays and complete original/pre-review snapshots are checked directly; no missing example is fabricated. Completion is not curriculum approval, factual certification or authorization for learner display.

All **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections and four phrase attestations** remain. All **19,016** prompt projections compile and grade with zero omitted units. Meaning counts are **17,218: 14,688 exact, 2,524 reviewed equivalent/construction strings and six separately attested N2 phrase meanings**. Bitter/suit alone change classification; no dictionary/construction flag reopens. Global nonliteral signals stay at **2,309**, including 214 reviewed N4 forms. N5 remains complete at 677 example decisions, 13 accounted-for pre-existing empty records and 1,154 effective examples.

N3 next has **1,569 pending records with 3,110 sentences**, including **226 records with nonliteral matches and 449 companion sentences**. Remaining levels, deliberate draft refresh and section 6 verification follow.

After-5am source catalog SHA-256: `b2de3e2eba255fbca9aedf3b3e4ef6a0a62e76d596d364e5ea9f58a36c8786e5`.
After-5am canonical study SHA-256: `cef54b7b7b4a2b815c4de63e6af8f717c229ce17fd37d00a041d813876d6d4cc`.
After-5am review-row SHA-256: `631aec06869921040d27813ed912b1f6b0206a11989a2398170bd9d33f82aaad`.

The application retains its earlier immutable Japanese **DRAFT** snapshot. No refresh, publication, application migration or application learner-state write occurs; English publication and the active assessment remain unchanged.

## First N3 nonliteral example cohort (5an)

The first **150 pending N3 records with nonliteral matches**, from `0024055e8e` through `ae7bf4b275`, account for **297 sentences: 198 retained unchanged and 99 omitted**. Literal companion sentences receive the same contextual review. The strict existing contract receives **64 in-place extensions and 86 new retain decisions**, preserving every previous meaning, reason and before-hash. There are now **4,088 meaning decisions: 1,146 corrected definitions and 2,942 retained**. Existing validators, compiler, inventory and shared assertions handle the batch; production logic and schemas are unchanged.

| Boundary | Decision |
| --- | --- |
| Selected senses | Crossing arms/legs differs from assembly; winning a lottery from a successful undertaking; setting sun from sinking; passenger drop-off from lowering objects. Forgiving differs from permitting; inclusion differs from mouth/mental holding; startup differs from standing up. |
| Dictionary identities | Full pinned JMdict distinguishes former-state 元 **2219590/2** from origin/basis 元 **1260670**. Both original card identities and evidence remain intact; examples do not authorize remapping them. 予想 is a different word from 予測. |
| Other sense boundaries | Mail arrival differs from sound carrying; exclusion from physical detachment; washing away from floating logs; guiding a visitor from letting through; being pressed for time from chasing. Potential problem-solving does not establish coming-untied 解ける. |
| Primary readings | Explicit ぶたれて establishes ぶつ; unannotated 打った does not. Shared unannotated spellings do not establish primary ゆう or みょうごにち. Annotated えがく remains. No reading is added or changed. |
| Propositions and text quality | Omit attachment without the inability to leave, changed past/present preference, added gender or scope, malformed source/translation, unqualified rankings and standalone personal diet directives. No replacement claim or health advice is authored. |
| Valid context | Passive, potential and adverbial forms remain when their selected senses fit. Partial-kana 金ぞく/ばく大, katakana ナベ, selected sleep induction/date invitation, gift/award, grounding/origin and omission/economizing contexts retain explicit eligible citations. |
| Different reviewed associations | Representation is unselected on the current 表す card but selected on the current 現す association; its declared 表す form and representation examples stay. Shared dictionary evidence does not override each card's reviewed sense selection. |

**Only example arrays on 72 records change.** Thirty records lose all examples, including three one-example records. Complete original text, translations, sentence IDs and any furigana survive in **1,627 original-content snapshots**, 65 more than before. Every prior snapshot and meaning-review field remains intact; selected examples remain full original objects in their original order. All definitions, primary IDs, readings, spellings, levels, parts of speech, dictionary evidence, source membership, canonical mappings and level decisions compare identically. No source sentence is edited, invented or reassigned. Examples remain undisplayed in practice.

| Inventory measure | Before 5an | After 5an |
| --- | ---: | ---: |
| Explicit N3 example decisions | 41 | 191 |
| Pending N3 example-bearing records | 1,569 | 1,419 |
| Pending N3 sentences | 3,110 | 2,813 |
| Pending N3 nonliteral-match records | 226 | 76 |
| Sentences on those nonliteral-match records, including companions | 449 | 152 |
| N3 effective examples | 3,176 | 3,077 |
| All effective examples | 13,142 | 13,043 |
| All explicitly selected examples | 2,804 | 3,002 |
| All omitted examples | 572 | 671 |
| Records without effective examples | 814 | 844 |
| Original-content snapshots | 1,562 | 1,627 |

N5/N4 completed queues stay unchanged at **677/634 explicit example decisions**, with **13/nine pre-existing empty members** accounted for and **1,154/978 effective examples**. N3 is still in progress. Its next nonliteral group has 76 records and 152 companion sentences; another 1,343 pending records have 2,661 sentences. Reviewed valid forms remain among the global signals; a missing literal target is not proof of an error.

All **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections and four phrase attestations** remain. The unchanged **17,218 meanings** comprise **14,688 exact**, **2,524 reviewed equivalent/construction strings** and **six separately attested N2 phrase meanings**. No dictionary/construction flag reopens. Global nonliteral signals fall from 2,309 to **2,226**, including valid reviewed forms. The three pinned phrase-evidence sources are unchanged; full pinned JMdict supplies the additional context checks without importing another source or dictionary link.

After-5an source catalog SHA-256: `4dff77e5930d836f8ba225f9dc024239891b082f0581b857b0f896d9262219fd`.
After-5an canonical study SHA-256: `78306d4b271e6bd9b51dd07af57608eb8c87614e76d17566ee4fce167d6b8833`.
After-5an review-row SHA-256: `00ab8725dd7c1b2c2b8488a723c83ecf07803be906150240736cc8ce0ac4cf06`.

The application retains its earlier immutable Japanese **DRAFT** snapshot. No refresh, publication, application migration or application learner-state write occurs; English publication and the active assessment remain unchanged.

## Final N3 nonliteral example cohort (5ao)

The remaining **76 pending N3 nonliteral-match records**, from `af53cba50b` through `ff035a2a04`, account for **152 sentences: 107 retained unchanged and 45 omitted**. Literal companion sentences receive the same contextual review. The existing strict contract receives **35 in-place extensions and 41 new retain decisions**, preserving every previous meaning, reason and before-hash. There are now **4,129 meaning decisions: 1,146 corrected definitions and 2,983 retained**. Existing validators, compiler, inventory and shared assertions handle the batch; production logic and schemas are unchanged.

| Boundary | Decision |
| --- | --- |
| Selected senses | Vacancy differs from space/free time; chipping from lacking a quality; broadcast from flowing; heading towards a destination from aiming an object; emotional influence from physical movement. Engine startup and call forwarding differ from rotation; tent pitching from sticking/pasting; topic coverage from managing a problem. |
| Expressions and grammatical roles | Pinned mouth-speaking entry **2086150** includes 口をきく/口を利く/口を聞く/口を効く. The speaking example does not illustrate the selected efficacy sense on this card. Completion/progressive auxiliaries, journey departure, storage and the acquire-a-taste idiom remain distinct from the selected standalone meanings. |
| Propositions | Omit an unstated finding event, added male referents, a plural-to-singular substitution, added faster/soon bounds, a dropped if-possible/pulling condition, and the added letter/hope proposition. Other omissions address source/translation repair or insufficient context. |
| Eligible spelling context | Full pinned JMdict permits 空き with 明き, 勤め with 務め, 表れ with 現れ, 出来れば for できれば, 問 with 問い and 町 with 街. The corresponding selected-sense examples stay, preserving all primary identities and readings. No alternative form or dictionary link is added to the cards. |
| Valid inflections and context | Passive/prospective vehicle predicates, potential/imperative counting, causative-passive payment, contracted checking, physical covering, income earning, approval/acceptance and omission/completion remain where selected and translated adequately. Reporting a mistaken belief remains distinct from asserting it as fact. |
| Scope of a biology example | The unrestricted rabbit-versus-fox ear-length comparison lacks species scope. The animal-care companion stays. No replacement biology sentence or source passage is imported. |

The [Smithsonian National Zoo fennec fox profile](https://nationalzoo.si.edu/animals/fennec-fox), [Utah Division of Wildlife Resources rabbit and hare account](https://wildlife.utah.gov/rabbits-hares) and [U.S. Fish & Wildlife Service pygmy rabbit profile](https://www.fws.gov/species/pygmy-rabbit-brachylagus-idahoensis), consulted 2026-10-25, provide the species-specific long-/short-ear context behind that conservative omission. Their descriptions prevent treating the source comparison as a universal rule. No agency/zoo prose, image, replacement fact or exercise enters the corpus; these contextual citations do not alter the three pinned phrase-evidence sources.

**Only example arrays on 39 records change.** Six records lose both sentences. Complete original text, translations, sentence IDs and any furigana survive in **1,664 original-content snapshots**, 37 more than before. Every previous snapshot and review field remains intact; selected examples remain complete original objects in their original order. Definitions, primary IDs, readings, spellings, levels, parts of speech, dictionary evidence, source membership, canonical mappings and level decisions compare identically. No sentence is edited, invented or reassigned. Examples remain undisplayed in practice.

| Inventory measure | Before 5ao | After 5ao |
| --- | ---: | ---: |
| Explicit N3 example decisions | 191 | 267 |
| Pending N3 example-bearing records | 1,419 | 1,343 |
| Pending N3 sentences | 2,813 | 2,661 |
| Pending N3 nonliteral-match records | 76 | 0 |
| Sentences on those pending nonliteral-match records, including companions | 152 | 0 |
| N3 effective examples | 3,077 | 3,032 |
| All effective examples | 13,043 | 12,998 |
| All explicitly selected examples | 3,002 | 3,109 |
| All omitted examples | 671 | 716 |
| Records without effective examples | 844 | 850 |
| Original-content snapshots | 1,627 | 1,664 |

**The pending N3 nonliteral-match cohort is complete.** All 226 records pending before 5an have explicit decisions. The remaining **271 nonliteral N3 forms** are reviewed examples, rather than an automatic error queue. Another **1,343 N3 records with 2,661 sentences** still need contextual review despite literal target matches. N5/N4 completed queues stay unchanged at **677/634 decisions**, **13/nine pre-existing empty members** and **1,154/978 effective examples**. This cohort does not certify all N3 examples or curriculum classification.

All **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections and four phrase attestations** remain. The unchanged **17,218 meanings** comprise **14,688 exact**, **2,524 reviewed equivalent/construction strings** and **six separately attested N2 phrase meanings**. No dictionary/construction flag reopens. Global nonliteral signals fall from 2,226 to **2,193**, including valid reviewed forms. Full pinned JMdict supplies spelling/sense context without importing another dictionary or changing the three pinned phrase sources.

After-5ao source catalog SHA-256: `3249e9fa26a31d08739861aa70fb972790535c1de39953e3adb5f4765472a40e`.
After-5ao canonical study SHA-256: `3f666620bf6c1ec84c488cb79bc5d0a7131d5e3f72e10ff195f9fb56029897e0`.
After-5ao review-row SHA-256: `d7e255551cbd418b225afa424fc6fa69e627747769bc13b54985ef2fa68874e8`.

The application retains its earlier immutable Japanese **DRAFT** snapshot. No refresh, publication, application migration or application learner-state write occurs; English publication and the active assessment remain unchanged.

## First remaining N3 example cohort (5ap)

The first **150 remaining N3 records**, from `00077af4b5` through `1ad20880d6`, account for **297 sentences: 244 retained unchanged and 53 omitted**. All sentences had literal target matches; those matches alone do not establish the selected sense or an adequate translation. The existing strict contract receives **50 in-place extensions and 100 new retain decisions**, preserving every previous meaning, reason and before-hash. There are now **4,229 meaning decisions: 1,146 corrected definitions and 3,083 retained**. Existing validators, compiler, inventory and shared assertions handle the batch; production logic and schemas are unchanged.

| Boundary | Decision |
| --- | --- |
| Selected senses | Boy differs from waiter/bellboy; adjustment/arithmetic from cooking degree/health condition; numerical among from temporal during; flute from whistle; collision/thud from chance encounter; emotional pain from a hard situation; abstract candidacy from a candidate-person; tea from brown; supervision from a manager; opponent-versus from numerical scores. |
| Propositions | Contracting to write differs from currently writing; parliament from an argument; hearsay from the landlord's own statement; watching developments from actively testing waters; smoke coming from a location from being in it. Added country/gender/scope details, dropped conditions/degree and malformed text receive explicit omissions. |
| Shared sentences | 空き retains the character-spacing sentence and omits job vacancy, agreeing with 明き. 恐怖 omits the same unspecified-child-to-boy translation already omitted on 示す. Existing reviewed associations remain unchanged. |
| Valid contextual senses | Circle/full prefix, personal/national independence, childish/very-young and boy/man keep separate selected citations. Until noon differs from by noon; 2 a.m. remains within middle of night. Christmas/New Year greetings use the full pinned best-wishes sense. |
| Grammar and paraphrase retained | Negative-conditional obligation and direct prohibition both remain. Contextual packed-lunch, cottage, video-image, remaining-time and pity wording is retained where the target's selected meaning and event fit. A reported belief is distinct from asserting its content as fact. |
| Source quality and scope | Omit unanchored national food-supply/global petroleum assertions, unscoped voting eligibility, an unexplained dozing proverb and a stereotyping proverb. No replacement current fact, legal rule, health instruction or source text is authored. |

The [official Japanese government voting-age explanation](https://www.gov-online.go.jp/article/201602/entry-7825.html), consulted 2026-10-25, documents the change from the former threshold and supplies context for omitting the isolated twenty-year/adulthood eligibility examples. No replacement voting rule enters the corpus. Context checks also consult [CDC smoking information](https://www.cdc.gov/tobacco/about/), [NIDDK's digestion explanation](https://www.niddk.nih.gov/health-information/digestive-diseases/digestive-system-how-it-works), [NIAAA's alcohol-effects account](https://www.niaaa.nih.gov/alcohols-effects-health/alcohols-effects-body) and [FHWA's right-side driving account](https://highways.dot.gov/highway-history/general-highway-history/right-side-road). They support retaining the existing general/qualified source examples without importing agency prose, treatment instructions, exercises or new factual claims. Stomach digestion is not presented as exclusive to the stomach. The three pinned phrase-evidence sources remain unchanged.

**Only example arrays on 44 records change.** Nine records lose both sentences. Complete original text, translations, sentence IDs and any furigana survive in **1,702 original-content snapshots**, 38 more than before. Every prior snapshot and meaning-review field remains intact; selected examples remain complete original objects in their original order. All definitions, primary IDs, readings, spellings, levels, parts of speech, dictionary evidence, source membership, canonical mappings and level decisions compare identically. No source sentence is edited, invented or reassigned. Examples remain undisplayed in practice.

| Inventory measure | Before 5ap | After 5ap |
| --- | ---: | ---: |
| Explicit N3 example decisions | 267 | 417 |
| Pending N3 example-bearing records | 1,343 | 1,193 |
| Pending N3 sentences | 2,661 | 2,364 |
| Pending N3 nonliteral-match records | 0 | 0 |
| N3 effective examples | 3,032 | 2,979 |
| All effective examples | 12,998 | 12,945 |
| All explicitly selected examples | 3,109 | 3,353 |
| All omitted examples | 716 | 769 |
| Records without effective examples | 850 | 859 |
| Original-content snapshots | 1,664 | 1,702 |

N3 remains in progress: **1,193 records with 2,364 sentences** still need contextual decisions. Its **271 nonliteral forms** remain reviewed. N5/N4 completed queues stay unchanged at **677/634 decisions**, **13/nine pre-existing empty members** and **1,154/978 effective examples**. This milestone does not certify every N3 example or curriculum classification.

All **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections and four phrase attestations** remain. The unchanged **17,218 meanings** comprise **14,688 exact**, **2,524 reviewed equivalent/construction strings** and **six separately attested N2 phrase meanings**. No dictionary/construction flag reopens. Global nonliteral signals remain **2,193**, including valid reviewed forms; the batch omits only literal-match examples, so that inventory is unchanged.

After-5ap source catalog SHA-256: `0c207bee88729b4e0b22ca9521a610e83c6f8be82fb8378ec36c66041a6d513f`.
After-5ap canonical study SHA-256: `5f171d9c8b5c7e937b5156b83acb68d4ade6ed080d96cb06007e4752a63bda56`.
After-5ap review-row SHA-256: `e7d165cf683880fe2ea77ea088faf711b548c62586174fd3900a1e7aba70882c`.

The application retains its earlier immutable Japanese **DRAFT** snapshot. No refresh, publication, application migration or application learner-state write occurs; English publication and the active assessment remain unchanged.

## Second remaining N3 example cohort (5aq)

The next **150 N3 records**, from `1ad3b41d6f` through `3485a5b479`, account for **298 sentences: 237 retained unchanged and 61 omitted**. All had literal target matches. The existing strict contract receives **56 in-place extensions and 94 new retain decisions**, preserving every previous meaning, reason and before-hash. There are now **4,323 meaning decisions: 1,146 corrected definitions and 3,177 retained**. Existing validators, compiler, inventory and shared assertions handle the batch; production logic and schemas are unchanged.

| Boundary | Decision |
| --- | --- |
| Selected senses and roles | Permission differs from a passing grade; physical closeness from exactness; talk from a talkative person; vehicle counting from a stand/support noun; physical back from behind-the-scenes; subtlety from doubt; smoking cessation from a prohibition expression; nominal one-of-two from conjunctions; unrestricted any from interrogative what-kind; performance/story setting from the physical stage. |
| Word identity | Monetary 額 differs from picture-frame 額 even with the same がく reading. The appeal interjection ねぇ is not price 値・ね. 書類 retains its document identity rather than being silently changed to registered-mail 書留. |
| Primary reading | The 音 card declares **おん**, independently evidenced by **2859161**, with no alternate reading. Unannotated 音の出る/音を下げる does not establish that primary reading. Both examples are omitted; spelling, reading, definition and dictionary link stay. |
| Propositions and source quality | Omit a fixed shot for an unspecified small quantity, an added question recipient, ownership/location changes, fixed spouse roles, plural-to-singular speakers, source case-marker problems, unresolved furigana, malformed English and contexts needing clearer scope. |
| Full eligible context retained | The selected 雷 sense includes thunder and lightning; 支給 includes provision/supply of uniforms, food and money; 常識 includes common knowledge. Resemblance/entirety, mold/style, dimness/absentmindedness, boring/feeling-bored, lunch/noon and slice/cloth retain separate citations. |
| Quantity and ordinary wording retained | Six-person accommodation, two groups, two thousand words, five-minute departure, five-percent alcohol, ten-/three-percent examples, ten dollars weekly and ten-/seven-year durations remain exact. A once-a-week-is-enough request preserves the minimum frequency. Ordinary consumption, tailoring and figurative wording remains where its selected meaning and event fit. |

Context checks consult [ACVO's veterinary vision explanation](https://www.acvo.org/tips-treatments-tricks/vision-in-pets), [NASA's account of space size](https://www.nasa.gov/science-research/astrophysics/how-big-is-space-we-asked-a-nasa-expert-episode-61/) and [CDC's cold-management page](https://www.cdc.gov/common-cold/treatment/index.html), retrieved 2026-10-25. They support conservative omission of the blanket color-discrimination claim, unqualified limitless-universe assertion and unexplained contagion/recovery premise. [FAO's evolution/speciation chapter](https://www.fao.org/4/i1905e/i1905e01.pdf), section 3.4, PDF page 34 (printed page 27), supports the retained broad extinction/evolution example. These are contextual annotations; no professional/agency prose, image, exercise, replacement biology/cosmology answer or health instruction enters the corpus. The three pinned phrase-evidence sources remain unchanged.

**Only example arrays on 49 records change.** Twelve lose both sentences. Complete original text, translations, sentence IDs and any furigana survive in **1,744 original-content snapshots**, 42 more than before. Every earlier snapshot and meaning-review field remains intact; selected examples remain full original objects in their original order. Definitions, primary IDs, readings, spellings, levels, parts of speech, dictionary evidence, source membership, canonical mappings and level decisions compare identically. No source sentence is edited, invented or reassigned. Examples remain undisplayed in practice.

| Inventory measure | Before 5aq | After 5aq |
| --- | ---: | ---: |
| Explicit N3 example decisions | 417 | 567 |
| Pending N3 example-bearing records | 1,193 | 1,043 |
| Pending N3 sentences | 2,364 | 2,066 |
| Pending N3 nonliteral-match records | 0 | 0 |
| N3 effective examples | 2,979 | 2,918 |
| All effective examples | 12,945 | 12,884 |
| All explicitly selected examples | 3,353 | 3,590 |
| All omitted examples | 769 | 830 |
| Records without effective examples | 859 | 871 |
| Original-content snapshots | 1,702 | 1,744 |

N3 remains in progress: **1,043 records with 2,066 sentences** still require contextual decisions. Its **271 nonliteral forms** remain reviewed. N5/N4 completed queues stay unchanged at **677/634 decisions**, **13/nine pre-existing empty members** and **1,154/978 effective examples**. This milestone does not certify every N3 example or curriculum classification.

All **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections and four phrase attestations** remain. The unchanged **17,218 meanings** comprise **14,688 exact**, **2,524 reviewed equivalent/construction strings** and **six separately attested N2 phrase meanings**. No dictionary/construction flag reopens. Global nonliteral signals remain **2,193**, including reviewed valid forms; all omissions in this batch had literal target matches.

After-5aq source catalog SHA-256: `a487164eb0be96204d80925ff080816cb93d120b5caf9e629f05fe1de3921281`.
After-5aq canonical study SHA-256: `3a9274cd78d007c2f58b3e8183b1d91abd2ebfce32b6efc950fe285defcf2a8b`.
After-5aq review-row SHA-256: `e099613fa159b0bd9ef53aba13e1d5d5aba8a7f352e67ec023b517343baa44b2`.

The application retains its earlier immutable Japanese **DRAFT** snapshot. No refresh, publication, application migration or application learner-state write occurs; English publication and the active assessment remain unchanged.

## Third remaining N3 example cohort (5ar)

The next **150 N3 records**, from `34bee09fdb` through `52377d2422`, account for **296 sentences: 235 retained unchanged and 61 omitted**. All had literal target matches. The strict existing contract receives **64 in-place extensions and 86 new retain decisions**. Every earlier meaning, reason, before-hash and example decision remains. There are now **4,409 meaning decisions: 1,146 corrected definitions and 3,263 retained**. Existing validators, compiler, inventory and shared assertions handle the batch; production logic and schemas are unchanged.

| Boundary | Decision |
| --- | --- |
| Selected senses and roles | Verbal mastery differs from proprietor/academic degree; bill/payment from calculation; acting Hamlet from function/post; phrase from sentence; metal sheet from board; social circle from physical ring; university suffix from large/great; rainy appearance from design; wild-plant prefix from field noun. Sentence-final copula です plus causal から is not the standalone ですから conjunction. |
| Primary reading and annotations | Unannotated homework-today does not establish this card’s primary こんにち; present-era company wording uses another sense. Two unresolved furigana markers and a 中学時代/小説 boundary incorrectly annotated as 時代小説 need source repair. No alternate reading or replacement annotation is authored. |
| Propositions and shared source pairs | Omit added gender, observers, venue type and ordinals; dropped fleeing action, can unit, poison severity or majority emphasis; changed tense, quantifier scope and idiomatic meaning. Shared 人生/大半 majority and 笑う/笑い clerk decisions agree. Other omissions need historical, quotation or factual scope. |
| Contextually exact citation | The existing **plus** wording selects eligible **1115630 sense 4**, exactly glossed **plus**, for benefit/positive effect rather than arithmetic sense 1. Definitions and dictionary links stay unchanged; both benefit examples remain. The human 敵 examples cite adversary sense 1, and the tourist 組 cites group-of-people sense 2 despite other English gloss overlaps. |
| Retained readings, senses and ordinary wording | Explicit さいちゅう and たび remain; annotated 田・た survives as the rice-field root of 田んぼ. Next/since, care/trouble, receiving/requesting, only/free, intense/tight, school grade/rank, exam/inspection and fence/wall retain separate citations. Contextual dress, cocoa bean, pea, conventional figurative/proverb wording, quantities and qualified personal statements remain. |

Context checks consult [NOAA’s blue-whale account](https://www.fisheries.noaa.gov/species/blue-whale), [NIAAA’s alcohol-effects page](https://www.niaaa.nih.gov/alcohols-effects-health/alcohols-effects-body) and [Andalusia’s official rainfall context](https://www.juntadeandalucia.es/medioambiente/portal/en/web/guest/areas-tematicas/cambio-climatico-y-clima/clima-en-andalucia/caracterizacion_media_principales_variables_climaticas_andalucia/precipitacion), retrieved 2026-10-25, for conservative omission of the unrestricted animal-size comparison, blanket wine-harmless assertion and unqualified climate rhyme. No replacement scientific, geographic, economic or health claim is authored. The individual overwork attribution remains a personal illustrative statement, not a universal medical rule; [NHS headache context](https://www.nhs.uk/symptoms/headaches/) was consulted without importing clinical advice. No source prose, image, exercise, sentence, translation, reading or furigana is imported or invented. The three pinned phrase-evidence sources remain unchanged.

**Only example arrays on 52 records change.** Ten lose both sentences. Complete originals survive in **1,786 original-content snapshots**, 42 more than before. All earlier snapshots remain structurally identical; retained examples remain full original objects in their original order. Definitions, primary identities, readings, spellings, levels, dictionary evidence, source membership, canonical mappings and level decisions compare identically. Examples remain undisplayed in practice.

| Inventory measure | Before 5ar | After 5ar |
| --- | ---: | ---: |
| Explicit N3 example decisions | 567 | 717 |
| Pending N3 example-bearing records | 1,043 | 893 |
| Pending N3 sentences | 2,066 | 1,770 |
| Pending N3 nonliteral-match records | 0 | 0 |
| N3 effective examples | 2,918 | 2,857 |
| All effective examples | 12,884 | 12,823 |
| All explicitly selected examples | 3,590 | 3,825 |
| All omitted examples | 830 | 891 |
| Records without effective examples | 871 | 881 |
| Original-content snapshots | 1,744 | 1,786 |

N3 remains in progress: **893 records with 1,770 sentences** still require contextual decisions. Its **271 nonliteral forms** remain reviewed. N5/N4 completed queues stay at **677/634 decisions**, **13/nine pre-existing empty members** and **1,154/978 effective examples**. This does not certify every N3 example or curriculum classification.

All **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections and four phrase attestations** remain. The unchanged **17,218 meanings** comprise **14,688 exact**, **2,524 reviewed equivalent/construction strings** and **six separately attested N2 phrase meanings**. No dictionary/construction flag reopens. Global nonliteral signals remain **2,193**, including valid reviewed forms; they are not an error count.

After-5ar source catalog SHA-256: `2cf420a01e521f0e5a7ffa6a148a60b28fde2766ee6b8b251a30f7d328be7204`.
After-5ar canonical study SHA-256: `c2a91bf5330ebfec32d99eec741bbbac05955248fc4a5860a5443a020731299c`.
After-5ar review-row SHA-256: `ebe84278961ae6aa14ef922de4949bcdcee3c67001c3799c8526ff7aae34bfa1`.

The application retains its earlier immutable Japanese **DRAFT** snapshot. No refresh, publication, application migration or application learner-state write occurs. English publication and the active assessment remain unchanged.

## Fourth remaining N3 example cohort (5as)

The next **150 N3 records**, from `524a699a99` through `6b76d20f62`, account for **298 sentences: 234 retained unchanged and 64 omitted**. All had literal target matches. The existing strict contract receives **55 in-place extensions and 95 new retain decisions**, preserving every previous meaning, reason, before-hash and example decision. There are now **4,504 meaning decisions: 1,146 corrected definitions and 3,358 retained**. Existing compiler, validators, inventory and shared assertions handle the batch; production logic and schemas are unchanged.

| Boundary | Decision |
| --- | --- |
| Word identity and selected senses | Unexpectedness/emergency differs from interjection まさか; request どうか from copper coin; Sino-Japanese 日中 from daytime; reputation from financial shares; electronic from electron; alarm configuration/hair setting from a set of things; airflow/pedestrian traffic from street/same-way 通り; inner intentions from anatomical 腹. Sharp pain, coin suffixes and coffee-enthusiast suffixes also use other senses. |
| Grammatical roles and source construction | Copula-plus-connective endings differ from the standalone だけど conjunction. Finite aging and nightfall forms and a working-too-much verb stem do not independently instantiate their selected nouns. The head/expression source, awkward frequency question, unresolved wife annotation and several English constructions need repair. |
| Changed propositions | Omit added walls, streets, license types, gender, participant groups; reversed latter/former preference; changed tense or frequency; closed-business versus sale; by versus before deadlines; added comparative growth/emphasis; dropped heart-depth origin or spanking action; transaction/city-center scope changes. Unscoped factual, legal, historical and characterization examples need context. No replacement claim is authored. |
| Exact contextual citation retained | **悲劇** keeps the unchanged **tragedy** definition while explicitly selecting eligible **1483280 sense 2** for the calamity event rather than the automatic dramatic-work match. Both **ジュース** drink examples cite existing **1065950 sense 1**, preserving the separately evidenced **2843595** deuce homonym and all earlier meaning decisions. |
| Full senses, primary readings and ordinary wording retained | Bus service/flight, association/meeting, middle/partly, behavior/imitation, or/perhaps and ceremony/equation remain distinct. Pinned eligible doctor-title/PhD context and explicit しまい remain. Collective committee wording, contextual numeral reading, word-root compounds, ordinary implicit objects, figurative wings, subjective valuations and natural venue/shore/report/pen translations stay. Numerical amounts and relative quantities remain; generic humanity wording is distinguished from adding gender to a specific unspecified person. |

**Only example arrays on 51 records change.** Thirteen lose both sentences; 大戦 and 老い lose their sole sentences. Complete originals survive in **1,826 original-content snapshots**, 40 more than before. Earlier snapshots remain structurally identical, and retained examples remain full original objects in their original order. Definitions, IDs, readings, spellings, levels, dictionary evidence, source membership, canonical mappings and level decisions compare identically. No sentence, translation, reading, furigana or factual replacement is authored or imported. The three pinned phrase-evidence sources remain unchanged. Examples remain undisplayed in practice.

| Inventory measure | Before 5as | After 5as |
| --- | ---: | ---: |
| Explicit N3 example decisions | 717 | 867 |
| Pending N3 example-bearing records | 893 | 743 |
| Pending N3 sentences | 1,770 | 1,472 |
| Pending N3 nonliteral-match records | 0 | 0 |
| N3 effective examples | 2,857 | 2,793 |
| All effective examples | 12,823 | 12,759 |
| All explicitly selected examples | 3,825 | 4,059 |
| All omitted examples | 891 | 955 |
| Records without effective examples | 881 | 896 |
| Original-content snapshots | 1,786 | 1,826 |

N3 remains in progress: **743 records with 1,472 sentences** still require contextual decisions. Its **271 nonliteral forms** remain reviewed. N5/N4 completed queues remain at **677/634 decisions**, **13/nine pre-existing empty members** and **1,154/978 effective examples**. This does not certify every N3 example or curriculum classification.

All **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections and four phrase attestations** remain. The unchanged **17,218 meanings** comprise **14,688 exact**, **2,524 reviewed equivalent/construction strings** and **six separately attested N2 phrase meanings**. No dictionary/construction flag reopens. Global nonliteral signals remain **2,193**, including reviewed valid forms; they are not an error count.

After-5as source catalog SHA-256: `61cc35f144636fc453ddf74c914572cb7bf2b8f3622fcac60a6901b167f84a25`.
After-5as canonical study SHA-256: `df4c5d05c8b028deb9fe2ac3c624d1731078638c7531bf670e89a9c8ac13be3e`.
After-5as review-row SHA-256: `2053e154eb4078294f114dea3a5adeaf359b07d96cbc3060f5c05ed14d4c74ec`.

The application retains its earlier immutable Japanese **DRAFT** snapshot. No refresh, publication, application migration or application learner-state write occurs; English publication and the active assessment remain unchanged.

## Fifth remaining N3 example cohort (5at)

The next **150 N3 records**, from `6b8002d0f8` through `8d2c6575c2`, account for **294 sentences: 229 retained unchanged and 65 omitted**. All had literal target matches. The existing strict contract receives **55 in-place extensions and 95 new retain decisions**, preserving every previous meaning, reason, before-hash and example decision. There are now **4,599 meaning decisions: 1,146 corrected definitions and 3,453 retained**. Existing compiler, validators, inventory and shared assertions handle the batch; production logic and schemas are unchanged.

| Boundary | Decision |
| --- | --- |
| Words, roles and selected senses | Question counting differs from title/topic; a driving turn from a serial number; 正しい/正す from 正・せい; the escort verb from the companion noun; reflection from shadow; station/lamp from a supporting stand; clandestine underground from physical underground; 従って verb forms from therefore; biology from organism; both from jointly; careless handling from poor quality; winning prospects from personal wishes. |
| Quantities, time and propositions | Half-or-more includes equality that more-than-half excludes. Next week differs from next month, at-the-edge from near-the-edge, completed preparation from ongoing preparation, receiving from transmission, and a concerned party from a ruler. Other omissions address added agents, recipients, ownership, locations and gender; lost visit/wage/employment context; malformed text, unresolved furigana and unclear remaining-month scope. |
| Exact contextual citation | The unchanged **development** definition explicitly selects **1477680 sense 2** for social/custom development, while **growth** retains **sense 1** for physical development. Both original examples remain with separate selected citations; definitions, identities and dictionary links stay unchanged. |
| Pinned spelling and reading retained | Full pinned **1326900** explicitly permits spirit possession on **取り付く**. Its spelling is retained rather than silently repaired or misclassified as an attachment-only verb. The explicit **間・ま** proverb reading stays; common primary 日本・にっぽん and 頬・ほほ are preserved without adding readings. |
| Full senses and natural context retained | Yacht includes sailboat; confectionery includes cake and candy; stability includes physical balance. Collective or unnumbered nouns, transport contexts, ordinary implicit narration, reported beliefs, open life-origin questions, evaluative maxims and conventional figurative translations remain. Shared 始まり/半ば and 合計/数字 decisions agree with earlier associations. |

Context checks consult [Winkler and Bryant’s comparative play-vocalization review](https://gabryant.scholar.ss.ucla.edu/wp-content/uploads/sites/20/2021/05/Play_vocals_Bioacoustics_2021.pdf) and [WHO’s physical-activity summary](https://www.who.int/news-room/fact-sheets/detail/physical-activity), retrieved 2026-10-25. The comparative research provides a reason to omit an exceptionless humans-only laughter assertion without treating nonhuman vocal play as identical to every human laughter function. The WHO summary supports keeping the existing broad moderate-exercise statements. No replacement biological claim, clinical regimen, source prose, image, exercise, sentence, translation, reading or furigana is authored or imported. The three pinned phrase-evidence sources remain unchanged.

**Only example arrays on 54 records change.** Eleven lose both sentences; 勘 loses its sole sentence. Complete originals survive in **1,871 original-content snapshots**, 45 more than before. Earlier snapshots remain structurally identical, and retained examples remain full original objects in their original order. Definitions, IDs, readings, spellings, levels, dictionary evidence, source membership, canonical mappings and level decisions compare identically. Examples remain undisplayed in practice.

| Inventory measure | Before 5at | After 5at |
| --- | ---: | ---: |
| Explicit N3 example decisions | 867 | 1,017 |
| Pending N3 example-bearing records | 743 | 593 |
| Pending N3 sentences | 1,472 | 1,178 |
| Pending N3 nonliteral-match records | 0 | 0 |
| N3 effective examples | 2,793 | 2,728 |
| All effective examples | 12,759 | 12,694 |
| All explicitly selected examples | 4,059 | 4,288 |
| All omitted examples | 955 | 1,020 |
| Records without effective examples | 896 | 908 |
| Original-content snapshots | 1,826 | 1,871 |

N3 remains in progress: **593 records with 1,178 sentences** still require contextual decisions. Its **271 nonliteral forms** remain reviewed. N5/N4 completed queues remain at **677/634 decisions**, **13/nine pre-existing empty members** and **1,154/978 effective examples**. This does not certify every N3 example or curriculum classification.

All **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections and four phrase attestations** remain. The unchanged **17,218 meanings** comprise **14,688 exact**, **2,524 reviewed equivalent/construction strings** and **six separately attested N2 phrase meanings**. No dictionary/construction flag reopens. Global nonliteral signals remain **2,193**, including reviewed valid forms; they are not an error count.

After-5at source catalog SHA-256: `ba1fbb1ed57f610219cbe8ee0a5517519e9736eaa55c4d37447d3e9f432963fd`.
After-5at canonical study SHA-256: `0c627cb190862dff0d06de6026651d8763a5d1afc82a48c8c2fe7c7ecd2d76c2`.
After-5at review-row SHA-256: `2de47f7da8f68f1b25e956a043fcf27d327be0d5b05c9e34853bd53108c689b4`.

The application retains its earlier immutable Japanese **DRAFT** snapshot. No refresh, publication, application migration or application learner-state write occurs; English publication and the active assessment remain unchanged.

## Sixth remaining N3 example cohort (5au)

The next **150 N3 records**, from `8d3ff79d95` through `a80b19470d`, account for **296 sentences: 234 retained unchanged and 62 omitted**. All had literal target matches. The strict existing contract receives **48 in-place extensions and 102 new retain decisions**, preserving every earlier meaning, reason, before-hash and example decision. There are now **4,701 meaning decisions: 1,146 corrected definitions and 3,555 retained**. Existing compiler, validators, inventory and shared assertions handle the batch; production logic and schemas are unchanged.

| Boundary | Decision |
| --- | --- |
| Roles, names and grammar | Mike the person differs from microphone; a colleague from a professor; a robber from a robbery; verb imperatives from the welcome interjection; copula-plus-particle endings from standalone だが. Other omissions address added gender, ownership, agents, venue types and thresholds, lost inability/context, malformed text, unresolved markers and changed comparisons or relations. |
| Selected senses | Car condition differs from musical tone; no-matter-how from how-much; both from jointly; wings from feathers; legislative passage from physical transit; sufficient feeding from satisfaction; sudden occurrence from rapid action; a weather-spell suffix from story continuation; object scratches from bodily injury; cursory reading from numerical approximation. |
| Exact contextual citation | The unchanged **mail** wording selects **1605680 sense 2** for collected postal items while **postal service** retains **sense 1** for the mail-train context. Both original sentences remain with separate selected citations and no changed definition or dictionary link. |
| Full pinned context retained | **いらいら** includes fretting/being on edge and supports exam-related nervousness. Pinned **1151160** confirms 逢瀬 as a tryst/lover’s meeting, supporting the contextual expansion. Visitor/travel gifts, course credits/measurement units, physical stimulus/economic impetus, liking/preference, position/standpoint and joyful self-forgetting/immersion retain separate citations. |
| Readings, quantities and ordinary context | Explicit **小・しょう** and **綿・めん**, plus the eligible common **工場・こうば** reading, remain. Figurative fundamentals, ordinary implicit narration, collective/unnumbered nouns and contextually complete promise fulfillment stay. Years, dates, page fifty, three ice creams, two admissions and two-/three-step quantities remain. The crop, learning-proverb and railway-completion selections agree with prior associations. |

Context checks consult [Airbus’s Concorde history](https://www.airbus.com/en/newsroom/stories/2019-03-the-day-concorde-flew-into-the-history-books), [Geoscience Australia’s mineral overview](https://www.ga.gov.au/education/minerals-energy/australian-mineral-facts) and [Maguvu, Higuchi and Shibata’s flower-opening study](https://www.jstage.jst.go.jp/article/hortj/87/1/87_OKD-078/_pdf), retrieved 2026-10-25. They support the existing broad speed/resource descriptions and a flower-opening light stimulus without importing figures, a new plant identity or an all-species flowering rule. [Bonta and colleagues’ fire-spreading research](https://pure.psu.edu/en/publications/intentional-fire-spreading-by-firehawk-raptors-in-northern-austra/) and [Shibuya’s emergency-service context](https://www.city.shibuya.tokyo.jp/contents/living-in-shibuya/en/emergencies/dial119.html) inform conservative omission of the unqualified humans-only fire-use claim and the emergency-number instruction without country context. The reported fire-spreading observations do not settle every question about cognition or definitions of fire use. No replacement biological claim, health/emergency instruction, source prose, image, exercise, sentence, translation, reading or furigana is authored or imported. The three pinned phrase-evidence sources remain unchanged.

**Only example arrays on 53 records change.** Nine lose both sentences; all four single-example records retain their originals. Complete originals survive in **1,920 original-content snapshots**, 49 more than before. Earlier snapshots remain structurally identical, and retained examples remain full original objects in their original order. Definitions, IDs, readings, spellings, levels, dictionary evidence, source membership, canonical mappings and level decisions compare identically. Examples remain undisplayed in practice.

| Inventory measure | Before 5au | After 5au |
| --- | ---: | ---: |
| Explicit N3 example decisions | 1,017 | 1,167 |
| Pending N3 example-bearing records | 593 | 443 |
| Pending N3 sentences | 1,178 | 882 |
| Pending N3 nonliteral-match records | 0 | 0 |
| N3 effective examples | 2,728 | 2,666 |
| All effective examples | 12,694 | 12,632 |
| All explicitly selected examples | 4,288 | 4,522 |
| All omitted examples | 1,020 | 1,082 |
| Records without effective examples | 908 | 917 |
| Original-content snapshots | 1,871 | 1,920 |

N3 remains in progress: **443 records with 882 sentences** still require contextual decisions. Its **271 nonliteral forms** remain reviewed. N5/N4 completed queues remain at **677/634 decisions**, **13/nine pre-existing empty members** and **1,154/978 effective examples**. This does not certify every N3 example or curriculum classification.

All **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections and four phrase attestations** remain. The unchanged **17,218 meanings** comprise **14,688 exact**, **2,524 reviewed equivalent/construction strings** and **six separately attested N2 phrase meanings**. No dictionary/construction flag reopens. Global nonliteral signals remain **2,193**, including reviewed valid forms; they are not an error count.

After-5au source catalog SHA-256: `33aec29fdee7436b1eb3e105234d84b773e84ac3cfa2ebb2cd9441f907b8c9b5`.
After-5au canonical study SHA-256: `6b95b8756d688062a2bc21014f0f4bad502c80beaabe433a93bb3eed924ac29f`.
After-5au review-row SHA-256: `5b876b837908e895e4b9a199fea43d18b60000efe34db85fb82dfc2bb0f5d254`.

The application retains its earlier immutable Japanese **DRAFT** snapshot. No refresh, publication, application migration or application learner-state write occurs; English publication and the active assessment remain unchanged.

## Seventh remaining N3 example cohort (5av)

The next **150 N3 records**, from `a812d7a958` through `c3b1f16454`, account for **300 sentences: 248 retained unchanged and 52 omitted**. Each record had two literal target matches. The strict existing contract receives **62 in-place extensions and 88 new retain decisions**, preserving every earlier meaning, reason, before-hash and example decision. There are now **4,789 meaning decisions: 1,146 corrected definitions and 3,643 retained**. Existing compiler, validators, inventory and shared assertions handle the batch; production logic and schemas are unchanged.

| Boundary | Decision |
| --- | --- |
| Selected dictionary senses | Favor/debt differs from lending 貸し; broadcast stations from bureau 局; business/research expansion from magnification 拡大; concert close from physical curtain 幕; sales from business operations 営業; generic boats from rowing boats; eventual いずれ from an interrogative; TV drama from dramatic spectacle; laborious 骨 from physical bone. Comparison/negative まるで and negative どうしても use unselected numbered senses. Definitions are not broadened to save examples. |
| Grammatical role and identity | Honorific お貸しいたします and finite 読みさえすれば do not instantiate the standalone lending/reading nouns. 果実・かじつ plus particle のみ does not instantiate 実・み. Both うがい examples lack the target word; particle endings differ from noun で. Apparent-knowing and manner よう constructions differ from the selected method/style suffix senses. Nominal 試しに and 飛ばし読み remain valid. |
| Readings, source quality and propositions | Three unresolved numeric reading markers need source repair. The gift-horse example uses person-kanji 者 for the intended received-object word. A Japanese object particle, thought/ideal wording and English subject agreement also need repair. Omit changed tense/onset, negation/difficulty, incidence-rate metric, comparison scope and action; added gender, ownership, flight, habitual shopping, queue length and reproduction; dropped approximate height or general acceptance scope. Eyesight worsening differs from temporary eye strain. No source repair is silently authored. |
| Retained sense contrasts | 次第 cites as-soon-as sense 2 and circumstances sense 5; 意識 awareness 2 and consciousness 1; ところで conditional 2 and topic-change 1; 日 Sunday abbreviation 1 and day counter 3; 姿 dress 2 and figure 1; オーバー overcoat 1 and exceeding 2. General 差 cites sense 1 rather than mathematical subtraction. 万一’s selected sense 2 includes adjectival use before 場合; 実’s resulting grain uses selected seed sense 2. Earlier meaning citations stay unchanged. |
| Retained contextual language | Ordinary climbing-shoe ellipsis, common weather 後・のち, explicit 表・ひょう, notice/news, grades/results, financial-ruin wording, thoughtful listening, generic proverb agents, prime-of-life expressions, botanical kinship and exact quantities remain. Open questions, unnamed illustrative events and reported forecasts do not become new current medical/economic/weather claims. Shared chemistry-experiment, news, column/sum and feeling-tone examples agree with earlier associations. |

Context checks consult [Kew’s watermelon account](https://www.kew.org/plants/watermelon), [the US Census Bureau’s national profile](https://data.census.gov/all?q=USA), [NOAA’s stratospheric observations](https://www.csl.noaa.gov/news/2026/442_0423.html) and [the Library of Congress’s pre-1492 Americas account](https://www.loc.gov/exhibits/1492/america.html), retrieved 2026-10-25. They support the broad botanical-kinship, fifty-state and upper-atmosphere contexts and inform conservative omission of the unqualified Columbus-discovery sentence. Kew’s indexed page content was available; direct opening returned 403, which was not bypassed. No source prose, image, exercise, replacement factual statement, sentence, translation, reading, furigana or health/travel instruction is imported or authored. The three pinned phrase-evidence sources remain unchanged.

**Only example arrays on 37 records change.** Fifteen lose both sentences. Complete originals survive in **1,950 original-content snapshots**, 30 more than before. Every earlier snapshot remains structurally identical, and retained examples remain full original objects in their original order. Definitions, IDs, readings, spellings, levels, dictionary evidence, source membership, canonical mappings and level decisions compare identically across all 10,307 records. Examples remain undisplayed in practice.

| Inventory measure | Before 5av | After 5av |
| --- | ---: | ---: |
| Explicit N3 example decisions | 1,167 | 1,317 |
| Pending N3 example-bearing records | 443 | 293 |
| Pending N3 sentences | 882 | 582 |
| Pending N3 nonliteral-match records | 0 | 0 |
| N3 effective examples | 2,666 | 2,614 |
| All effective examples | 12,632 | 12,580 |
| All explicitly selected examples | 4,522 | 4,770 |
| All omitted examples | 1,082 | 1,134 |
| Records without effective examples | 917 | 932 |
| Original-content snapshots | 1,920 | 1,950 |

N3 remains in progress: **293 records with 582 sentences** still require contextual decisions. Its **271 nonliteral forms** remain reviewed. N5/N4 completed queues remain at **677/634 decisions**, **13/nine pre-existing empty members** and **1,154/978 effective examples**. This does not certify every N3 example or curriculum classification.

All **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections and four phrase attestations** remain. The unchanged **17,218 meanings** comprise **14,688 exact**, **2,524 reviewed equivalent/construction strings** and **six separately attested N2 phrase meanings**. No dictionary/construction flag reopens. Global nonliteral signals remain **2,193**, including valid reviewed forms; they are not an error count.

After-5av source catalog SHA-256: `713426f8e5a0aac38356d8f5e19c4b8cff92a56fa8c3cbb791a8b20e9b0c64dc`.
After-5av canonical study SHA-256: `a58637f4fa2a1e1c5bcd6756aaed802d0ca995c9e48e017e1ae3440a90fde146`.
After-5av review-row SHA-256: `6c494437e1fd27c48d0cb189f28b3c34b1f64efc08d48d2fb6cb94f63d0ca659`.

The application retains its earlier immutable Japanese **DRAFT** snapshot. No refresh, publication, application migration or application learner-state write occurs; English publication and the active assessment remain unchanged.

## Eighth remaining N3 example cohort (5aw)

The next **150 N3 records**, from `c3d0c7fa43` through `e351a6f3de`, account for **298 sentences: 246 retained unchanged and 52 omitted**. All had literal target matches; two records had only one original sentence. The strict existing contract receives **49 in-place extensions and 101 new retain decisions**, preserving every earlier meaning, reason, before-hash and example decision. There are now **4,890 meaning decisions: 1,146 corrected definitions and 3,744 retained**. Existing compiler, validators, inventory and shared assertions handle the batch; production logic and schemas are unchanged.

| Boundary | Decision |
| --- | --- |
| Selected senses and identities | Surprise あら differs from flaw 粗; figurative city from governmental capital 都; becoming an adult from adult 成人; occasion from place/physics 場; school Japanese from national language 国語; merciless person from demon/tagger 鬼; nature/material typo from sex/gender 性; body figure from style; periodic liner and commuter pass from fixed term; in-some-respect from spatial どこか; standalone lesson from counter 課; comparative-more from continuing なお. Generic satellite context does not establish natural origin over the separately numbered artificial sense. Definitions remain unchanged. |
| Reading, source and register | University-festival 大学祭 does not establish primary まつり over usual さい; a 書斎 companion has an unresolved numeric wife-reading marker. The acrylic example needs material kanji 製, and the agriculture English loses the economic-basis relation and needs grammar repair. Full hash-verified pinned JMdict **1122700 sense 2** marks ホモ derogatory, while the unlabelled source translation uses neutral gay; omit that single それと example pending register context without changing dictionary links or authoring replacement language. |
| Propositions and scope | Omit added branch ownership, fare context, plural workers/ability, age, occupational field, female approval subject, invitation recipient, male grandchildren and responsibility for an error. Other omissions concern large-versus-long, degree-versus-quantity, temporal assertion, caught-versus-unspecified dismissal, road scope, lost finally/high-ranking restrictions, an ambiguous impression recipient and factual claims needing history/date/rate/species/comparison scope. |
| Selected contrasts retained | 面 cites mask 2 and face 1; 以前 prior-times 2; 語 language 2 and word counter 1; 団体 organization 2; よろしく regards 2; 誕生 creation/origin 2; 詳しい knowledgeable 2 and detailed 1; 冒険 risk 2 and adventure 1; 利益 benefit 2; 課 numbered counter 3; 精々 utmost 2; 女王 monarch 1. No earlier meaning citation changes. |
| Full senses, readings and ordinary language retained | Naive fits the full simple sense; absorbing ideas remains within absorption; art means human workmanship; library can mean a book collection; sense of humor fits sense/feeling; a brief comment fits 一言. Eligible primary 身体・しんたい remains without adding a reading. Explicit 面・めん and 灯・ひ, cold-as-ice and boundary metaphors, established proverbs, exact counters, two-volume total, five-thousand-yen cost, one-mile distance, natural paraphrases and unnumbered nouns remain. Shared participation, Pacific crossing and payer-proverb decisions agree with earlier associations. |

Context checks consult [the RAF’s earlier transatlantic-flight history](https://www.raf.mod.uk/what-we-do/our-history/first-non-stop-flight/) and [DOE’s light-bulb history](https://www.energy.gov/articles/history-light-bulb) for the unqualified Lindbergh-first and single-inventor credit omissions. [FAO’s India profile](https://www.fao.org/india), [UN population prospects](https://www.un.org/en/node/219445) and [NPS bloom-duration context](https://www.nps.gov/subjects/cherryblossom/bloom-watch.htm) inform the date, rate and species/weather scope of omitted generalizations. [NASA’s Moon facts](https://science.nasa.gov/moon/facts/) and [continent education](https://www.nasa.gov/learning-resources/nasas-picture-dictionary-c/), [USGS’s Greenland account](https://pubs.usgs.gov/of/2005/1294/d/of2005-1294d.pdf), [EIA’s introductory energy account](https://www.eia.gov/energyexplained/what-is-energy/forms-of-energy.php), [JAMSTEC’s offshore-Shikoku research](https://www.jamstec.go.jp/e/about/press_release/20211011/) and [Sayigh, Wells and Janik’s dolphin recognition study](https://repository.library.noaa.gov/view/noaa/58538/noaa_58538_DS1.pdf) support the retained broad contexts, without treating dolphin cognition as a universal intelligence scale or the seven-continent convention as the only classification model. [The US Office of the Historian’s Gulf War chronology](https://history.state.gov/milestones/1989-1992/gulf-war) supports the early-decade framing without asserting an exact January-first onset. Retrieved 2026-10-26. No source prose, image, exercise, replacement factual statement, sentence, translation, reading, furigana, clinical instruction or financial recommendation is imported or authored. The three pinned phrase-evidence sources remain unchanged.

Unnamed illustrative medicine, symptom, household, operation and weather utterances remain examples rather than current clinical, financial, legal or operational instructions. Questions do not acquire factual answers. No new sentence or annotation is authored.

**Only example arrays on 43 records change.** Nine lose both sentences and the single-example それと loses its sentence; the single-example 図書 retains its original. Complete originals survive in **1,991 original-content snapshots**, 41 more than before. Every earlier snapshot remains structurally identical, and retained examples remain full original objects in their original order. Definitions, IDs, readings, spellings, levels, dictionary evidence, source membership, canonical mappings and level decisions compare identically across all 10,307 records. Examples remain undisplayed in practice.

| Inventory measure | Before 5aw | After 5aw |
| --- | ---: | ---: |
| Explicit N3 example decisions | 1,317 | 1,467 |
| Pending N3 example-bearing records | 293 | 143 |
| Pending N3 sentences | 582 | 284 |
| Pending N3 nonliteral-match records | 0 | 0 |
| N3 effective examples | 2,614 | 2,562 |
| All effective examples | 12,580 | 12,528 |
| All explicitly selected examples | 4,770 | 5,016 |
| All omitted examples | 1,134 | 1,186 |
| Records without effective examples | 932 | 942 |
| Original-content snapshots | 1,950 | 1,991 |

N3 remains in progress: **143 records with 284 sentences** still require contextual decisions. Its **271 nonliteral forms** remain reviewed. N5/N4 completed queues remain at **677/634 decisions**, **13/nine pre-existing empty members** and **1,154/978 effective examples**. This does not certify every N3 example or curriculum classification.

All **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections and four phrase attestations** remain. The unchanged **17,218 meanings** comprise **14,688 exact**, **2,524 reviewed equivalent/construction strings** and **six separately attested N2 phrase meanings**. No dictionary/construction flag reopens. Global nonliteral signals remain **2,193**, including valid reviewed forms; they are not an error count.

After-5aw source catalog SHA-256: `e8a559ec7a805b55f1e9ea403db86cf83f635e56a3e166238aeb113c01a64786`.
After-5aw canonical study SHA-256: `d04d0a03e2563ea14abb642934ef3bd047d7599f3686714c32f0631b18c03751`.
After-5aw review-row SHA-256: `94faac903065a85935db538cc0a564faf1fce3323eeb4d8c409b8db2ab63c01e`.

The application retains its earlier immutable Japanese **DRAFT** snapshot. No refresh, publication, application migration or application learner-state write occurs; English publication and the active assessment remain unchanged.

## Final remaining N3 example cohort (5ax)

The final **143 N3 records**, from `e391d26404` through `fffb310ed7`, account for **284 sentences: 222 retained unchanged and 62 omitted**. All had literal target matches; two records had one original sentence each. The strict existing contract receives **51 in-place extensions and 92 new retain decisions**, preserving every earlier meaning, reason, before-hash and example decision. There are now **4,982 meaning decisions: 1,146 corrected definitions and 3,836 retained**. Existing compiler, validators, inventory and shared assertions handle the batch; production logic and schemas are unchanged.

| Boundary | Decision |
| --- | --- |
| Selected senses and roles | Hopeless/negative-degree さっぱり differs from refreshed/tidy; appreciation from assessment; true-nature 根 from plant roots; conjugation 変化 from general change; utter 真っ赤 from red color; novel plot/information-source 筋 from muscle/string/line; tobacco pipe from pipe/tube; urban concentration from attention focus; occupational field from farmland; knack from respiration; downclimb from down-train; certainty adverbs from adjective/abstract 絶対; center fielder from center. Finite 疲れすぎて remains distinct from the fatigue noun. |
| Authored contextual conclusion citation | The existing **conclusion** definition selects eligible **1255020 sense 1**, glossed **conclusion (of an argument, discussion, study, etc.)**, as an explicit equivalent. Both shared-conclusion and hasty-conclusion examples remain. Automatic exact sense 2 is marked formal logic and does not establish these ordinary contexts. No definition, reading or dictionary link changes; the current classification moves one string from exact to reviewed-equivalent. No earlier meaning citation changes. |
| Propositions and source quality | Omit reversed former/latter preference and lost conditional ordering, only-versus-hardest, lost tomorrow/indefinite duration/completion/intensity, added ceremony/meal/geographic boundary/gender/age/plural arrivals or personal accusation, and changed tense/action/direction. Malformed manner particles, adjective nominalization, English plural agreement or word spacing and unresolved readings need source repair. Reading/source errors are not silently rewritten. |
| Pinned compound and lexical checks | Full hash-verified JMdict reads 下欄 as **からん** (2658040), so its **下・した** annotation is omitted. Announcing visitors is **取り次ぐ** (1326760), whose past differs from source とりついた. Pinned **アビ** (1778570) supports red-throated loon in an unnamed coin description; no actual coin issuer or country is inferred. These checks add no dictionary links or alternative readings. |
| Retained contextual senses | Institution 機関 2, cheerful/weather 陽気 1/2, pity/pitiable 哀れ 1/2, inheritance 相続 2, traffic signal 信号 2, before-long/eventually やがて 1/3, forte 得意 2, representative person 代理 2, yen/circle 円 1/2, notable aspect 節 4, able person 人物 3, reputation 名 3, minimum/worst 最低 1/2 and circumference/surroundings 周囲 2/1 retain separate citations. |
| Natural language retained | Explicit primary 昨・さく, conventional traffic 青/green, ordinary role wording, caregiver/classroom/household possessives, neutral or generic reference, broad pinned meanings, exact quantities, physical/figurative metaphors, established idioms and proverbs remain. Shared phenomenon, sleeping-boy, artist, language-change, foam-wave and cheese/milk examples agree with earlier decisions. The duplicated name/indefinite-duration sentence receives the same omission on both cards. Questions, unnamed reports and qualitative evaluations do not acquire new factual answers or treatment instructions. |

Context checks consult [NCBI’s anaerobic-bacteria definition](https://www.ncbi.nlm.nih.gov/mesh/68001421), [Bonta and colleagues’ fire-spreading research](https://pure.psu.edu/en/publications/intentional-fire-spreading-by-firehawk-raptors-in-northern-austra/), [UNODC’s homicide study](https://www.unodc.org/documents/data-and-analysis/gsh/2023/Global_study_on_homicide_2023_web.pdf), [NYC’s Midtown street study](https://www.nyc.gov/assets/planning/download/pdf/plans/transportation/mmp1_part1.pdf), [the St Louis Fed’s supply/demand account](https://www.stlouisfed.org/publications/page-one-economics/2021/03/01/the-science-of-supply-and-demand) and [Cornell’s bird-diet account](https://test.celebrateurbanbirds.org/faq/what-do-birds-eat/) for conservative handling of biological universals, fire-use definitions, causal/social scope, citywide street width, market-model conditions and species/seasonal diet scope. Fire-spreading observations do not settle every definition of cognition or fire control. [The House of Representatives’ account of the Diet](https://www.shugiin.go.jp/internet/itdb_annai.nsf/html/statics/kokkai/kokkai_chii.htm) and [UDHR article 7](https://www.un.org/en/about-us/universal-declaration-of-human-rights/) support the retained broad civic and normative-equality contexts; they are not a claim of identical legal practice everywhere. Retrieved 2026-10-26. No research/agency prose, image, exercise, replacement factual statement, sentence, translation, reading, furigana, clinical instruction or financial/legal advice is imported or authored. The three pinned phrase-evidence sources remain unchanged.

**Only example arrays on 53 records change.** Nine lose both sentences; 下り loses its sole sentence, while 節 retains its sole sentence. Complete originals survive in **2,040 original-content snapshots**, 49 more than before. Every earlier snapshot remains structurally identical, and retained examples remain full original objects in their original order. Definitions, IDs, readings, spellings, levels, dictionary evidence, source membership, canonical mappings and level decisions compare identically across all 10,307 records. Examples remain undisplayed in practice.

| Inventory measure | Before 5ax | After 5ax |
| --- | ---: | ---: |
| Explicit N3 example decisions | 1,467 | 1,610 |
| Pending N3 example-bearing records | 143 | 0 |
| Pending N3 sentences | 284 | 0 |
| Accounted-for pre-existing empty N3 members | 70 | 70 |
| N3 effective examples | 2,562 | 2,500 |
| All effective examples | 12,528 | 12,466 |
| All explicitly selected examples | 5,016 | 5,238 |
| All omitted examples | 1,186 | 1,248 |
| Records without effective examples | 942 | 952 |
| Original-content snapshots | 1,991 | 2,040 |
| Exact meanings | 14,688 | 14,687 |
| Reviewed equivalent/construction meanings | 2,524 | 2,525 |

**The N3 example queue is complete.** All **1,610 records that originally had examples** have explicit decisions; the other **70 members** have empty original and pre-review example arrays, verified individually without inventing sentences. N3 retains **2,500 effective examples and 271 reviewed nonliteral forms**, with no pending example-bearing records. N5/N4 completed queues remain at **677/634 decisions**, **13/nine pre-existing empty members** and **1,154/978 effective examples**. This completes contextual example accounting and does not certify JLPT curriculum placement or authorize learner publication.

All **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections and four phrase attestations** remain. The unchanged **17,218 meanings** comprise **14,687 exact**, **2,525 reviewed equivalent/construction strings** and **six separately attested N2 phrase meanings**. No dictionary/construction flag reopens. Global nonliteral signals remain **2,193**, including valid reviewed forms; they are not an error count.

N2 retains **104 existing example decisions**, with **1,553 example-bearing records and 2,887 sentences pending**. Prioritize its **397 pending nonliteral-match records and their companion sentences (765 sentences total)** in bounded cohorts. N1 follows with **2,388 pending records and 4,341 sentences**, then deliberate draft refresh and section 6 verification. This increment does not edit either level's records.

After-5ax source catalog SHA-256: `c0c81c0f3d75a83acc9f93d0eae98729af1d08d38de9b845469913e26f629508`.
After-5ax canonical study SHA-256: `7400d2305434a8a1a3742ad5a1de52eb9aeda4fb261bab7ec710ca4b610aabdb`.
After-5ax review-row SHA-256: `a26d94aba971e28fd4097634640ad2636153dc5ead8cfd77b243979724b68fc2`.

The application retains its earlier immutable Japanese **DRAFT** snapshot. No refresh, publication, application migration or application learner-state write occurs; English publication and the active assessment remain unchanged.

## First N2 nonliteral example cohort (5ay)

The first **150 pending N2 records with nonliteral target matches**, from `021b9026a5` through `621e1a42be`, account for **287 sentences: 212 retained unchanged and 75 omitted**, including their companion sentences. Thirteen records had one original example. The existing strict contract receives **64 in-place extensions and 86 new retain decisions**, preserving every earlier meaning, reason, before-hash and example decision. There are now **5,068 meaning decisions: 1,146 corrected definitions and 3,922 retained**. Existing loaders, validators, compiler, inventory and shared test assertions handle the batch; production logic and schemas are unchanged.

| Review boundary | Result |
| --- | --- |
| Selected numbered senses | Physical filling stays separate from compensating a loss; physical resounding from effects on health/grades; blood/telephone connections from the selected connection senses; insect biting from stabbing; recalling memories from revival; restraining laughter from endurance; sampling from adoption/picking; physical extension and postponement from prolongation. |
| Grammatical roles and source forms | Imminent-departure greeting お出かけ differs from honorific going-out uses. 裏返し as the inside-out state in wearing clothes does not demonstrate the turning action. Nominal street ends do not demonstrate collision. Malformed particles, unclear passive targets and unresolved reading markers are omitted without repair. |
| Translation propositions | Sailing adds navigation to floating; being hounded into quitting adds a completed outcome to pressure. Added ownership, participants, gender, recipients or degrees and lost actions, urgency or direction are distinguished. The shared professor-to-colleague mismatch agrees with the earlier whispering omission. |
| Valid forms and complete senses | Declared alternative kanji, mixed script, kana/katakana, long vowels, classical 通ず, the 感ずる continuative, causatives, passives, negatives, productive nominalizations and verb-stem 方 remain. Full selected senses preserve projection 映る and the horse-snort use of 鳴らす; explicit おどかす supports the scaring examples. |
| Contextual imagery | Parent-support gnawing, chest-swelling hope, bodily collapse comparisons, caressing wind, valid taste proverbs and other natural contextual renderings remain. The clear-water/fish proverb's bare literal English loses its friendship context. An unqualified cement setting-time claim is omitted without a replacement factual assertion. |

Section 5ay consults [FHWA’s concrete setting-time study](https://www.fhwa.dot.gov/publications/research/infrastructure/pavements/pccp/02099/chapt3.cfm), retrieved 2026-10-26, for conservative omission of an unqualified cement setting-time sentence. Mixture and environmental scope matter; the review does not equate cement paste, concrete, setting and full hardening or author a replacement timing claim. Full hash-verified pinned JMdict supplies the parental-support idiom (2092850) and clear-water/fish proverb (2839235): the former supports retention of the gnawing image, while the latter identifies friendship context missing from the bare literal English. These are contextual checks, not new dictionary links or phrase attestations. No source prose, image, exercise, replacement sentence, translation, reading or furigana is imported or authored. The three pinned phrase-evidence sources remain unchanged.

**Only example arrays on 59 records change.** Sixteen lose both sentences and four lose their sole sentence. Complete originals survive in **2,093 original-content snapshots**, 53 more than before. Every earlier snapshot remains structurally identical, and retained examples remain full original objects in original order. Definitions, IDs, readings, spellings, levels, dictionary evidence, source membership, canonical mappings and level decisions compare identically across all **10,307 source records**. Examples remain undisplayed in practice.

| Inventory measure | Before 5ay | After 5ay |
| --- | ---: | ---: |
| N2 explicit example decisions | 104 | 254 |
| N2 pending example-bearing records | 1,553 | 1,403 |
| N2 pending sentences | 2,887 | 2,600 |
| N2 pending nonliteral-match records | 397 | 247 |
| N2 pending nonliteral cohort and companion sentences | 765 | 478 |
| N2 effective examples | 3,074 | 2,999 |
| All effective examples | 12,466 | 12,391 |
| All explicitly selected examples | 5,238 | 5,450 |
| All omitted examples | 1,248 | 1,323 |
| Records without effective examples | 952 | 972 |
| Original-content snapshots | 2,040 | 2,093 |
| Global nonliteral target signals | 2,193 | 2,125 |

The cohort retains **175 valid nonliteral matches** and omits 68 such sentences. Nonliteral signals include valid reviewed forms and are not an error count. N5/N4/N3 remain complete at **677/634/1,610 explicit example decisions**, **13/nine/70 pre-existing empty members** and **1,154/978/2,500 effective examples**. N1 remains unchanged with **2,388 pending records and 4,341 sentences**.

All **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections and four phrase attestations** remain. The unchanged **17,218 meanings** comprise **14,687 exact**, **2,525 reviewed equivalent/construction strings** and **six separately attested N2 phrase meanings**. No dictionary/construction flag reopens.

After-5ay source catalog SHA-256: `56a9f1d61ec58e48865794a0a4245012e7335920bc8ee7488f9261f7c768d54e`.
After-5ay canonical study SHA-256: `6faa51312476b56ef86c98b123e28abb91249ac816f50602f154273a1f2b73cd`.
After-5ay review-row SHA-256: `1bc3a333b8a8f86fac353a254cbd956041e13cd34b7271b377d44f23e357b915`.

The application retains its earlier immutable Japanese **DRAFT** snapshot. No refresh, publication, application migration or application learner-state write occurs; English publication and the active assessment remain unchanged.

## Second N2 nonliteral example cohort (5az)

The next **150 pending N2 records with nonliteral target matches**, from `62b886bb5d` through `bda2894093`, account for **289 sentences: 228 retained unchanged and 61 omitted**, including companion sentences. Eleven records had one original sentence. The existing strict contract receives **60 in-place extensions and 90 new retain decisions**, preserving every earlier meaning, reason, before-hash and example decision. There are now **5,158 meaning decisions: 1,146 corrected definitions and 4,012 retained**. Existing loaders, validators, compiler, inventory and shared test assertions handle the batch; production logic and schemas are unchanged.

The unchanged **soft** wording on 軟らかい explicitly selects eligible **1605630 sense 2**, whose full context includes gentle/mild/soft/mellow, for the gentle wind example. Tender and limp keep physical softness sense 1 for the bed. The selected gloss remains exact, all definition strings stay unchanged and no earlier citation is replaced. Full dictionary context, rather than the first automatic match alone, supports the two example citations.

| Review boundary | Result |
| --- | --- |
| Separate numbered senses | Food preparation differs from manufacturing; weapon aiming from designs on property; dietary imbalance from physical inclination/prejudice; narrowing main points from juice extraction; seasonal recurrence from circular movement; motor reflexes from stupidity/sluggishness; experience acquisition and ship loading from stacking; barge-in from diving; order-taking from hearing/knowing; finger trapping from insertion; excuse/debt creation from physical making; and publication from boarding or placement. |
| Word identity and grammatical role | Karekore is not arekore. A question about waiting does not demonstrate the completed apology formula. Mirror reflection does not establish photographed/projected 写る. Emotional 塞ぐ and a voice use of 澄む do not demonstrate the selected physical meanings. The two 混じる/交じる associations make the same tense decision. |
| Translation propositions | Insisting differs from thinking. Added gender, groups, relationships, ownership, degrees and accident/body-part specificity are distinguished. Crashing or cracking does not clearly preserve breaking into pieces; intent alone loses an already performed drilling action. An added diving procedure is omitted without a replacement instruction. Ordinary actor-linked personal articles and conventional reciprocal/contextual renderings remain where the utterance supplies that context. |
| Retained full senses and forms | Bringing near, adding oil, harsh voice, exchanging value, opinion investigation, liquid/mixing and selected historical-origin senses remain. Mixed script, independently eligible spellings, explicit doku readings, causatives, passives, negatives, potential forms, -ge manner forms and conventional speech constructions stay. The family uncle examples remain on 伯父さん and are omitted from 小父さん's old-man/mister sense. |
| Context and imagery | Dry hands, sucking to the bone, piper authority, love-to-hate, rainy-day saving, wholesaler refusal, conspicuous absence, colloquial bodily cold and bucket-rain imagery remain. The unqualified agricultural-surplus and sand-spawning examples need context. The seawater and tiger-lily examples retain their ordinary supported scope. |

Section 5az consults [NOAA’s salmon life-cycle account](https://www.fisheries.noaa.gov/west-coast/sustainable-fisheries/salmon-life-cycle-and-seasonal-fishery-planning), [NOAA’s seawater account](https://oceanservice.noaa.gov/facts/drinksw.html), [Kew’s Lilium lancifolium record](https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:537628-1), [Shueisha’s sucking-to-the-bone idiom](https://imidas.jp/idiom/detail/X-05-X-30-5-0004.html) and [JLogos’s dry-hands dictionary entry](https://jlogos.com/ausp/word.html?id=5351047), retrieved 2026-10-26. These checks inform conservative omission of an unqualified sand-spawning sentence and retention of ordinary seawater saltiness, tiger-lily family membership and the two contextual idioms. They do not assert that all sediment mixtures are identical or import a medical procedure. Full hash-verified pinned JMdict confirms the wholesaler-refusal idiom (2124980) and chest-burning longing idiom (2402720); the latter example is still omitted because its English adds male gender. No dictionary link, phrase attestation, source prose, image, exercise, replacement sentence, translation, reading or furigana is added. The three pinned phrase-evidence sources remain unchanged.

**Only example arrays on 48 records change.** Thirteen lose both sentences; 存ずる loses its sole sentence. Complete originals survive in **2,137 original-content snapshots**, 44 more than before. Every earlier snapshot remains structurally identical, and retained examples remain full original objects in original order. Definitions, IDs, readings, spellings, levels, dictionary evidence, source membership, canonical mappings and level decisions compare identically across all **10,307 source records**. Examples remain undisplayed in practice.

| Inventory measure | Before 5az | After 5az |
| --- | ---: | ---: |
| N2 explicit example decisions | 254 | 404 |
| N2 pending example-bearing records | 1,403 | 1,253 |
| N2 pending sentences | 2,600 | 2,311 |
| N2 pending nonliteral-match records | 247 | 97 |
| N2 pending nonliteral cohort and companion sentences | 478 | 189 |
| N2 effective examples | 2,999 | 2,938 |
| All effective examples | 12,391 | 12,330 |
| All explicitly selected examples | 5,450 | 5,678 |
| All omitted examples | 1,323 | 1,384 |
| Records without effective examples | 972 | 986 |
| Original-content snapshots | 2,093 | 2,137 |
| Global nonliteral target signals | 2,125 | 2,069 |

The cohort retains **195 valid nonliteral matches** and omits 56 such sentences. Nonliteral signals include valid reviewed forms and are not an error count. N5/N4/N3 remain complete at **677/634/1,610 explicit example decisions**, **13/nine/70 pre-existing empty members** and **1,154/978/2,500 effective examples**. N1 remains unchanged with **2,388 pending records and 4,341 sentences**.

All **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections and four phrase attestations** remain. The unchanged **17,218 meanings** comprise **14,687 exact**, **2,525 reviewed equivalent/construction strings** and **six separately attested N2 phrase meanings**. No dictionary/construction flag reopens.

After-5az source catalog SHA-256: `c4faa53838b44faada0889381efc4cdfc12b2695bbb59e72e0717e13fb5460b4`.
After-5az canonical study SHA-256: `02c7e30a9437245adb8d8ebd4480926f1dda046653e84feebe4cf9f236afea35`.
After-5az review-row SHA-256: `ea873fdf19b6b04a0854d3358eddacacf4d27ed737f90ee67b7a098ed2560a1a`.

The application retains its earlier immutable Japanese **DRAFT** snapshot. No refresh, publication, application migration or application learner-state write occurs; English publication and the active assessment remain unchanged.

## Final N2 nonliteral example cohort (5ba)

The final **97 pending N2 records with nonliteral target matches**, from `bef1949982` through `ff3e20c269`, account for **189 sentences: 137 retained unchanged and 52 omitted**, including companion sentences. Five records had one original sentence each. The existing strict contract receives **43 in-place extensions and 54 new retain decisions**, preserving every earlier meaning, reason, before-hash and example decision. There are now **5,212 meaning decisions: 1,146 corrected definitions and 4,066 retained**. Existing loaders, validators, compiler, inventory and shared test assertions handle the batch; production logic and schemas are unchanged.

| Review boundary | Result |
| --- | --- |
| Readings and grammatical words | Explicit daibu does not demonstrate primary daibun, although both are valid pinned readings. Attributive Internet-naru-mono differs from the fruit-bearing verb. The speaker-directed auxiliary よこす differs from its selected independent sending/handing-over senses. An unresolved apple-sentence reading marker is omitted without invented furigana. |
| Separate numbered senses | Deal thwarting differs from smashing; plan failure from physical collapse/bankruptcy; totaling or river travel from general climbing; disease prevalence from popularity; conveyed arguments from physical transmission; drink accompaniment from dating; habituation from animal tameness; hurried action from confusion; solar descent from physical slant; machine from instrument; regret from mourning; propping/pricking from poking; postponement or duration from physical extension; surpassing from crossing; conversation jumps from physical jumps; and electric shock from limb numbness. |
| Translation propositions and context | Added recipients, gender, locations, exclusions and a grandmother's seeing action remain distinct from their source propositions. Drawers narrow a desk-interior search, a loan becomes generic money, and present/past or ongoing/completed framing changes are omitted. The food example loses its fussy attitude. Unqualified national receptivity, exact demographic and physical-timing/ease claims need context. |
| Retained forms and full senses | Mixed script, independently eligible spellings, inflections, potential/negative/passive forms, productive compounds, exact counts, inclusive five-book limits, actor-linked personal articles, ordinary first-person symptom/feeling/custody contexts and literary author-as-works topics remain. The command verb retains both classical and modern passive forms. Selected relationship sense 1 includes dating, and selected print sense 2 supports both newspaper examples. |
| Imagery and shared associations | The yielding-to-the-stronger proverb, clock winding, fish-eye glare, homesickness, no-sweat sporting victory, tears accumulating and physical waves retain their contextual meanings. Shared tripping/ankle, clear-water/voice and oil-water examples agree with earlier decisions. Reading a natural contextual translation does not require inventing a new sentence or dictionary meaning. |

Section 5ba consults [the US Forest Service wood-fire chapter](https://research.fs.usda.gov/download/treesearch/62268.pdf), [Census age-estimate context](https://www.census.gov/newsroom/press-releases/2025/older-adults-outnumber-children.html), [Iowa State cut-flower context](https://yardandgarden.extension.iastate.edu/how-to/how-care-cut-flowers), [FAO hunger context](https://www.fao.org/hunger/en/) and [NOAA light/sound context](https://www.nssl.noaa.gov/education/svrwx101/lightning/), retrieved 2026-10-26. They inform conservative omission of unqualified building-ignition ease, an undated exact population percentage and prompt post-cut wilting, and retention of the ordinary global-hunger and light-faster-than-sound examples. Material combustibility, ignition conditions and assembly fire resistance are distinct; the Census 65-and-older category is not silently substituted for the source's over-65 boundary. No replacement percentage, fire rating, flower timing, emergency instruction or care procedure is supplied. Full hash-verified pinned JMdict confirms the yielding-to-the-stronger proverb (2833938/2833939) and both daibu/daibun readings (1414920); explicit daibu examples do not demonstrate this card's primary daibun reading. No dictionary link, phrase attestation, source prose, image, exercise, replacement sentence, translation, reading or furigana is added. The three pinned phrase-evidence sources remain unchanged.

**Only example arrays on 43 records change.** Nine records lose both sentences; all five single-sentence records retain their example. Complete originals survive in **2,174 original-content snapshots**, 37 more than before. Every earlier snapshot remains structurally identical, and retained examples remain full original objects in original order. Definitions, IDs, readings, spellings, levels, dictionary evidence, source membership, canonical mappings and level decisions compare identically across all **10,307 source records**. Examples remain undisplayed in practice.

| Inventory measure | Before 5ba | After 5ba |
| --- | ---: | ---: |
| N2 explicit example decisions | 404 | 501 |
| N2 pending example-bearing records | 1,253 | 1,156 |
| N2 pending sentences | 2,311 | 2,122 |
| N2 pending nonliteral-match records | 97 | 0 |
| N2 pending nonliteral cohort and companion sentences | 189 | 0 |
| N2 effective examples | 2,938 | 2,886 |
| All effective examples | 12,330 | 12,278 |
| All explicitly selected examples | 5,678 | 5,815 |
| All omitted examples | 1,384 | 1,436 |
| Records without effective examples | 986 | 995 |
| Original-content snapshots | 2,137 | 2,174 |
| Global nonliteral target signals | 2,069 | 2,029 |

The cohort retains **121 valid nonliteral matches** and omits 40 such sentences. **All N2 nonliteral-match records now have explicit decisions**, retaining **544 reviewed valid nonliteral examples**. The remaining **1,156 N2 example-bearing records have 2,122 literal-match sentences**; literal matching does not establish sense compatibility or teaching suitability, so this queue remains open. N5/N4/N3 stay complete at **677/634/1,610 explicit example decisions**, **13/nine/70 pre-existing empty members** and **1,154/978/2,500 effective examples**. N1 remains unchanged with **2,388 pending records and 4,341 sentences**.

All **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections and four phrase attestations** remain. The unchanged **17,218 meanings** comprise **14,687 exact**, **2,525 reviewed equivalent/construction strings** and **six separately attested N2 phrase meanings**. No dictionary/construction flag reopens. Nonliteral signals include valid reviewed forms and are not an error count.

After-5ba source catalog SHA-256: `40899c3817d5043cb7249c5351f3a236c2dfc7c886cd702456e64292883b8d9c`.
After-5ba canonical study SHA-256: `7646300c14ebb7bc3ee71bd16c0519f7506d944f737ca6284c5fd3274be6b3a6`.
After-5ba review-row SHA-256: `7ef1cd0c3f9a71bf612b46d6b9a51cab5b583cd100a9ac7a4f81f320c07d4b43`.

The application retains its earlier immutable Japanese **DRAFT** snapshot. No refresh, publication, application migration or application learner-state write occurs; English publication and the active assessment remain unchanged.

## First remaining N2 literal example cohort (5bb)

The first **150 remaining N2 records**, from `0011c40f28` through `217b09bf11`, account for **277 sentences: 230 retained unchanged and 47 omitted**. All had literal target matches; 23 records had one original sentence. The existing strict contract receives **53 in-place extensions and 97 new retain decisions**, preserving every earlier meaning, reason, before-hash and example decision. There are now **5,309 meaning decisions: 1,146 corrected definitions and 4,163 retained**. Existing loaders, validators, compiler, inventory and shared test assertions handle the batch; production logic and schemas are unchanged.

| Review boundary | Result |
| --- | --- |
| Readings, roles and numbered senses | Temporal 目下・もっか differs from primary subordinate めした. Verbal identification 特定 differs from the selected specific adjective; gangsters from a collective gang; sound quality from echo/physical sound; calming まあまあ from so-so; and setting-aside ともかく from anyhow. The noun 割合 plus に does not demonstrate the fixed comparatively adverb わりあいに. |
| Translation propositions | Added groups, gender, ownership, locations, directions, methods, garment types and degrees remain distinct. A loan of pencil leads differs from receiving them; date alone loses an explicit date/time anchor; great difficulty differs from impossibility; completed past events differ from present or schedule-like source wording. Tom's own pace does not by itself preserve his separate carefree characterization. |
| Source quality and context | The unusual 実施見学 wording and unresolved reading marker are omitted without repair. Broad building/material, ecological, raw-material, geometric, occupational and electrical claims need scope. The dissolution example needs institution/authority precision. No replacement factual statement, safety instruction or legal procedure is authored. |
| Retained full senses and ordinary context | Chemical/medicine and physical/person-vanishing senses have separate citations; fictional or unspecified symptom, contract, company, market and forecast contexts remain without becoming current advice. Valid inflections, historical kouta past forms, compounds, unnumbered nouns, actor-linked personal references, institutional announcements, literary/figurative readings, exact counts, approximate ages and inclusive limits remain. The full ring-finger gloss permits third finger. |
| Shared-sentence consistency | Both しょうがない sentences agree with earlier register/proposition omissions. Knitting, accurate-response, sheets and sleepwear examples agree with prior retained associations. The genuine/real omission on 本当 and the exposure omission on 当てる concern those cards' selected senses, so their otherwise compatible companion associations can remain. |

Section 5bb consults [Network Rail track-safety context](https://safety.networkrail.co.uk/wp-content/uploads/2025/05/5059_Trespass_Toolkit_DV2.pdf), [the Imperial Household Agency account of constitutional roles](https://www.kunaicho.go.jp/en/learn/institution/seido/seido01.html), [HSE electrical-injury context](https://www.hse.gov.uk/electricity/injuries.htm), [USGS drainage-basin context](https://www.usgs.gov/water-science-school/science/watersheds-and-drainage-basins) and [USGS forest-resilience research](https://www.usgs.gov/publications/mechanisms-forest-resilience), retrieved 2026-10-26. They inform conservative handling of unqualified track-crossing necessity, whole-Diet dissolution, standalone electrical reassurance, basin categories and ecological universals. The earlier USFS wood-fire context also applies to the unqualified Japanese-house claim. HSE's account does not establish that touching a 1.5V cell is lethal; no contrary hazard claim, replacement safety instruction, legal procedure or technical specification is supplied. [CDC cold-transmission context](https://www.cdc.gov/common-cold/about/index.html), [NASA Moon facts](https://science.nasa.gov/moon/facts/), [RSC copper context](https://periodic-table.rsc.org/element/29/copper), [MAFF grain-food context](https://www.maff.go.jp/e/policies/market/dento_syoku/bunrui/kokurui.html) and [JNTO New-Year context](https://faq.japan-travel.jnto.go.jp/en/japan-magazine/1812_newyear/) support the retained ordinary cold, surface-gravity, copper/traditional-bronze, noodle and qualified shrine-visit contexts. No allergy guarantee, universal alloy recipe, coordinate or numerical correction is imported. Full hash-verified pinned JMdict confirms kamameshi's cooking-pot context (1690800), the separately lexicalized rear-end idiom (2168840), and the distinct 実施/実地 entries (1321140/1321380). These checks add no dictionary link, phrase attestation, replacement sentence, translation, reading or furigana. The three pinned phrase-evidence sources remain unchanged.

**Only example arrays on 44 records change.** Three records lose both sentences. 悠々, 煙い and わりあいに lose their sole sentence; the other 20 single-sentence records retain theirs. Complete originals survive in **2,208 original-content snapshots**, 34 more than before. Every earlier snapshot remains structurally identical, and retained examples remain full original objects in original order. Definitions, IDs, readings, spellings, levels, dictionary evidence, source membership, canonical mappings and level decisions compare identically across all **10,307 source records**. Examples remain undisplayed in practice.

| Inventory measure | Before 5bb | After 5bb |
| --- | ---: | ---: |
| N2 explicit example decisions | 501 | 651 |
| N2 pending example-bearing records | 1,156 | 1,006 |
| N2 pending sentences | 2,122 | 1,845 |
| N2 pending nonliteral-match records | 0 | 0 |
| N2 reviewed valid nonliteral examples | 544 | 544 |
| N2 effective examples | 2,886 | 2,839 |
| All effective examples | 12,278 | 12,231 |
| All explicitly selected examples | 5,815 | 6,045 |
| All omitted examples | 1,436 | 1,483 |
| Records without effective examples | 995 | 1,001 |
| Original-content snapshots | 2,174 | 2,208 |
| Global nonliteral target signals | 2,029 | 2,029 |

The remaining **1,006 N2 example-bearing records have 1,845 literal-match sentences**. Literal matching does not establish sense compatibility or teaching suitability, so this queue remains open. All **544 reviewed valid N2 nonliteral examples** remain. N5/N4/N3 stay complete at **677/634/1,610 explicit example decisions**, **13/nine/70 pre-existing empty members** and **1,154/978/2,500 effective examples**. N1 remains unchanged with **2,388 pending records and 4,341 sentences**.

All **10,291 units, 10,307 source members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections and four phrase attestations** remain. The unchanged **17,218 meanings** comprise **14,687 exact**, **2,525 reviewed equivalent/construction strings** and **six separately attested N2 phrase meanings**. No dictionary/construction flag reopens. Nonliteral signals include valid reviewed forms and are not an error count.

After-5bb source catalog SHA-256: `9a68acce645ac1c43a76a248c146a7cc4e6ea1df239f6a8ee565a9b1df8df9f0`.
After-5bb canonical study SHA-256: `2a4120ce5ac6f2d70eb0eb8adf163cd31af7046cbd5a1e85220858efab20088d`.
After-5bb review-row SHA-256: `b1272dad6eabc36ceaffd3b8247cda8f70b76a5492d13408a111cedb698a71e2`.

The application retains its earlier immutable Japanese **DRAFT** snapshot. No refresh, publication, application migration or application learner-state write occurs; English publication and the active assessment remain unchanged.

## Second remaining N2 dictionary-backed literal example cohort (5bc)

The next **150 dictionary-backed N2 records**, from `21e0ebdfb3` through `415ca8e1aa`, account for **265 sentences: 218 retained unchanged and 47 omitted**. The existing strict contract receives **40 in-place extensions and 110 new retain decisions**, preserving every earlier meaning, reason, before-hash and example decision. There are now **5,419 meaning decisions: 1,146 corrected definitions and 4,273 retained**. Existing loaders, validators, compiler, inventory and shared test assertions handle this data/test increment; production logic and schemas are unchanged.

| Review distinction | Outcome |
| --- | --- |
| Separately numbered senses | Altitude and advanced skill, occupancy capacity, internal-medicine department, numerical digits, physical breaking, computer and booklet programs, and bodily posture retain explicit selected citations. Police-raid 手入れ, disadvantage マイナス, ominous-weather 怪しい and figurative heart-crushing 砕く do not broaden the selected definitions. Explanatory 何分 differs from its selected quantity meaning. |
| Propositions and source quality | Forming drops differs from moisture seeping in; new information from more information; an elbow injury from a named diagnosis; a city centre from its metropolitan area; outsiders from foreigners; servants from apprentices; a proposal from an individual assertion; and limited importance from no difference. Missing participants, added identity/insult, changed time relations, a malformed connector and unresolved reading placeholders are omitted without silent repair. The 都心 sentence agrees with its earlier 商売 omission. |
| Valid forms and context | Kana roasting, the declared やたらに derivation, self-study dialogue, ordinary group/kinship references, conventional proverbs, compound roots, directions, accommodation doubles, the Japanese syllabary, waterfall imagery, noun-modifying adverbs and religious viewpoints remain. Examples about unspecified health experiences, an individual measurement or an addressed suggestion do not become clinical interpretation or general recommendations. |
| Scope | Unscoped gender, botanical, taxonomic and parcel-policy assertions are omitted without authoring an opposite claim. The seal-essential statement is explicitly scoped to the speakers’ own life; it is not a universal legal requirement. No date-specific Derby schedule, currency-based salary promise, global climate claim, exclusive samba ancestry or sole-inventor art-history claim is added. |

Section 5bc consults [Japan’s Ministry of Foreign Affairs WHO profile](https://www.mofa.go.jp/mofaj/files/100387113.pdf) for the official 世界保健機関 spelling; the source example using 機構 is omitted without repair. [The Metropolitan Museum’s Giotto account](https://www.metmuseum.org/essays/italian-painting-of-the-later-middle-ages) supports the retained precursor/contribution framing without claiming sole invention of the Renaissance. The indexed [UNESCO Samba de Roda account](https://ich.unesco.org/en/RL/samba-de-roda-of-reconcavo-of-bahia-00101) supplies Brazilian musical context without asserting exclusive ancestry. The indexed [Cambridge adverb-phrase discussion](https://dictionary.cambridge.org/us/grammar/british-grammar/adverb-phrases) supports noun-modification functions; retaining the broad adjectival-function example is a contextual inference, not a claim that an adverb changes its word class. Retrieved or consulted through indexed text on 2026-10-26; UNESCO’s direct page returned a verification screen and Cambridge’s direct page was unavailable. No source prose, image, exercise, replacement sentence, translation, reading, furigana, clinical advice or new source attestation is imported. The three pinned phrase-evidence sources remain unchanged.

**Only example arrays on 40 records change.** Seven two-sentence records lose both examples; seven single-sentence records lose theirs. Complete originals survive in **2,247 original-content snapshots**, 39 more than before. Every earlier snapshot remains identical, and retained examples remain complete original objects in original order. Definitions, identities, readings, spellings, levels, dictionary evidence, source membership, canonical mappings and level decisions compare identically across all **10,307 source records**. Examples remain undisplayed in practice.

| Inventory measure | Before 5bc | After 5bc |
| --- | ---: | ---: |
| N2 explicit example decisions | 651 | 801 |
| N2 pending example-bearing records | 1,006 | 856 |
| N2 pending sentences | 1,845 | 1,580 |
| N2 pending nonliteral-match records | 0 | 0 |
| N2 reviewed valid nonliteral examples | 544 | 544 |
| N2 effective examples | 2,839 | 2,792 |
| All effective examples | 12,231 | 12,184 |
| All explicitly selected examples | 6,045 | 6,263 |
| All omitted examples | 1,483 | 1,530 |
| Records without effective examples | 1,001 | 1,015 |
| Original-content snapshots | 2,208 | 2,247 |
| Global nonliteral target signals | 2,029 | 2,029 |

The remaining **856 N2 records and 1,580 sentences** comprise **854 dictionary-backed records/1,578 sentences** plus the one-sentence phrases **お待ちください (`321ba5716a`) and ご存じですか (`feb110fb03`)**. お待ちください occurs inside this ID range and remains intact rather than receiving an invented dictionary sense; the next eligible dictionary-backed record completes the 150-record cohort. The phrase-backed examples require distinct evidence-aware accounting after the dictionary-backed cohorts. Their phrase meaning evidence stays valid, and they remain in the pending total. No N2 example completion is claimed.

N5/N4/N3 remain complete at **677/634/1,610 decisions**, **13/nine/70 pre-existing empty members** and **1,154/978/2,500 effective examples**. N1 stays unchanged at **2,388 pending records and 4,341 sentences**. All **10,291 units, 10,307 members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections, four phrase attestations and three pinned phrase-evidence files** remain. The unchanged **17,218 meanings** comprise **14,687 exact**, **2,525 reviewed equivalent/construction strings** and **six separately attested N2 phrase meanings**. No dictionary/construction meaning flag reopens.

After-5bc source catalog SHA-256: `90d651ff144bf994115639aa43aae95147aa4185b51f101ace7bef2d1bd2866c`.
After-5bc canonical study SHA-256: `fc9f422d67f8adabda3f7f2839f997ce3f270b78451cc587c61ef62453f6bab9`.
After-5bc review-row SHA-256: `f3b22ffa8dbb2ed6f4bf755e50c2cfc66dd6a70d14d2456e76872b27f489857b`.

## Third remaining N2 dictionary-backed literal example cohort (5bd)

The next **150 dictionary-backed N2 records**, from `421f9be199` through `5ea19069bc`, account for **277 sentences: 224 retained unchanged and 53 omitted**. The existing strict contract receives **50 in-place extensions and 100 new retain decisions**, preserving every earlier meaning, reason, before-hash and example decision. There are now **5,519 meaning decisions: 1,146 corrected definitions and 4,373 retained**. Existing loaders, validators, compiler, inventory and shared test assertions handle this data/test increment; production logic and schemas are unchanged.

| Review distinction | Outcome |
| --- | --- |
| Contextual sense selection | The unchanged stage wording explicitly cites eligible platform sense 1 as a reviewed equivalent of stage (platform), rather than automatic exact level sense 4; performance retains exact sense 2. Both singing-on-stage examples remain. This moves one meaning from automatic exact matching to explicit equivalence without changing its text. |
| Separate senses, readings and words | Omission differs from abbreviation; toothpaste from tooth-brushing; honest/frank from obedient/meek; bodily/chemical properties from temperament; and a surgical department from a procedure. Actual-feeling noun 実感 differs from its separately numbered suru-experience sense. At-least adverb せめて differs from the selected attack noun; ななめ does not establish はす. The navel idioms do not clearly demonstrate the selected literal body-part sense in English. |
| Translation and source scope | Added nationality, gender, recipients, body parts, garment/entrance types and defamatory implications are omitted, together with changed time/aspect, missing eruption context, reduced grade/age distinctions, unresolved reading markers and overbroad exclusivity. The shared skiing-fracture and ocean-count omissions agree with earlier reviews. The boat-process and experienced-father sentences remain: their earlier omissions concerned different selected senses on ボート and 道, not these propositions. |
| Retained contexts | Conventional idioms and proverbs, the full oval and immediate-danger glosses, heavily downcast emotion, personal essentials, youngest-as-baby wording, writing/contact courtesies and garment metonyms, platform-stage performances, meaningful kana compounds, radio noise and natural bodily references remain. Existing quantities and durations are preserved without creating current prices, tariffs, clinical findings or schedules. |

Section 5bd consults [UK Parliament’s union chronology](https://www.parliament.uk/about/living-heritage/evolutionofparliament/legislativescrutiny/act-of-union-1707/overview/the-articles-constitution-and-trade/) to distinguish the 1706 treaty from the 1707 union, and [NOAA’s ocean-naming account](https://oceanservice.noaa.gov/facts/howmanyoceans.html) for the historical four-name classification versus widespread five-name recognition. [OpenStax’s induction account](https://openstax.org/books/university-physics-volume-2/pages/13-1-faradays-law), [Harvard’s additive-colour demonstration](https://sciencedemonstrations.fas.harvard.edu/presentations/color-mixing), [RSC’s emulsion context](https://edu.rsc.org/resources/making-an-oil-water-emulsion/1872.article), the indexed [mungbean desiccation study](https://pmc.ncbi.nlm.nih.gov/articles/PMC5174128/) and [Ford’s 2022 European Mustang specifications](https://media.ford.com/content/dam/fordmedia/Europe/documents/en/2022/2022_Mustang_Tech_Spec_EU.pdf) inform conservative handling of unqualified current-flow, primary-colour, oil/water, continuous seed-metabolism and American-car steering claims. Ford identifies both drive layouts and US assembly for that historical model; this is market context rather than a current-product specification. [OpenStax’s ordinary real-number arithmetic](https://openstax.org/books/intermediate-algebra/pages/1-5-properties-of-real-numbers), [NIH’s vitamin-C food context](https://ods.od.nih.gov/factsheets/VitaminC-HealthProfessional/) and [RSC’s hydrogen account](https://periodic-table.rsc.org/element/1/hydrogen) support retained division-by-zero, orange/vitamin and hydrogen/atomic-number contexts. Consulted 2026-10-26; the mungbean paper’s direct page returned browser verification, so its indexed research text supplies that limited context. No source prose, experiment, recipe, procedure, clinical interpretation, product specification, replacement sentence, translation, reading or furigana is imported. The three pinned phrase-evidence files remain unchanged.

**Only example arrays on 43 records change.** Ten two-sentence records lose both examples and four single-sentence records lose theirs; the other 19 single-sentence records retain theirs. Complete originals survive in **2,287 original-content snapshots**, 40 more than before. Every earlier snapshot remains identical, and retained examples remain complete original objects in original order. Definitions, identities, readings, spellings, levels, dictionary evidence, source membership, canonical mappings and level decisions compare identically across all **10,307 source records**. Examples remain undisplayed in practice.

| Inventory measure | Before 5bd | After 5bd |
| --- | ---: | ---: |
| N2 explicit example decisions | 801 | 951 |
| N2 pending example-bearing records | 856 | 706 |
| N2 pending sentences | 1,580 | 1,303 |
| N2 pending nonliteral-match records | 0 | 0 |
| N2 reviewed valid nonliteral examples | 544 | 544 |
| N2 effective examples | 2,792 | 2,739 |
| All effective examples | 12,184 | 12,131 |
| All explicitly selected examples | 6,263 | 6,487 |
| All omitted examples | 1,530 | 1,583 |
| Records without effective examples | 1,015 | 1,029 |
| Original-content snapshots | 2,247 | 2,287 |
| Exact eligible meaning matches | 14,687 | 14,686 |
| Reviewed equivalent/construction meanings | 2,525 | 2,526 |
| Global nonliteral target signals | 2,029 | 2,029 |

The remaining **706 N2 records and 1,303 sentences** comprise **704 dictionary-backed records/1,301 sentences** plus the one-sentence phrases **お待ちください (`321ba5716a`) and ご存じですか (`feb110fb03`)**. Their existing phrase evidence stays intact and requires separate evidence-aware example accounting after the dictionary-backed cohorts. No N2 example completion is claimed. N5/N4/N3 stay complete at **677/634/1,610 decisions**, **13/nine/70 pre-existing empty members** and **1,154/978/2,500 effective examples**. N1 remains unchanged at **2,388 pending records and 4,341 sentences**.

All **10,291 units, 10,307 members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections, four phrase attestations and three pinned phrase-evidence files** remain. The unchanged **17,218 meanings** comprise **14,686 exact**, **2,526 reviewed equivalent/construction strings** and **six separately attested N2 phrase meanings**. No dictionary/construction meaning flag reopens.

After-5bd source catalog SHA-256: `47f0ee129f423138eeb9f9c079382a3bad2dc9bb01fae9a249e8901194ec6bab`.
After-5bd canonical study SHA-256: `6658aba86380f0d5a973abbfc6150a4ce0a4296f4fe250c93b988f6fa3c49ac3`.
After-5bd review-row SHA-256: `a98aa5593ed7dcf4c9ea549b895a4ae34dc0562d728aa514929fbb8d42a2d56f`.

## Fourth remaining N2 dictionary-backed literal example cohort (5be)

The next **150 dictionary-backed N2 records**, from `5f1431a28b` through `841aaee779`, account for **278 sentences: 235 retained unchanged and 43 omitted**. The existing strict contract receives **50 in-place extensions and 100 new retain decisions**, preserving every earlier meaning, reason, before-hash and example decision. There are now **5,619 meaning decisions: 1,146 corrected definitions and 4,473 retained**. Existing loaders, validators, compiler, inventory and shared test assertions handle this data/test increment; production logic and schemas are unchanged.

| Review distinction | Outcome |
| --- | --- |
| Separate numbered senses | Headword differs from heading/index; perfect fit and sudden stopping from tightness; insurance cover from a physical wrapper; byword from grammatical pronoun; eye from anatomical pupil; physical dots from a distribution adverb; originally from intrinsically; and pimples from grumbling. Taking on a problem does not use the selected assault sense. Existing definitions are not broadened to make examples fit. |
| Source and translation | Mental/moral development, catching up/overtaking, halfway/between, difference/holiday surcharge, late at night/last night, completed/ongoing entry, an upside-down turn/hanging, a cupboard top/top shelf and a return/any meeting retain their distinctions. Added recipients, objects, gender and missing specific train/essay context are omitted, together with malformed passive wording and unresolved readings. |
| Shared-sentence consistency | The general subject-and-verb sentence lacks the same language/analysis context identified in the earlier 動詞 review. The stage-light sentence has the same passive-subject problem recorded on 照らす. The catching-up/overtaking mismatch agrees with 追い付く. Different-sense omissions on おかけください, レジ and 取る do not invalidate the retained first-of-all, departure-checkout and liquid examples. |
| Retained scope | The full fence/hedge, valley/basin, external-group and water/liquid senses, meaningful compound roots, declared spellings, valid kana inflections, ordinary metonyms, greetings, idioms, proverbs, discourse viewpoints and scoped hypothetical statements remain. Health-related example utterances do not identify real drugs, add diagnostic conclusions or become clinical recommendations. Named constitutional and historical travel contexts receive external checks. |

Section 5be consults [JR Group’s Orange Card sales notice](https://www.jreast.co.jp/press/2012/20121201.pdf), [the Forestry Agency’s forest-coverage account](https://www.rinya.maff.go.jp/e/tayousei/top_en.html) and [OpenStax’s rectangular-solid volume context](https://openstax.org/books/prealgebra/pages/9-6-solve-geometry-applications-volume-and-surface-area) to omit undated conductor sales, almost-no-forest wording and unqualified volume formulas without replacement sentences. The indexed [amniotic-fluid proteomics study](https://pmc.ncbi.nlm.nih.gov/articles/PMC3279107/) documents composition changing through pregnancy; it does not validate seawater equivalence or a pea-to-fingernail treatment claim. Its direct page returned browser verification. [MAFF’s noodle account](https://www.maff.go.jp/e/policies/market/dento_syoku/bunrui/kokurui.html), [Network Rail’s crossing guide](https://www.networkrail.co.uk/wp-content/uploads/2025/09/Footpath-and-bridleway-crossing-user-guide.pdf), [SKF’s grease-life research](https://evolution.skf.com/improved-grease-life-model-for-y-bearings/) and [the Imperial Household Agency’s constitutional account](https://www.kunaicho.go.jp/en/learn/institution/seido/seido01.html) inform the retained noodle, crossing-alarm, lubricant-temperature and State-symbol contexts. Consulted 2026-10-26. No pure-grain/allergy guarantee, universal lubricant formula, current fare, medical diagnosis, nutritional treatment, crossing procedure, source prose, image, exercise, replacement sentence, translation, reading or furigana is imported or authored. The three pinned phrase-evidence files remain unchanged.

**Only example arrays on 39 records change.** Four two-sentence records lose both examples and two single-sentence records lose theirs; the other 20 single-sentence records retain theirs. Complete originals survive in **2,320 original-content snapshots**, 33 more than before. Every earlier snapshot remains identical, and retained examples remain complete original objects in original order. Definitions, identities, readings, spellings, levels, dictionary evidence, source membership, canonical mappings and level decisions compare identically across all **10,307 source records**. Examples remain undisplayed in practice.

| Inventory measure | Before 5be | After 5be |
| --- | ---: | ---: |
| N2 explicit example decisions | 951 | 1,101 |
| N2 pending example-bearing records | 706 | 556 |
| N2 pending sentences | 1,303 | 1,025 |
| N2 pending nonliteral-match records | 0 | 0 |
| N2 reviewed valid nonliteral examples | 544 | 544 |
| N2 effective examples | 2,739 | 2,696 |
| All effective examples | 12,131 | 12,088 |
| All explicitly selected examples | 6,487 | 6,722 |
| All omitted examples | 1,583 | 1,626 |
| Records without effective examples | 1,029 | 1,035 |
| Original-content snapshots | 2,287 | 2,320 |
| Global nonliteral target signals | 2,029 | 2,029 |

The remaining **556 N2 records and 1,025 sentences** comprise **554 dictionary-backed records/1,023 sentences** plus the one-sentence phrases **お待ちください (`321ba5716a`) and ご存じですか (`feb110fb03`)**. Their existing phrase evidence stays intact and requires separate evidence-aware example accounting after the dictionary-backed cohorts. No N2 example completion is claimed. N5/N4/N3 remain complete at **677/634/1,610 decisions**, **13/nine/70 pre-existing empty members** and **1,154/978/2,500 effective examples**. N1 remains unchanged at **2,388 pending records and 4,341 sentences**.

All **10,291 units, 10,307 members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections, four phrase attestations and three pinned phrase-evidence files** remain. The unchanged **17,218 meanings** still comprise **14,686 exact**, **2,526 reviewed equivalent/construction strings** and **six separately attested N2 phrase meanings**. No dictionary/construction meaning flag reopens.

After-5be source catalog SHA-256: `9debda20f680c96f05cdbf4954a8442cc529be3e8bebd87419d7ed1ed7f9b64c`.
After-5be canonical study SHA-256: `b23a90b58ffe84ec939b7879ac437e88cc39f10c8252c5e54745fff0503b80f3`.
After-5be review-row SHA-256: `a8160442ed46fd7cc73a497982da2f6dcfd6ebd9af1717bc54acc0cbb7e9edae`.

## Fifth remaining N2 dictionary-backed literal example cohort (5bf)

The next **150 dictionary-backed N2 records**, from `845ae84d62` through `a7cee32023`, account for **282 sentences: 227 retained unchanged and 55 omitted**. The existing strict contract receives **59 in-place extensions and 91 new retain decisions**, preserving every earlier meaning, reason, before-hash and example decision. There are now **5,710 meaning decisions: 1,146 corrected definitions and 4,564 retained**. Existing loaders, validators, compiler, inventory and shared assertions handle this data/test increment; production logic and schemas are unchanged.

| Review distinction | Outcome |
| --- | --- |
| Lexical identities and selected senses | 吊る differs from 吊るす; summarising differs from physical compression; general arrival from appearing on stage; identity from social status; a metre length from a measuring device; fabrication from creative work; resignation from a concept; and a model person from a sample. The selected めちゃくちゃ senses do not acquire unselected adverb examples. Existing definitions are not broadened. |
| Source and translation | Neutral children do not become boys; subordinates do not acquire an unstated gender; relative eclipse dates lack a reference year; invoice amounts do not illustrate banknotes. Other omissions address changed agents, objects, events and visit groups, malformed English and unresolved reading markers, including 幾世代’s unsuitable source annotation. Originals remain intact rather than being repaired. |
| Shared-sentence consistency | The admission-office omission agrees with the earlier 受付 review. Different selected senses explain why the retained terminus, horizon, first-of-all and by-itself sentences were omitted for 線, 沈む, おかけください or 消える. All exact shared JA/EN pairs with earlier omissions were checked against their original reasons. |
| Retained context | Full assistant/associate-professor and sly/unfair senses, female-cousin orthography with natural English cousin, food waste, declared forms, meaningful compounds, idioms, proverbs, ordinary personal viewpoints, illustrative quantities and historical observations remain. Individual bodily narratives do not establish diagnoses; unqualified medical guarantees are omitted without denying limited research evidence. |

Section 5bf consults [NRAO’s Jansky history](https://rahist.nrao.edu/jansky_bio-memoir.shtml) for the 14.6-metre Galactic-centre observation context, without asserting resolution of a unique compact source. [USGS’s Kīlauea episode-52 account](https://www.usgs.gov/observatories/hvo/news/photo-video-chronology-full-moon-and-lava-fountain-kilauea-summit-episode-52) documents vent flames alongside incandescent lava, supporting the retained volcano scene without equating all glow with combustion. [Merriam-Webster’s garbage entry](https://www.merriam-webster.com/dictionary/garbage) supports the food-waste context. [The Cabinet Office’s holiday calendar](https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html) identifies a Wednesday substitute holiday in 2026, so the unqualified always-Monday rule is omitted. [Mayo Clinic’s urine-colour account](https://www.mayoclinic.org/diseases-conditions/urine-color/symptoms-causes/syc-20367333) and [NHS’s dehydration account](https://www.nhs.uk/conditions/dehydration/) inform omission of colour alone as a dehydration diagnosis. The indexed [Wan et al. cocoa/dark-chocolate trial](https://pubmed.ncbi.nlm.nih.gov/11684527/) reports a defined diet in a small controlled study; that context does not establish an unqualified all-chocolate LDL-oxidation prevention claim. Consulted 2026-10-26. These sources inform contextual decisions only. No source prose, diagnosis, treatment, dose, recipe, numerical health guidance, replacement sentence, translation, reading or furigana is imported or authored. The three pinned phrase-evidence files remain unchanged.

**Only example arrays on 49 records change.** Six two-sentence records lose both examples and three single-sentence records lose theirs; the other 15 single-sentence records retain theirs. Complete originals survive in **2,361 original-content snapshots**, 41 more than before. Every earlier snapshot remains identical, and retained examples remain complete original objects in original order. Definitions, identities, readings, spellings, levels, dictionary evidence, source membership, canonical mappings and level decisions compare identically across all **10,307 source records**. Examples remain undisplayed in practice.

| Inventory measure | Before 5bf | After 5bf |
| --- | ---: | ---: |
| N2 explicit example decisions | 1,101 | 1,251 |
| N2 pending example-bearing records | 556 | 406 |
| N2 pending sentences | 1,025 | 743 |
| N2 pending nonliteral-match records | 0 | 0 |
| N2 reviewed valid nonliteral examples | 544 | 544 |
| N2 effective examples | 2,696 | 2,641 |
| All effective examples | 12,088 | 12,033 |
| All explicitly selected examples | 6,722 | 6,949 |
| All omitted examples | 1,626 | 1,681 |
| Records without effective examples | 1,035 | 1,044 |
| Original-content snapshots | 2,320 | 2,361 |
| Global nonliteral target signals | 2,029 | 2,029 |

The remaining **406 N2 records and 743 sentences** comprise **404 dictionary-backed records/741 sentences** plus the one-sentence phrases **お待ちください (`321ba5716a`) and ご存じですか (`feb110fb03`)**. Their existing phrase evidence stays intact and requires separate evidence-aware example accounting after the dictionary-backed cohorts. No N2 example completion is claimed. N5/N4/N3 remain complete at **677/634/1,610 decisions**, **13/nine/70 pre-existing empty members** and **1,154/978/2,500 effective examples**. N1 remains unchanged at **2,388 pending records and 4,341 sentences**.

All **10,291 units, 10,307 members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections, four phrase attestations and three pinned phrase-evidence files** remain. The unchanged **17,218 meanings** still comprise **14,686 exact**, **2,526 reviewed equivalent/construction strings** and **six separately attested N2 phrase meanings**. No dictionary/construction meaning flag reopens.

After-5bf source catalog SHA-256: `d35d9c45388c7b189c5dbc0c5a89ee47be50c5a6b92c58d0bb9c22551ff978f1`.
After-5bf canonical study SHA-256: `59836fbb6391d89bb99ca5d93746d53073da97278cb490b6a43c66bdc4bb9e5e`.
After-5bf review-row SHA-256: `1b205e034eeac0b53c08d64dedc67706784b33fd96ad4603aaf4b44727aa3d7b`.

## Sixth remaining N2 dictionary-backed literal example cohort (5bg)

The next **150 dictionary-backed N2 records**, from `a82d4898b1` through `c6399cbbfd`, account for **281 sentences: 235 retained unchanged and 46 omitted**. The existing strict contract receives **55 in-place extensions and 95 new retain decisions**, preserving every earlier meaning, reason, before-hash and example decision. There are now **5,805 meaning decisions: 1,146 corrected definitions and 4,659 retained**. Existing loaders, validators, compiler, inventory and shared assertions handle this data/test increment; production logic and schemas are unchanged.

| Review distinction | Outcome |
| --- | --- |
| Selected numbered senses | A security-device prefix differs from the selected independent crime-prevention noun; compass from magnet; unsteady gait from floating/softness; toe from finger; a ticket gate from ticket examination; discord from physical friction; knack from gist; printed words from printing type; word order from front/back; reckless spending from rough treatment; a TV season from sport; and a one-way ticket from the selected trip sense. Full heading, urgent-modifier, academic-meeting and apology senses remain within their existing citations. |
| Source and translation | Omissions address an unstated feature creator, lost prime-minister role, business-trip qualifier and cancellation uncertainty, added spam/click-through mechanism, snow/storm distinction, a specific application step, nominations versus appointments, unstated male subjects and ownership, a missing-person scenario, transport mode, poison-like uncertainty and editorial/edition categories. Numeric reading placeholders remain unresolved rather than being guessed. |
| Shared-sentence consistency | The feature-creator omission agrees with 機能, the Allied Powers/armed-forces omission with 軍, and the dropped cleric with 偉い. The aunt spelling, front-desk sense, mosquito-bite verb and private-parts euphemism explain different decisions on identical sentences targeting other words. |
| Retained context and suitability | Full senses, kana/kanji forms, grammatical subjects with implicit objects, meaningful compounds, tableware metonymy, idioms, ordinary viewpoints, illustrative quantities and named historical or geographical contexts remain. Generic owl and rain-shower renderings do not become universal taxonomy claims or bathing events. Unframed body judgements and the isolated Shylock stereotype are omitted without rewriting sources. Tentative personal pressure hypotheses remain visibly tentative and do not establish a medical effect. |

Section 5bg consults the indexed [Keeton magnet study](https://pmc.ncbi.nlm.nih.gov/articles/PMC391171/), which describes back-mounted magnets, to omit an unverified head-mounted episode without claiming that every Keeton experiment used one location. Its direct page returned browser verification. [NOAA’s vent-food-web guide](https://oceanexplorer.noaa.gov/edu/materials/life-on-hydrothermal-vent-investigation.pdf) documents bacterial producers supporting animal communities, informing omission of the no-animal-without-plants universal. The indexed [National Archives Domesday account](https://www.nationalarchives.gov.uk/explore-the-collection/explore-by-time-period/medieval/domesday/) distinguishes free and unfree medieval inhabitants; its direct page returned 403. [Cornell’s owl account](https://www.allaboutbirds.org/guide/Snowy_Owl/) distinguishes the usual nocturnal pattern from daytime-hunting exceptions, supporting the retained generic illustration without an every-species claim. [Hawaiʻi’s official weather account](https://www.gohawaii.com/trip-planning/weather), [NOAA’s buoyancy explanation](https://oceanservice.noaa.gov/education/dyw-pass-salt.html), [NOAA’s salmon life-cycle account](https://www.fisheries.noaa.gov/west-coast/sustainable-fisheries/salmon-life-cycle-and-seasonal-fishery-planning) and [Crayola’s traditional colour model](https://www.crayola.com/en-ca/faqs/what-are-the-primary-colors-faq) inform retained sea-bathing, salt/fresh-water, spawning and paint contexts. They establish no every-beach safety promise or universal pigment/light formula. [ABC’s Oscars press page](https://www.dgepress.com/abc/oscars/) provides promotional biggest-night context rather than a measured size ranking. [FDA’s UV account](https://www.fda.gov/radiation-emitting-products/tanning/ultraviolet-uv-radiation) and [WHO’s sanitation account](https://www.who.int/en/news-room/fact-sheets/detail/sanitation) support ordinary skin-effect and sanitation-risk contexts without diagnostic or treatment claims. [Folger’s Shylock discussion](https://www.folger.edu/explore/shakespeares-works/the-merchant-of-venice/) supplies the literary and prejudice context missing from an isolated greed stereotype. Consulted 2026-10-26. These sources inform contextual decisions only. No source prose, image, experiment, exercise, recipe, dose, medical advice, numerical health guidance, replacement sentence, translation, reading or furigana is imported or authored. The three pinned phrase-evidence files remain unchanged.

**Only example arrays on 41 records change.** Five two-sentence records lose both examples and four single-sentence records lose theirs; the other 15 single-sentence records retain theirs. Complete originals survive in **2,399 original-content snapshots**, 38 more than before. Every earlier snapshot remains identical, and retained examples remain complete original objects in original order. Definitions, identities, readings, spellings, levels, dictionary evidence, source membership, canonical mappings and level decisions compare identically across all **10,307 source records**. Examples remain undisplayed in practice.

| Inventory measure | Before 5bg | After 5bg |
| --- | ---: | ---: |
| N2 explicit example decisions | 1,251 | 1,401 |
| N2 pending example-bearing records | 406 | 256 |
| N2 pending sentences | 743 | 462 |
| N2 pending nonliteral-match records | 0 | 0 |
| N2 reviewed valid nonliteral examples | 544 | 544 |
| N2 effective examples | 2,641 | 2,595 |
| All effective examples | 12,033 | 11,987 |
| All explicitly selected examples | 6,949 | 7,184 |
| All omitted examples | 1,681 | 1,727 |
| Records without effective examples | 1,044 | 1,053 |
| Original-content snapshots | 2,361 | 2,399 |
| Global nonliteral target signals | 2,029 | 2,029 |

The remaining **256 N2 records and 462 sentences** comprise **254 dictionary-backed records/460 sentences** plus the one-sentence phrases **お待ちください (`321ba5716a`) and ご存じですか (`feb110fb03`)**. Their existing phrase evidence stays intact and requires separate evidence-aware example accounting after the dictionary-backed cohorts. No N2 example completion is claimed. N5/N4/N3 remain complete at **677/634/1,610 decisions**, **13/nine/70 pre-existing empty members** and **1,154/978/2,500 effective examples**. N1 remains unchanged at **2,388 pending records and 4,341 sentences**.

All **10,291 units, 10,307 members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections, four phrase attestations and three pinned phrase-evidence files** remain. The unchanged **17,218 meanings** still comprise **14,686 exact**, **2,526 reviewed equivalent/construction strings** and **six separately attested N2 phrase meanings**. No dictionary/construction meaning flag reopens.

After-5bg source catalog SHA-256: `4077a58f04bf247511ca19410e8afcd4619bb5e4e590a9034bcc08b2581289af`.
After-5bg canonical study SHA-256: `8e82aac58656bbb885d15006612d5cc83ee2dc65b9df4da58f68428a10f01a21`.
After-5bg review-row SHA-256: `0ff3e6858ffea23c027bdd3ad9d3e1b9ca88e4205660e7d5b0dd90865e299e9c`.

## Seventh remaining N2 dictionary-backed literal example cohort (5bh)

The next **150 dictionary-backed N2 records**, from `c6a40ed583` through `e9427e3ec2`, account for **270 sentences: 213 retained unchanged and 57 omitted**. The existing strict contract receives **46 in-place extensions and 104 new retain decisions**, preserving every earlier meaning, reason, before-hash and example decision. There are now **5,909 meaning decisions: 1,146 corrected definitions and 4,763 retained**. Existing loaders, validators, compiler, inventory and shared assertions handle this data/test increment; production logic and schemas are unchanged.

| Review distinction | Outcome |
| --- | --- |
| Explicit exact citation | 実る’s unchanged to-bear-fruit gloss explicitly selects eligible results sense 2 for efforts paying off; to ripen retains physical sense 1 for the peach tree. Both examples remain. No English definition, reading, dictionary link or equivalent/exact classification changes. |
| Numbered senses | Opening differs from reopening; completed work from a production department; one-by-one from every-single; mock-up from professional or vehicle models; grade from the academic calendar; milli-prefix from millimetres; allowance from salary; fixed adjective from the fixing verb; circulation from passing for; public square from open space; size from large-and-small; number from a number plate; gentle gradient from slow speed; grain/drop noun from its counter; and rough overview from whole-process coverage. |
| Actions, participants and readings | Omissions preserve use/stock-for-sale, used/set-aside money, completed sculpture production/present inspiration, moving/static positions and time-object distinctions. Added workplace, clothing, country, gender and group assumptions remain separate. Numeric 甲斐 and 下欄 reading conflicts are not repaired. Other omissions preserve explicit eat-everything, clean-copy and time-boundary information. |
| Shared sentences and retained scope | The diamond, youth, ancestor-respect, lower-page annotation, strengthened insist and kerosene omissions agree with earlier reasons. Worship remains in 敬う’s full selected sense, but the shared ancestor sentence lacks a religious setting to justify that rendering. The excuse noun remains valid despite an earlier different-sense verb omission. Full column/page senses, cultural fan wording, broader compatible colour labels, ordinary grammar, metonyms, personal judgements, ethical utterances, proverbs and reciprocal greetings remain. |

Section 5bh consults [GIA’s diamond account](https://www.gia.edu/diamond) for the retained conventional Mohs rank of ten, while preserving the earlier unrestricted-hardness omission. [NIST’s prefix account](https://www.nist.gov/pml/owm/metric-si-prefixes) supports centi/milli distinctions; the [historical imperial-measures table](https://www.legislation.govt.nz/act/public/1903/5/en/latest/) supplies only the quart/gallon relation, with no obsolete litre value or current commercial rule imported. [NIDDK’s digestion account](https://www.niddk.nih.gov/health-information/digestive-diseases/digestive-system-how-it-works), [NHLBI’s activity account](https://www.nhlbi.nih.gov/health/heart/physical-activity/benefits) and [USDA’s packaging account](https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/meat-and-poultry-packaging) inform retained nonexclusive stomach-digestion, circulation and spoilage-reduction contexts. They do not validate an undefined natural-diet recommendation or an individual health guarantee. [NOAA’s cloud account](https://www.nesdis.noaa.gov/our-environment/clouds) distinguishes condensed droplets/ice from gaseous water vapour. [Rutgers’ Edison account](https://edison.rutgers.edu/life-of-edison/inventions?catid=91&id=533:electric-pen&view=article) supports the historical copying-device context, and [Web Japan’s haiku account](https://web-japan.org/kidsweb/explore/language/q2.html) supports seasonal association without importing its metrical terminology or a poem. [World Gold Council’s trading-hub account](https://www.gold.org/gold-market-structure/global-gold-market) uses time-scoped volume estimates and does not establish an evergreen Zurich ranking. [INSEE’s department definition](https://www.insee.fr/fr/metadonnees/definition/c1762) and [France’s Interior Ministry account](https://www.interieur.gouv.fr/prefectures) distinguish territorial divisions from prefectural administration. [PNNL’s cold-climate heating account](https://basc.pnnl.gov/resource-guides/cold-climate-heat-pump-sizing-and-selection) provides alternative-system context for the earlier kerosene-necessity omission. Consulted 2026-10-26. These sources inform contextual decisions only. No source prose, image, experiment, exercise, recipe, dose, treatment, technical specification, financial recommendation, legal procedure, replacement sentence, translation, reading or furigana is imported or authored. The three pinned phrase-evidence files remain unchanged.

**Only example arrays on 50 records change.** Seven two-sentence records lose both examples and ten single-sentence records lose theirs; the other 20 single-sentence records retain theirs. Complete originals survive in **2,442 original-content snapshots**, 43 more than before. Every earlier snapshot remains identical, and retained examples remain complete original objects in original order. Definitions, identities, readings, spellings, levels, dictionary evidence, source membership, canonical mappings and level decisions compare identically across all **10,307 source records**. Examples remain undisplayed in practice.

| Inventory measure | Before 5bh | After 5bh |
| --- | ---: | ---: |
| N2 explicit example decisions | 1,401 | 1,551 |
| N2 pending example-bearing records | 256 | 106 |
| N2 pending sentences | 462 | 192 |
| N2 pending nonliteral-match records | 0 | 0 |
| N2 reviewed valid nonliteral examples | 544 | 544 |
| N2 effective examples | 2,595 | 2,538 |
| All effective examples | 11,987 | 11,930 |
| All explicitly selected examples | 7,184 | 7,397 |
| All omitted examples | 1,727 | 1,784 |
| Records without effective examples | 1,053 | 1,070 |
| Original-content snapshots | 2,399 | 2,442 |
| Global nonliteral target signals | 2,029 | 2,029 |

The remaining **106 N2 records and 192 sentences** comprise **104 dictionary-backed records/190 sentences** plus the one-sentence phrases **お待ちください (`321ba5716a`) and ご存じですか (`feb110fb03`)**. Their existing phrase evidence stays intact and requires separate evidence-aware example accounting after the final dictionary-backed cohort. No N2 example completion is claimed. N5/N4/N3 remain complete at **677/634/1,610 decisions**, **13/nine/70 pre-existing empty members** and **1,154/978/2,500 effective examples**. N1 remains unchanged at **2,388 pending records and 4,341 sentences**.

All **10,291 units, 10,307 members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections, four phrase attestations and three pinned phrase-evidence files** remain. The unchanged **17,218 meanings** still comprise **14,686 exact**, **2,526 reviewed equivalent/construction strings** and **six separately attested N2 phrase meanings**. No dictionary/construction meaning flag reopens.

After-5bh source catalog SHA-256: `55b22394bf77578bb8584f5ef73a8cab6ac5d782423f0d0a5b16d95796ae5ab9`.
After-5bh canonical study SHA-256: `101bb3674737f16c35da7882713647a0cc7f2eae156f0258e60901519e2a792c`.
After-5bh review-row SHA-256: `b6544a0056ca3a02d015d3f5ceceaca742ff063fcaca57d33c43116d4d52bc4e`.

## Final remaining N2 dictionary-backed literal example cohort (5bi)

The final **104 dictionary-backed N2 records**, from `e96e1a98b6` through `ffb5797b88`, account for **190 sentences: 142 retained unchanged and 48 omitted**. The existing strict contract receives **36 in-place extensions and 68 new retain decisions**, preserving every earlier meaning, reason, before-hash and example decision. There are now **5,977 meaning decisions: 1,146 corrected definitions and 4,831 retained**. Existing loaders, validators, compiler, inventory and shared assertions handle this data/test increment; production logic and schemas are unchanged.

| Review distinction | Outcome |
| --- | --- |
| Word boundaries | 夜行 is absent from 夜 plus 行った/行われる; neither sentence reads やこう. The matching ついで characters inside かついで belong to 担ぐ. These literal-character matches do not become dictionary evidence. The shopping-occasion example of ついで remains. |
| Numbered senses | Military rank differs from quality; deadline from period; a university post from a speaking role; economic peak from physical summit; vehicle exhaust from scarf; cheering from assistance; causal after-all from at-any-rate; discussion focus from optical focus; and a stopgap job from a physical seat. The selected person/lamp senses of 蛍光灯 remain distinct. |
| Propositions, participants and readings | Omissions address broadened comparisons, practice/capability, added recipients/groups/gender, lost kinship or public/coal qualifiers, retrieval direction, event types, altered modality, narrowed populations, substitution of buying for replacement, and understated heartbeat intensity. Numeric 前/逆 annotations are not repaired. The production/productivity, noun-modifier and bare-heartbeat omissions agree with earlier decisions. |
| Retained full senses and context | The uncle and thumb sentences remain valid for their present targets despite earlier different-sense omissions on other words. Meaningful compounds such as 押し問答, conventional access and public-transport wording, animal-body references, colloquial person descriptions, generic pronouns, broader compatible object labels, historical references, rounded quantities, metaphors, sayings and ordinary personal viewpoints remain. No recordings or new assessment items are introduced by reviewing the existing 録音 vocabulary examples. |

Section 5bi consults [NASA’s planetary parameters](https://ssd.jpl.nasa.gov/planets/phys_par.html) to retain the coarsely rounded six-thousand-kilometre Earth radius without changing its stated approximation. The indexed [Asian Art Museum sword account](https://searchcollection.asianart.org/objects/7760/long-sword-katana-blade-and-mounting) supports the Edo sword-pair context; its direct page requested browser verification. [Kew’s sweet-potato account](https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:1101088-2) includes Venezuela and Ecuador in the native range, supporting South-American nativity without an exclusive-origin claim or erasing Mexico/Central America. [The National Archives’ Edison account](https://www.archives.gov/milestone-documents/thomas-edisons-patent-application-for-the-light-bulb) distinguishes lamp improvement from original invention. [NTA’s eligibility account](https://www.nta.go.jp/taxes/shiraberu/taxanswer/shohi/6559.htm) supplies conditional tax-exemption context, with no eligibility checklist, amount, procedure or forthcoming rule change imported. [MAFF’s organic-JAS account](https://www.maff.go.jp/e/policies/standard/specific/organic_JAS.html) and [USDA’s allowed/prohibited-input account](https://www.ams.usda.gov/grades-standards/synthetic-substances-crop-production) prevent equating organic certification with no agricultural chemicals. [METI’s solar-thermal account](https://www.enecho.meti.go.jp/category/saving_and_new/attaka_eco/system/main.html) distinguishes heat-use systems from photovoltaics; it does not supply a dated national usage ratio for the omitted comparison. [The Library of Congress Soviet archive](https://www.loc.gov/exhibits/archives/intn.html) supplies historical system context rather than a present-state claim. Consulted 2026-10-26. These sources inform contextual decisions only. No source prose, image, experiment, exercise, recipe, treatment, technical specification, financial recommendation, legal procedure, replacement sentence, translation, reading or furigana is imported or authored. The three pinned phrase-evidence files remain unchanged.

**Only example arrays on 41 records change.** Seven two-sentence records lose both examples and four single-sentence records lose theirs; the other 14 single-sentence records retain theirs. Complete originals survive in **2,479 original-content snapshots**, 37 more than before. Every earlier snapshot remains identical, and retained examples remain complete original objects in original order. Definitions, identities, readings, spellings, levels, dictionary evidence, source membership, canonical mappings and level decisions compare identically across all **10,307 source records**. Examples remain undisplayed in practice.

| Inventory measure | Before 5bi | After 5bi |
| --- | ---: | ---: |
| N2 explicit example decisions | 1,551 | 1,655 |
| N2 pending example-bearing records | 106 | 2 |
| N2 pending sentences | 192 | 2 |
| N2 pending dictionary-backed records/sentences | 104 / 190 | 0 / 0 |
| N2 pending nonliteral-match records | 0 | 0 |
| N2 reviewed valid nonliteral examples | 544 | 544 |
| N2 effective examples | 2,538 | 2,490 |
| All effective examples | 11,930 | 11,882 |
| All explicitly selected examples | 7,397 | 7,539 |
| All omitted examples | 1,784 | 1,832 |
| Records without effective examples | 1,070 | 1,081 |
| Original-content snapshots | 2,442 | 2,479 |
| Global nonliteral target signals | 2,029 | 2,029 |

No dictionary-backed N2 example-bearing record remains pending. The remaining **two records/two sentences** are **お待ちください (`321ba5716a`) and ご存じですか (`feb110fb03`)**. Their existing phrase evidence stays intact and requires separate evidence-aware example accounting. They remain explicit in the queue and regressions; N2 example completion is not claimed. N5/N4/N3 remain complete at **677/634/1,610 decisions**, **13/nine/70 pre-existing empty members** and **1,154/978/2,500 effective examples**. N1 remains unchanged at **2,388 pending records and 4,341 sentences**.

All **10,291 units, 10,307 members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections, four phrase attestations and three pinned phrase-evidence files** remain. The unchanged **17,218 meanings** still comprise **14,686 exact**, **2,526 reviewed equivalent/construction strings** and **six separately attested N2 phrase meanings**. No dictionary/construction meaning flag reopens.

After-5bi source catalog SHA-256: `c7686ced652155ce1aa905d30e3f1fc02757d71c03185c5e0627f6066af1a6b4`.
After-5bi canonical study SHA-256: `6b806eab896fe900232120038c9eb338097fb6b4a6188cfc9480662d2256625b`.
After-5bi review-row SHA-256: `ab8954e417abdb97e1e944c4540351d0db7d9fc6958e2de77162756f6740b747`.

## N2 phrase example completion (5bj)

Section 5bj completes the two pending N2 phrase examples through an optional `exampleReview` on each existing attested correction. The shared selection validator accounts for every original index exactly once, preserves retained objects/order and rejects replacement patches; compiler and inventory revalidate the same pinned original and full-expression attestation. Phrase decisions have no dictionary entry/sense fields and their inventory counters remain separate. The お待ちください example (146661) stays unchanged: 少々 supplies the brief wait. The ご存じですか example (219872) is omitted because its English adds an unstated city context. Both originals and all earlier decisions survive. No source sentence, translation, reading or furigana is authored or imported from a teaching page.

N2 now has **1,655 dictionary-backed example decisions plus two phrase example decisions**, **2,489 effective examples**, **544 reviewed valid nonliteral forms** and **zero pending example-bearing records**. Its other 130 records comprise **128 pre-existing empty members** and **two earlier explicit correction omissions covering three sentences**: お元気で (`91b50bd069`) and しいんと (`d374033b31`). These earlier omissions and their complete originals remain unchanged. All 1,787 N2 members are accounted for; example review completion is not curriculum or proficiency-level certification. N5/N4/N3 stay complete, and N1 remains at **2,388 pending records/4,341 sentences**.

The corpus retains **5,977 meaning decisions (1,146 correct/4,831 retain)**, **7,539 dictionary-selected examples/1,832 dictionary omissions**, plus **one phrase-selected example/one phrase omission**. Combined explicit selection totals are **7,540 retained/1,833 omitted**. There are **11,881 effective examples**, **1,082 records without examples**, **2,479 original snapshots** and **2,029 nonliteral signals**. Only the ご存じですか example array changes; every other card compares identically across all **10,307 records**. All non-example content, evidence, previous snapshots, dictionary decisions, canonical membership and level decisions remain unchanged. The source, canonical study and review-row hashes change to bind the new evidence-aware decisions; the earlier application DRAFT snapshot is not refreshed or published.

The existing [Japan Foundation IRODORI vocabulary list](https://www.irodori-online.jpf.go.jp/a2-1/references/vocabulary/assets/pdf/reference-vocabulary-list-en.pdf) and [日本語検定 honorific explanation](https://www.nihongokentei.jp/check/level4/keigo-4-1.html) support the complete expressions under their existing citation-only contract, reconsulted 2026-10-26. They do not establish authorship or permission to copy a teaching exercise. The unchanged source examples remain attributed through OpenJLPT/Tatoeba. All three pinned phrase-evidence files, four phrase attestations and six phrase-supported meanings remain unchanged; no new phrase source or dictionary citation is added.

After-5bj source catalog SHA-256: `aee190f2e8644680242b45f96031d651ebc216845bc94ca2246a9a97581c547f`.
After-5bj canonical study SHA-256: `95d52aad58b2785ea2b7db3f77fb0f6dc02ce4f137423b5c445077d68a2b18a1`.
After-5bj review-row SHA-256: `808068ffd92af3b877b9263bc8ba648f0432a6c88b29f2c73bb714924742257b`.

## First N1 nonliteral example cohort (5bk)

The first **150 pending N1 records with nonliteral target matches**, from `013f46c118` through `5d8eead4ba`, account for **285 sentences: 213 retained unchanged and 72 omitted**, including companion sentences. The strict existing contract receives **68 extensions and 82 new retain decisions**, preserving every earlier meaning, reason, before-hash and example decision. Only **57 example arrays** change; **15 two-sentence records and four single-sentence records** become empty. Complete originals survive in **2,533 snapshots**, 54 more than before. Comparison across all **10,307 source records** confirms identical non-example content, dictionary evidence, earlier snapshots, canonical membership and level decisions. Retained sentences remain complete original objects in their original order. Existing compiler, validators and shared assertions are reused; production logic and schemas are unchanged.

Numbered senses distinguish water repulsion, dietary imbalance, reputation damage, monetary giving, responsibility, geographic courses, passing up opportunities, emotional/economic slumps and following feelings. Explicit まばたき, ネズミ and まだ forms do not rewrite the cards' またたき, ねず and いまだ readings; the declared いがむ alternate remains. Different words such as 愛情深い, 異にする, communication はかる and 動物好き do not become target evidence through matching sounds or characters. The potential of 休む differs from transitive 休める. Changed agents, gender, groups, actions, scope and unresolved reading annotations remain distinct; the shared IQ and marriage-definition omissions agree with previous or companion decisions. Full senses, meaningful compounds and nominalizations, eligible spellings, valid conjugations, proverbs, metaphorical viewpoints and natural contextual renderings remain. The explicitly aged children retain the selected non-adult child sense; the gathered group retains the full set noun, and fictional/personal narratives do not become medical advice or current event claims.

N1 now has **427 explicit example decisions and 4,688 effective examples**, including **260 reviewed valid nonliteral examples**. Its remaining queue is **2,238 records/4,056 sentences**: **281 records/531 sentences** still belong to the nonliteral-match group, followed by **1,957 records/3,525 sentences** with literal matches only. N5/N4/N3/N2 completion remains unchanged; no N1 example completion is claimed. Cumulative totals are **6,059 meaning decisions (1,146 correct/4,913 retain)**, **7,752 dictionary-selected examples/1,904 dictionary omissions**, plus the unchanged **one phrase selection/one phrase omission**. Combined explicit selection totals are **7,753 retained/1,905 omitted**. There are **11,809 effective examples**, **1,101 records without examples** and **1,971 nonliteral inventory signals**, including valid reviewed forms. All **17,218 meanings, 10,291 units, 10,307 members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections, four phrase attestations and three pinned phrase sources** remain. Exact/equivalent/phrase meaning counts stay at **14,686/2,526/six**, with no dictionary or construction meaning gap reopened. This offline revision does not replace or publish the older immutable application DRAFT snapshot.

Section 5bk consults [小学館’s complete-gathering noun account](https://kotobank.jp/word/%E6%8F%83-2057947) to retain the gathered-company use of 揃い without restricting the selected set sense to clothing. Its [瞬き account](https://kotobank.jp/word/%E7%9E%AC%E3%81%8D-634473) distinguishes the valid またたき/まばたき readings; this does not silently add the latter to the card. [The Natural History Museum’s honey account](https://www.nhm.ac.uk/discover/what-is-honey.html) distinguishes floral nectar from bee-processed honey, informing omission of the standalone flower-as-creator claim. [The Culinary Institute of America’s roux account](https://www.ciafoodies.com/all-about-roux/) supplies only flour/fat-cooking context, and [USGS’s deformation account](https://www.usgs.gov/observatories/hvo/science/deformation-monitoring-tracks-moving-magma-and-faults) supports the described volcanic uplift scene without a universal rule. [DEC’s Hudson River account](https://content.govdelivery.com/accounts/NYSDEC/bulletins/40431cc) supplies the New York/river context. The indexed [New York Health marriage-equality FAQ](https://www.health.ny.gov/vital_records/marriage_equality_frequently_asked_questions.htm) supplies a counterexample to an unqualified man-and-woman-only marriage definition; its direct page returned 403. Consulted 2026-10-26. These sources inform contextual decisions only. No source prose, teaching exercise, recipe step, measurement, medical recommendation, legal procedure, replacement sentence, translation, reading or furigana is imported or authored. The three pinned phrase-evidence files remain unchanged.

| Inventory measure | Before 5bk | After 5bk |
| --- | ---: | ---: |
| N1 explicit example decisions | 277 | 427 |
| N1 pending example records/sentences | 2,388 / 4,341 | 2,238 / 4,056 |
| N1 pending nonliteral-match records | 431 | 281 |
| N1 effective examples | 4,760 | 4,688 |
| All effective examples | 11,881 | 11,809 |
| Dictionary-selected examples | 7,539 | 7,752 |
| Dictionary-omitted examples | 1,832 | 1,904 |
| Phrase-selected/omitted examples | 1 / 1 | 1 / 1 |
| Records without examples | 1,082 | 1,101 |
| Original snapshots | 2,479 | 2,533 |
| Global nonliteral inventory signals | 2,029 | 1,971 |

After-5bk source catalog SHA-256: `d5c8347d59bc0f7010c3de52d427c89ecdce9d05d9dae156471c5e366720cf32`.
After-5bk canonical study SHA-256: `dfaee2e5238dcfe156e1b65166276f734a423fd1c2f68ca210ca65b79966239b`.
After-5bk review-row SHA-256: `aeb1ff834779c6977902a7e50f4adf5fbbe44ee8fe60a1477f7fbdc19df44b74`.

## Second N1 nonliteral example cohort (5bl)

The second **150 pending N1 records with nonliteral target matches**, from `5e5c2e2c1c` through `b82e2ceca8`, account for **279 sentences: 193 retained unchanged and 86 omitted**, including companion sentences. The existing strict contract receives **72 extensions and 78 new retain decisions**, preserving every earlier meaning, reason, before-hash and example decision. Only **71 example arrays** change; **15 two-sentence records and six single-sentence records** become empty. Complete originals survive in **2,597 snapshots**, 64 more than before. Comparison across all **10,307 source records** confirms identical non-example content, dictionary evidence, earlier snapshots, canonical membership and level decisions. Retained examples remain complete original objects in original order. Existing compiler, validators and shared assertions are reused; production logic and schemas are unchanged.

The unchanged strong definition for 逞しい explicitly cites eligible robust-vitality sense 3 for vigorous imagination, while burly and sturdy retain physical sense 1. Other numbered senses distinguish hobby absorption, earthquake resistance, monetary/professional manipulation, aging, enforcement, figurative paths, passive attitude, abstract subject handling and splashing. Explicit リクリエーション, はしご and つむり forms do not silently rewrite the preserved レクリエーション, ていし and つぶる readings. 演説/演出, 黒人/玄人, the なげく verb/たん noun and 心掛ける/心掛け remain separate words. Reversed polarity or participant roles, added agents/groups/gender/ownership, changed actions, grammatical issues, unresolved annotations and undated claims remain separate. Shared sentences were checked against previous omissions; the earlier verb-card retention stays valid when the later noun card is omitted. Full senses, eligible mixed spellings, nominalizations, meaningful compounds, regular inflections, generic pronouns, role relations, idioms and proverb/metaphor viewpoints remain. No source sentence is rewritten to rescue an omitted pair.

N1 now has **577 explicit example decisions and 4,602 effective examples**, including **418 reviewed valid nonliteral examples**. Its remaining queue is **2,088 records/3,777 sentences**: the final **131 nonliteral-match records/252 sentences**, followed by **1,957 literal-match-only records/3,525 sentences**. N5/N4/N3/N2 completion remains unchanged; no N1 example completion is claimed. Cumulative totals are **6,137 meaning decisions (1,146 correct/4,991 retain)**, **7,945 dictionary-selected examples/1,990 dictionary omissions**, plus the unchanged **one phrase selection/one phrase omission**. Combined explicit selection totals are **7,946 retained/1,991 omitted**. There are **11,723 effective examples**, **1,122 records without examples** and **1,895 nonliteral inventory signals**, including valid reviewed forms. All **17,218 meanings, 10,291 units, 10,307 members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections, four phrase attestations and three pinned phrase sources** remain. Exact/equivalent/phrase meaning counts stay at **14,686/2,526/six**, with no dictionary or construction meaning gap reopened. This offline revision does not replace or publish the older immutable application DRAFT snapshot.

Section 5bl consults [小学館’s 湿気る account](https://kotobank.jp/word/%E6%B9%BF%E6%B0%97%E3%82%8B-518429), which documents both ichidan and godan forms. The valid godan 湿気ってる example is omitted from this unchanged v1 card rather than taught as an ichidan inflection. Its [保証 account](https://kotobank.jp/word/%E4%BF%9D%E8%A8%BC-12060) and [保障 account](https://kotobank.jp/word/%E4%BF%9D%E9%9A%9C-630029) distinguish assurance of truth/authenticity from protection of a state or right; a grouped dictionary entry is not automatic contextual interchangeability. [NASA’s Earth-history account](https://www.nasa.gov/history/90-years-of-our-changing-views-of-earth/) gives ancient spherical-Earth context, informing omission of the unqualified ancient-world flat-Earth generalization. [NIST’s materials account](https://www.nist.gov/blogs/manufacturing-innovation-blog/additive-manufacturing-equals-excitement) supports the qualified most-materials expansion context. [WHO’s alcohol account](https://www.who.int/news-room/fact-sheets/detail/alcohol) and [NHS’s bite account](https://www.nhs.uk/conditions/insect-bites-and-stings/) supply general harm/avoid-scratching context for retained source examples. [NHLBI’s sleep account](https://www.nhlbi.nih.gov/health/sleep-deprivation/health-effects) discusses sufficient quality sleep at appropriate times; it does not make the undifferentiated late-bedtime sentence an adequately scoped health rule. The indexed [Japanese Society of Medical Instrumentation conference account](https://www.jstage.jst.go.jp/article/ikakikaigakuzassi/43/1/43_KJ00003468515/_pdf) also uses the mixed spelling 立すい in a full-room context; this supplies usage context only, not a new reading or medical evidence. Consulted 2026-10-26. These sources inform contextual decisions only. No source prose, teaching exercise, treatment, dose, recipe, medical regimen, legal procedure, technical measurement, replacement sentence, translation, reading or furigana is imported or authored. The three pinned phrase-evidence files remain unchanged.

| Inventory measure | Before 5bl | After 5bl |
| --- | ---: | ---: |
| N1 explicit example decisions | 427 | 577 |
| N1 pending example records/sentences | 2,238 / 4,056 | 2,088 / 3,777 |
| N1 pending nonliteral-match records/sentences | 281 / 531 | 131 / 252 |
| N1 effective examples | 4,688 | 4,602 |
| All effective examples | 11,809 | 11,723 |
| Dictionary-selected examples | 7,752 | 7,945 |
| Dictionary-omitted examples | 1,904 | 1,990 |
| Phrase-selected/omitted examples | 1 / 1 | 1 / 1 |
| Records without examples | 1,101 | 1,122 |
| Original snapshots | 2,533 | 2,597 |
| Global nonliteral inventory signals | 1,971 | 1,895 |

After-5bl source catalog SHA-256: `9291a58893f9b3f324d7c540363498b5e2fd8ff6d348824a0f284133e695b049`.
After-5bl canonical study SHA-256: `2fbde693d3779208029b8e69bf29a3fc9e0fb6de966d07b54a1cd54647ddc78d`.
After-5bl review-row SHA-256: `f6962cb86e358ccae526c4376fcc86ffd3308e9e70f13b1550517f45ae7c0204`.

## Final N1 nonliteral example cohort (5bm)

The final **131 pending N1 records with nonliteral target matches**, from `b843d494ba` through `ff854ec90e`, account for **252 sentences: 186 retained unchanged and 66 omitted**, including literal companion sentences. The existing contract receives **47 extensions and 84 new retain decisions**. Only **49 example arrays** change; **17 two-sentence records** become empty. Complete originals survive in **2,645 snapshots**, 48 more than before. Comparison across all **10,307 records** confirms unchanged definitions, readings, levels, dictionary evidence, earlier reviews/snapshots and canonical mappings. Retained examples remain complete original objects in original order. The existing compiler, validators and shared assertions are reused; production logic and schemas are unchanged.

Selected senses distinguish animal taming from accustoming, object naming from self-naming, physical lifting from withdrawal, retention/recording from stopping, exactness from frankness, payment arrears from general delay, and physical contamination from dishonor. The shared puma sentence stays on 馴らす's animal-taming sense but leaves the accustom-only 慣らす card; this is a selected-sense distinction. The 留める name-in-history omissions agree with the earlier stop-sense review. Explicit かって, ゆすぐ, そそぐ and ひと目 do not silently add readings to their cards. The intransitive 産まれる lemma remains distinct from transitive 産む. The sports suffix 戦 has incorrect いくさ furigana, and 活動家 has incorrect 家・いえ annotation; neither is repaired. Different words, changed participants, degree, ownership, actions and source scope remain distinct. Full senses, eligible mixed spellings, nominalizations, meaningful compounds, ordinary inflections, role relations, proverbs and contextual metaphors remain. The generic weakening-storm narrative is retained without treating it as a formal meteorological classification. No source sentence, translation, reading or furigana is authored to rescue an omission.

After 5bm, N1 had **708 explicit example decisions and 4,536 effective examples**, including **575 reviewed valid nonliteral examples**. **Zero nonliteral-match records remain pending.** Its remaining queue is **1,957 literal-match-only records/3,525 sentences**; N1 example review is not complete. N5/N4/N3/N2 completion remains unchanged. Cumulative totals are **6,221 meaning decisions (1,146 correct/5,075 retain)**, **8,131 dictionary-selected examples/2,056 dictionary omissions**, plus the unchanged **one phrase selection/one phrase omission**. Combined explicit selection totals are **8,132 retained/2,057 omitted**. There are **11,657 effective examples**, **1,139 records without examples** and **1,846 nonliteral inventory signals**, including valid reviewed forms. All **17,218 meanings, 10,291 units, 10,307 members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections, four phrase attestations and three pinned phrase sources** remain. Exact/equivalent/phrase meaning counts stay at **14,686/2,526/six**, with no dictionary or construction meaning gap reopened. The earlier immutable application **DRAFT** snapshot is not refreshed or published.

Section 5bm consults 小学館's [曾て account](https://kotobank.jp/word/%E6%9B%BE%E3%81%A6-3137231) and [一目 account](https://kotobank.jp/word/%E4%B8%80%E7%9B%AE-433732) to distinguish documented contracted/alternate readings from the readings declared by the cards. Its [産む account](https://kotobank.jp/word/%E7%94%9F%E3%82%80-441567) and [産まれる account](https://kotobank.jp/word/%E7%94%9F%E3%82%8C%E3%82%8B-441450) distinguish the transitive birth verb from the lexicalized intransitive; this does not reject passive inflection in general. Its [荷造り account](https://kotobank.jp/word/%E8%8D%B7%E9%80%A0%E3%82%8A-592185) also attests 荷作り, retained with its existing sentence and reading. [WHO's sport account](https://www.who.int/initiatives/sports-and-health) supports participation across abilities rather than a universal slender-body prerequisite. [NHS's swelling account](https://www.nhs.uk/conditions/oedema/) provides cause/symptom-dependent context, informing omission of blanket reassurance rather than supplying treatment advice. [Japan's government adult-age explanation](https://www.gov-online.go.jp/article/201808/entry-7947.html) distinguishes adulthood from smoking-age restrictions; no jurisdiction/age rule is added to repair the unscoped example. [JMA's cyclone account](https://www.jma.go.jp/jma/en/Activities/forecast.html) supplies the distinction between formal classifications and generic storm language, without importing a wind threshold or claiming a class for the unnamed source event. [Folger's court scene](https://www.folger.edu/explore/shakespeares-works/the-merchant-of-venice/read/4/1/) supplies literary mercy/justice context; retention of the Portia moderation metaphor does not certify a comprehensive interpretation of that play. Consulted 2026-10-26. These sources inform contextual decisions only; no source prose, teaching exercise, medical/legal instruction, measurement, replacement example, translation, reading or furigana is imported. The three pinned phrase-evidence files remain unchanged.

| Inventory measure | Before 5bm | After 5bm |
| --- | ---: | ---: |
| N1 explicit example decisions | 577 | 708 |
| N1 pending example records/sentences | 2,088 / 3,777 | 1,957 / 3,525 |
| N1 pending nonliteral-match records/sentences | 131 / 252 | 0 / 0 |
| N1 effective examples | 4,602 | 4,536 |
| N1 reviewed nonliteral examples | 418 | 575 |
| All effective examples | 11,723 | 11,657 |
| Dictionary-selected examples | 7,945 | 8,131 |
| Dictionary-omitted examples | 1,990 | 2,056 |
| Phrase-selected/omitted examples | 1 / 1 | 1 / 1 |
| Records without examples | 1,122 | 1,139 |
| Original snapshots | 2,597 | 2,645 |
| Global nonliteral inventory signals | 1,895 | 1,846 |

After-5bm source catalog SHA-256: `3970f9d7cf8dbdc98cc24671d0cf2a0cced2e1c4b977a43f18d53959325782d4`.
After-5bm canonical study SHA-256: `5a9d64cbdcfa35ad5ee26a47337eb04b5becc00189bcb0e0597bf27007ea37b7`.
After-5bm review-row SHA-256: `8d8f6b31dcefc0c58e0bf3ce2c154d03aeff32a9729fbb60a3b10a3c1e4fd99c`.

## First N1 literal example cohort (5bn)

The first **150 N1 literal-match-only records**, from `000e220ab0` through `121f05e948`, account for **272 sentences: 226 retained unchanged and 46 omitted**. The existing contract receives **51 extensions and 99 new retain decisions**. Only **42 example arrays** change; **four two-sentence records and six single-sentence records** become empty. Complete originals survive in **2,684 snapshots**, 39 more than before. Comparison across all **10,307 records** confirms unchanged definitions, primary readings, levels, dictionary evidence, earlier reviews/snapshots and canonical mappings. Retained examples remain complete original objects in their original order. Existing compiler, validators and assertions are reused; production logic and schemas are unchanged.

Word boundaries distinguish lexical 遅くとも from 遅く plus concessive とも, instrumental 以て from conversational も plus って, and adverb 何だか from embedded 何だか questions. Selected senses distinguish abstract aspects from physical sides, figurative fruits from crystallization, resurrection from revival, slow speed from leniency, camera flash from stroboscopic lamps, tidy alignment from accuracy and nuclear weapons from an organizational nucleus or mathematical kernel. Sheet-music absence does not establish playing by ear; 出生 does not become 出世, and 旅券 does not become travel expenses. Unresolved reading markers, changed certainty, counted objects, participant roles/groups and geographic scope remain distinct. Shared honey and argument sentences agree with earlier decisions; the journey proverb omits the compassion clause needed for the 情け card. Full senses, ordinary role references, institutional and device/light metonyms, meaningful compounds, sayings, personal views and natural contextual renderings remain. Both 入る examples retain the declared literary いる reading and its regular godan form rather than silently switching to modern はいる. No replacement sentence, translation, reading or furigana is authored.

After 5bn, N1 had **858 explicit example decisions and 4,490 effective examples**; its **575 reviewed valid nonliteral examples** remain unchanged. The remaining queue is **1,807 literal-match-only records/3,253 sentences**, with **zero pending nonliteral-match records**. N1 example review is not complete; N5/N4/N3/N2 completion remains unchanged. Cumulative totals are **6,320 meaning reviews (1,146 correct/5,174 retain)**, **8,357 dictionary-selected examples/2,102 dictionary omissions**, plus the unchanged **one phrase selection/one phrase omission**. Combined explicit selection totals are **8,358 retained/2,103 omitted**. There are **11,611 effective examples**, **1,149 records without examples** and **1,846 nonliteral inventory signals**, including reviewed valid forms. All **17,218 meanings, 10,291 units, 10,307 members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections, four phrase attestations and three pinned phrase sources** remain. Exact/equivalent/phrase meaning counts stay at **14,686/2,526/six**; no dictionary or construction meaning gap reopens. The older immutable application Japanese **DRAFT** snapshot is not refreshed or published.

Section 5bn consults 小学館's [入る account](https://kotobank.jp/word/%E5%85%A5%E3%82%8B-436522), which distinguishes literary いる from usual modern はいる and documents the godan inflection; the original declared reading is retained. Its [侃侃諤諤 account](https://kotobank.jp/word/%E4%BE%83%E4%BE%83%E8%AB%A4%E8%AB%A4-469407) supports vigorous discussion and the noisy-argument context, and its [趣を異にする account](https://kotobank.jp/word/%E8%B6%A3%E3%82%92%E7%95%B0%E3%81%AB%E3%81%99%E3%82%8B-2018267) supports the different-character/aspect construction without importing a new genre. [Nobel's joint wireless-development award](https://www.nobelprize.org/prizes/physics/1909/summary/) and [Marconi's lecture](https://www.nobelprize.org/uploads/2018/06/marconi-lecture.pdf) provide specific wireless-telegraphy context for omitting the unqualified radio-inventor claim; his indexed biography was readable in search, while its direct page returned 403. The [official Constitution text](https://www.shugiin.go.jp/internet/itdb_annai.nsf/html/statics/shiryo/dl-constitution.htm) and [Upper House explanation](https://www.sangiin.go.jp/japanese/goiken_gositumon/faq/index.html) describe conditional lower-house precedence rather than a blanket override; the separate overview URL returned 404. [NHLBI's insomnia-treatment account](https://www.nhlbi.nih.gov/health/insomnia/treatment) provides condition-dependent treatment context rather than a universal sleep-over-medicine rule. [Smithsonian's animal-cognition research](https://nationalzoo.si.edu/animals/news/what-are-orangutans-thinking) supplies a counterexample to excluding animals from thinking. [NASA's Earth facts](https://science.nasa.gov/earth/facts/) support axial rotation, [USGS's tectonic-plate account](https://pubs.usgs.gov/gip/dynamic/tectonic.html) supports the solid-rock slab context and [DOE's radioactivity account](https://www.energy.gov/science/doe-explainsradioactivity) supplies general heat-generation context for the retained waste-material sentence. Consulted 2026-10-26. Sources inform contextual decisions only. No source prose, exercise, treatment, legal procedure, technical operating instruction, numerical threshold, replacement sentence, translation, reading or furigana is imported. Existing source credits and the three pinned phrase-evidence files remain unchanged.

| Inventory measure | Before 5bn | After 5bn |
| --- | ---: | ---: |
| N1 explicit example decisions | 708 | 858 |
| N1 pending example records/sentences | 1,957 / 3,525 | 1,807 / 3,253 |
| N1 pending nonliteral-match records | 0 | 0 |
| N1 effective examples | 4,536 | 4,490 |
| N1 reviewed nonliteral examples | 575 | 575 |
| All effective examples | 11,657 | 11,611 |
| Dictionary-selected examples | 8,131 | 8,357 |
| Dictionary-omitted examples | 2,056 | 2,102 |
| Phrase-selected/omitted examples | 1 / 1 | 1 / 1 |
| Records without examples | 1,139 | 1,149 |
| Original snapshots | 2,645 | 2,684 |
| Global nonliteral inventory signals | 1,846 | 1,846 |

After-5bn source catalog SHA-256: `7615a8e5e4af51980b3ee41cb8ec95f3878031c51d7176680d36ab7dfac67706`.
After-5bn canonical study SHA-256: `c15011ab28fabd72550a77d787a0cf6191b349178f9bcda7fc4874ecc94e4233`.
After-5bn review-row SHA-256: `1777763aef80ae01c88cac5a30d314ad828cdb8a9a0dd5512d59a0d64453bb88`.

## Second N1 literal example cohort (5bo)

The second **150 N1 literal-match-only records**, from `123bb613f5` through `23f01f9d4e`, account for **264 sentences: 207 retained unchanged and 57 omitted**. The existing contract receives **53 extensions and 97 new retain decisions**. Only **48 example arrays** change; **nine two-sentence records and 13 single-sentence records** become empty. Complete originals survive in **2,729 snapshots**, 45 more than before. Comparison across all **10,307 records** confirms unchanged definitions, primary readings, levels, dictionary evidence, earlier reviews/snapshots and canonical mappings. Retained examples remain complete original objects in original order. The existing compiler, validators and shared assertions are reused; production logic and schemas are unchanged.

Selected senses distinguish medical monitoring from a computer display, river headwaters from an abstract source, general measures from medical treatment, capacity from a container, divine Creation from ordinary creation, slack business from a macroeconomic slump, a previous/former prefix from before, store opening from frankness, elimination from banishment and reliability from aims/hopes. The じょ prefix does not become the separately read 助ける verb. Missing target context, changed participants/gender, ownership, event types, named addressees, certainty, timing, scope and unresolved furigana remain distinct. Shared tax-exemption, constitutional-precedence, first-name and sports-reading omissions agree with earlier decisions. Shared individual-tree/battle sayings, making-ends-meet, weather and heart/pump examples retain their earlier contextual renderings. Full senses, meaningful compounds, ordinary topic ellipsis, idioms, metaphors, qualified observations and individual viewpoints remain. Ordinary rose-thorn and liquid-substance usage is retained; precise craftsmanship can support delicate in its full construction context. No replacement sentence, translation, reading or furigana is authored.

After 5bo, N1 had **1,008 explicit example decisions and 4,433 effective examples**; all **575 reviewed valid nonliteral examples** remain. Its remaining queue is **1,657 literal-match-only records/2,989 sentences**, with **zero pending nonliteral-match records**. N1 example review is not complete; N5/N4/N3/N2 completion remains unchanged. Cumulative totals are **6,417 meaning reviews (1,146 correct/5,271 retain)**, **8,564 dictionary-selected examples/2,159 dictionary omissions**, plus the unchanged **one phrase selection/one phrase omission**. Combined explicit selection totals are **8,565 retained/2,160 omitted**. There are **11,554 effective examples**, **1,171 records without examples** and **1,846 nonliteral inventory signals**, including reviewed valid forms. All **17,218 meanings, 10,291 units, 10,307 members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections, four phrase attestations and three pinned phrase sources** remain. Exact/equivalent/phrase meaning counts stay at **14,686/2,526/six**; no dictionary or construction meaning gap reopens. The older immutable application Japanese **DRAFT** snapshot is not refreshed or published.

Section 5bo consults the [Cabinet Office holiday explanation](https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html) for conditional substitute holidays, and [NTA's income-tax rate explanation](https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2260.htm) for bracketed rather than simple salary-proportional rates; no calendar, tax threshold or eligibility procedure is imported. The [official Constitution](https://www.shugiin.go.jp/internet/itdb_annai.nsf/html/statics/shiryo/dl-constitution.htm) supplies Article 9 renunciation context and the limits relevant to the already omitted blanket lower-house-precedence sentence; no operational defense-policy claim is added. The foreign-tourist privilege omission preserves the earlier N2 rationale and source scope.

[NHS's stress account](https://www.nhs.uk/mental-health/feelings-symptoms-behaviours/feelings-and-symptoms/stress/) informs omission of the standalone get-drunk-to-relieve-frustration recommendation, without importing treatment instructions. [Merriam-Webster's liquor definition](https://www.merriam-webster.com/dictionary/liquor) supports the liquid-substance use beyond alcoholic drinks. Its [senile definition](https://www.merriam-webster.com/dictionary/senile) distinguishes broad technical old-age uses from the unqualified personal cognitive label; it does not provide a missing cognitive assessment for the omitted grandfather sentence. [Cambridge's ordinary thorn usage](https://dictionary.cambridge.org/us/dictionary/english/thorn) includes roses; the indexed definition was readable, while the initial direct URL returned 403. This supports common-language usage rather than a botanical assertion that prickles and true thorns are structurally identical. [Cambridge's present-simple account](https://dictionary.cambridge.org/grammar/british-grammar/present) supplies the general-truth grammar context.

小学館's [タイプ account](https://kotobank.jp/word/%E3%81%9F%E3%81%84%E3%81%B7-3213589) attests the typewriter abbreviation in the borrowing sentence. Its [精巧 account](https://kotobank.jp/word/%E7%B2%BE%E5%B7%A7-545011) and [デリケート account](https://kotobank.jp/word/%E3%81%A7%E3%82%8A%E3%81%91%E3%83%BC%E3%81%A8-3214753) provide precise-workmanship context for the particular fragile machine and detailed miniature; they do not make all precision work fragile. [RSC's gold properties](https://periodic-table.rsc.org/element/79/Gold) supply a counterexample to an undifferentiated acid/metal rule, without importing a reaction mixture. [RHS's wood-ash account](https://www.rhs.org.uk/soil-composts-mulches/wood-ash-using-in-garden) supports a liming context rather than a claim that all ashes are interchangeable. [IFF's perfume account](https://www.iff.com/media/stories/how-perfume-made/) supports the aromatic-material/plant-wax context already present in the source sentence; no extraction recipe is copied.

[The Canadian Grain Commission's wheat-quality account](https://www.grainscanada.gc.ca/en/grain-research/scientific-reports/pdf/canadian-wheat.pdf) supports general quality context without claiming uniform grades or importing harvest statistics. [FCI's dachshund record](https://www.fci.be/en/nomenclature/DACHSHUND-148.html) supplies German origin and [AKC's breed account](https://www.akc.org/dog-breeds/dachshund/) supports the long, low form. [USHMM's Poland-invasion account](https://encyclopedia.ushmm.org/content/en/timeline-event/holocaust/1939-1941/german-invasion-of-poland) supports the 1939 context, and [English Heritage's Norman-conquest account](https://www.english-heritage.org.uk/learn/histories/1066-and-the-norman-conquest/) supports 1066 without collapsing all later consolidation into one date. Consulted 2026-10-26. These sources inform contextual decisions only. No source prose, teaching exercise, clinical/legal procedure, recipe, chemical formula, dosage, measurement, replacement sentence, translation, reading or furigana is imported. Existing source credits and all three pinned phrase-evidence files remain unchanged.

| Inventory measure | Before 5bo | After 5bo |
| --- | ---: | ---: |
| N1 explicit example decisions | 858 | 1,008 |
| N1 pending example records/sentences | 1,807 / 3,253 | 1,657 / 2,989 |
| N1 pending nonliteral-match records | 0 | 0 |
| N1 effective examples | 4,490 | 4,433 |
| N1 reviewed nonliteral examples | 575 | 575 |
| All effective examples | 11,611 | 11,554 |
| Dictionary-selected examples | 8,357 | 8,564 |
| Dictionary-omitted examples | 2,102 | 2,159 |
| Phrase-selected/omitted examples | 1 / 1 | 1 / 1 |
| Records without examples | 1,149 | 1,171 |
| Original snapshots | 2,684 | 2,729 |
| Global nonliteral inventory signals | 1,846 | 1,846 |

After 5bo source catalog SHA-256: `967c7d62a2410d4995c24fa37e54a28204f0a8d94ffceefc82f9fb0349536ee7`.
After 5bo canonical study SHA-256: `388468d84e19bb1aa822d8859c5c830ff41b7ab257fbf25d1debfe19d88e1a15`.
After 5bo review-row SHA-256: `517c22ba73d6d6985df34d1923b2aca7768612c4b384c29afd349f662f0bfd6d`.

## Third N1 literal example cohort (5bp)

The third **150 N1 literal-match-only records**, from `2402c719ec` through `381b8e830c`, account for **270 sentences: 194 retained unchanged and 76 omitted**. The existing contract receives **50 extensions and 100 new retain decisions**. Only **68 example arrays** change; **eight two-sentence records and 14 single-sentence records** become empty. Complete originals survive in **2,793 snapshots**, 64 more than before. Comparison across all **10,307 records** confirms unchanged definitions, primary readings, levels, dictionary evidence, earlier reviews/snapshots and canonical mappings. All **10,157 records outside this cohort** are identical. Retained examples remain complete original objects in original order. The existing compiler, validators and shared assertions are reused; production logic and schemas are unchanged.

Word boundaries distinguish いっそ from いっそう, さほど from 誠実さ＋ほど, and the 合わせ noun from 問い合わせ and the inflected 合わせる verb. Selected senses distinguish physical spots from stock-index/main points, physical smoothness from fluent speech, a physical rear from figurative support, sinks from cruising taxis, physical particles from negative not-the-slightest constructions, general union from chemical bonding, inspection from web browsing, departments from clubs, coordinate origins from starting points, shore from coastal waters, independent 果てる from its complete-action auxiliary and general correspondence from software compatibility. Translation checks distinguish qualifiers, ownership, gender, agency, restrictive only, certainty, prices, accounting quantities and malformed source text. Shared body-and-soul and rainy-day-insurance examples preserve earlier contextual decisions. The weaving sentence remains valid on 織る while failing to identify the selected loom noun on 機. Full senses, productive compounds, declared readings, idioms, metaphors, qualified observations, conversational roles and individual viewpoints remain. No replacement sentence, translation, reading or furigana is authored.

After 5bp, N1 had **1,158 explicit example decisions and 4,357 effective examples**; all **575 reviewed valid nonliteral examples** remain. Its remaining queue is **1,507 literal-match-only records/2,719 sentences**, with **zero pending nonliteral-match records**. N1 example review is not complete; N5/N4/N3/N2 completion remains unchanged. Cumulative totals are **6,517 meaning reviews (1,146 correct/5,371 retain)**, **8,758 dictionary-selected examples/2,235 dictionary omissions**, plus the unchanged **one phrase selection/one phrase omission**. Combined explicit selection totals are **8,759 retained/2,236 omitted**. There are **11,478 effective examples**, **1,193 records without examples** and **1,846 nonliteral inventory signals**, including reviewed valid forms. All **17,218 meanings, 10,291 units, 10,307 members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections, four phrase attestations and three pinned phrase sources** remain. Exact/equivalent/phrase meaning counts stay at **14,686/2,526/six**; no dictionary or construction meaning gap reopens. The older immutable application Japanese **DRAFT** snapshot is not refreshed or published.

Section 5bp consults [The Royal Mint's decimalisation history](https://www.royalmint.com/collect/decimalisation), [AARP's own history](https://careers.aarp.org/mission/), the [Royal Household's constitutional-role explanation](https://www.royal.uk/the-role-of-the-monarchy) and the [Bundesarchiv's Holy Roman Empire account](https://www.bundesarchiv.de/im-archiv-recherchieren/archivgut-recherchieren/nach-themen/epochen/quellen-zum-heiligen-roemischen-reich/) for the retained historical/institutional contexts. Merriam-Webster's [pretend](https://www.merriam-webster.com/dictionary/pretend) account supports the claim-to-the-throne construction; its [satellite](https://www.merriam-webster.com/dictionary/satellite) history supports the escort/attendant word family. 小学館's [花も恥じらう](https://kotobank.jp/word/花も恥じらう-603290) account supports the beauty idiom, while its [情 usage comparison](https://dictionary.goo.ne.jp/thsrs/3402/meaning/m0u/) distinguishes sympathetic attachment from an unspecified feeling. Its [倫理学 account](https://kotobank.jp/word/倫理学-150514) distinguishes a discipline from the rules it studies. [Dictionary.com's take-the-cake account](https://www.dictionary.com/browse/take-the-cake) allows outstanding performance without proving literal prize placement; the prize-asserting source pair is omitted.

[OSHA's combustible-dust account](https://www.osha.gov/combustible-dust) supplies missing-condition context for the categorical powder assertion, and [OpenStax's induction explanation](https://openstax.org/books/university-physics-volume-2/pages/13-1-faradays-law) distinguishes a circuit's changing magnetic flux from proximity alone. V&A's [knitting](https://www.vam.ac.uk/blog/museum-life/how-things-are-made-knitting) and [weft account](https://www.vam.ac.uk/articles/a-z-opus-anglicanum) distinguish interlocking loops from weaving. [NEI's myopia explanation](https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/nearsightedness-myopia) and [fact sheet](https://www.nei.nih.gov/sites/default/files/2025-09/Nearsightedness.pdf) distinguish near clarity from distant blur rather than inferring absence of myopia from tiny print. [Nepal's published mountain figures](https://www.tourismdepartment.gov.np/files/statistics/45.pdf) supersede the undated exact Everest measurement; [JMA's Asama activity account](https://www.data.jma.go.jp/vois/data/report/activity_info/306.html) documents an active, changing volcano rather than a stable now-dormant example. [IRS's taxable/nontaxable income account](https://www.irs.gov/businesses/small-businesses-self-employed/what-is-taxable-and-nontaxable-income) and [Publication 17](https://www.irs.gov/publications/p17) illustrate why an unscoped any-income tax rule is unsuitable. [Missouri's insurance-policy explanation](https://insurance.mo.gov/understanding-your-automobile-insurance-policy) supplies exclusion/coverage context without establishing the omitted unnamed policy's terms. [Smithsonian's Nandi account](https://asia.si.edu/education/educator-resources/encountering-religion-in-asian-art/explore-by-object/object/nandi/) supplies religious-practice context rather than an undifferentiated national trait. Consulted 2026-10-26. These sources inform contextual decisions only; the judgments remain authored AI-assisted annotations. No source prose, exercise, clinical/legal procedure, manufacturing recipe, measurement, replacement sentence, translation, reading or furigana is imported. Source credits and all three pinned phrase-evidence files remain unchanged.

| Inventory measure | Before 5bp | After 5bp |
| --- | ---: | ---: |
| N1 explicit example decisions | 1,008 | 1,158 |
| N1 pending example records/sentences | 1,657 / 2,989 | 1,507 / 2,719 |
| N1 pending nonliteral-match records | 0 | 0 |
| N1 effective examples | 4,433 | 4,357 |
| N1 reviewed nonliteral examples | 575 | 575 |
| All effective examples | 11,554 | 11,478 |
| Dictionary-selected examples | 8,564 | 8,758 |
| Dictionary-omitted examples | 2,159 | 2,235 |
| Phrase-selected/omitted examples | 1 / 1 | 1 / 1 |
| Records without examples | 1,171 | 1,193 |
| Original snapshots | 2,729 | 2,793 |
| Global nonliteral inventory signals | 1,846 | 1,846 |

After 5bp source catalog SHA-256: `e0c67288d83727ed6d73b4a7a411af09289bb48ceb2e48c26c0890dd4c71fe75`.
After 5bp canonical study SHA-256: `5a164465c9261458b7b814bf47d0c3da832a2373b59bbb5a412c19576b7c4a49`.
After 5bp review-row SHA-256: `5e0e5192e55e528f9f65a5c17cd037d3a9b8c78b26dbc32a8adfe919a85a3886`.

## Fourth N1 literal example cohort (5bq)

The fourth **150 N1 literal-match-only records**, from `3862e77007` through `4b3ac6f805`, account for **271 sentences: 205 retained unchanged and 66 omitted**. The existing contract receives **60 extensions and 90 new retain decisions**. Only **54 example arrays** change; **12 two-sentence records and seven single-sentence records** become empty. Complete originals survive in **2,843 snapshots**, 50 more than before. Comparison across all **10,307 records** confirms unchanged definitions, primary readings, levels, dictionary evidence, earlier reviews/snapshots and canonical mappings. All **10,157 records outside this cohort** are identical. Retained examples remain complete original objects in original order. The existing compiler, validators and shared assertions are reused; production logic and schemas are unchanged.

Selected senses distinguish the addressed-to suffix from reliance, medical paralysis from functional shutdown, institutional authority from an expert, color from sadness, general defense from baseball fielding, sluggishness from a tiresome lecture, a confrontation noun from the separately numbered facing verb, wrongdoing confession from romantic or faith declarations, and 盛る・さかる from serving food with もる. Word identities distinguish the 住・じゅう noun from 住む, distributive 毎 from 人ごと and the illness suffix from the conventional 心配性 trait. Translation checks account for participants, gender, ownership, number, academic stages, independence versus isolation, suspicion, obligations, professional roles and the missing distillation table. Graphic self-inflicted injury is omitted from the general brain card while its neutral companion remains. Source-bound originals remain intact; no replacement sentence, translation, reading or furigana is authored.

Full eligible senses, declared readings, productive compounds, conventional observer/requesting-party perspectives, retail wording, institutional metonymy, idioms, metaphors, attributed beliefs and qualified personal observations remain. The full lineage/birth sense supports the upbringing proverb; full behavior supports the conduct-correction proverb; temporal precedence selects sense 2 on 先行. Shared retail, relative-pronoun, fishing-boat, typhoon, account-balance, poverty/happiness and final-touches decisions agree with earlier reviews. Shared 乗り物 and male-subject omissions remain consistent. A sentence can remain valid on one target while failing another card's selected sense, as with physical brush versus finishing touches and serving food versus さかる.

After 5bq, N1 had **1,308 explicit example decisions and 4,291 effective examples**; all **575 reviewed valid nonliteral examples** remain. Its remaining queue is **1,357 literal-match-only records/2,448 sentences**, with **zero pending nonliteral-match records**. N1 example review is not complete; N5/N4/N3/N2 completion remains unchanged. Cumulative totals are **6,607 meaning reviews (1,146 correct/5,461 retain)**, **8,963 dictionary-selected examples/2,301 dictionary omissions**, plus the unchanged **one phrase selection/one phrase omission**. Combined explicit selection totals are **8,964 retained/2,302 omitted**. There are **11,412 effective examples**, **1,212 records without examples** and **1,846 nonliteral inventory signals**, including reviewed valid forms. All **17,218 meanings, 10,291 units, 10,307 members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections, four phrase attestations and three pinned phrase sources** remain. Exact/equivalent/phrase meaning counts stay at **14,686/2,526/six**; no dictionary or construction meaning gap reopens. The older immutable application Japanese **DRAFT** snapshot is not refreshed or published.

Section 5bq consults [Cornell's woodpecker-foraging account](https://academy.allaboutbirds.org/built-to-peck-how-woodpeckers-avoid-brain-injury/) for the beak/insect context and the [Met Office's thunder-and-lightning account](https://weather.metoffice.gov.uk/learn-about/weather/types-of-weather/thunder-and-lightning) for observed temporal precedence. [JMA's cyclone life-cycle account](https://www.jma.go.jp/jma/kishou/know/typhoon/1-2.html) supplies weakening context without imposing a formal intensity category on the shared generic-storm narrative. [Tokyo Metropolitan Government's financial-center account](https://www.english.metro.tokyo.lg.jp/w/113-101-001573) supplies context for Tokyo as an economic hub rather than an exclusive world capital. [NINDS's brain primer](https://www.ninds.nih.gov/sites/default/files/2025-05/know-your-brain-brian-basics.pdf) supplies general control-of-activity context for the neutral brain example; the direct HTML page returned 403, while the published PDF was readable.

Merriam-Webster's [sheer](https://www.merriam-webster.com/dictionary/sheer), [elect](https://www.merriam-webster.com/dictionary/elect) and [waste](https://www.merriam-webster.com/dictionary/waste) accounts support complete-manner, carefully-selected and devastating uses rather than treating unusual English as automatically erroneous. 小学館's [心配性 account](https://kotobank.jp/word/心配性-538741) distinguishes a disposition from the selected illness suffix. Its [sea-weather proverb account](https://kotobank.jp/jeword/待つ・俟つ) supports the conventional patience/opportunity rendering. Its [abstainer/storehouse proverb account](https://kotobank.jp/word/下戸の建てたる倉も無し-489814) identifies rhetorical drinking self-justification rather than an empirical wealth rule; the context-free categorical English is omitted. [Cambridge's relative-pronoun account](https://dictionary.cambridge.org/grammar/british-grammar/pronouns-relative) supports connection and reference functions without conflating word classes. [Japan Foundation's non-past account](https://www.irodori.jpf.go.jp/assets/data/starter/pdf/X_L17_au.pdf) supports present-or-future contextual use of the form called present in the source.

[NHS's sore-throat guidance](https://www.nhs.uk/symptoms/sore-throat/) and [oral-care account](https://www.nhs.uk/Live-well/healthy-teeth-and-gums/how-to-keep-your-teeth-clean/) supply indication/product context rather than establishing an unrestricted cough remedy or frequent-mouthwash regimen. Its [callus account](https://www.nhs.uk/conditions/corns-and-calluses/) distinguishes pressure and friction from inevitable calluses after walking. The [maternal-height research abstract](https://pubmed.ncbi.nlm.nih.gov/17039697/) describes an association in a defined study; it does not establish the unnamed example's ambiguous body-size prediction for women generally. [Shibuya's emergency-service account](https://www.city.shibuya.tokyo.jp/contents/living-in-shibuya/en/emergencies/dial119.html) and [Tokyo's ambulance-call account](https://www.hokeniryo.metro.tokyo.lg.jp/iryo/iryo_hoken/medical_info_eng/emergency_call) distinguish jurisdiction and service scope rather than making either omitted emergency instruction universal. Consulted 2026-10-26. These sources inform authored AI-assisted contextual decisions only. No source prose, exercise, clinical/legal procedure, regimen, measurement, forecast, replacement sentence, translation, reading or furigana is imported. Existing source credits and all three pinned phrase-evidence files remain unchanged.

| Inventory measure | Before 5bq | After 5bq |
| --- | ---: | ---: |
| N1 explicit example decisions | 1,158 | 1,308 |
| N1 pending example records/sentences | 1,507 / 2,719 | 1,357 / 2,448 |
| N1 pending nonliteral-match records | 0 | 0 |
| N1 effective examples | 4,357 | 4,291 |
| N1 reviewed nonliteral examples | 575 | 575 |
| All effective examples | 11,478 | 11,412 |
| Dictionary-selected examples | 8,758 | 8,963 |
| Dictionary-omitted examples | 2,235 | 2,301 |
| Phrase-selected/omitted examples | 1 / 1 | 1 / 1 |
| Records without examples | 1,193 | 1,212 |
| Original snapshots | 2,793 | 2,843 |
| Global nonliteral inventory signals | 1,846 | 1,846 |

After 5bq source catalog SHA-256: `db2fdd1100b94662fdf22d535bd6211f1bf605cac8b2701f824076378a53d6f0`.
After 5bq canonical study SHA-256: `d8a8b570b3eb25b9854d2e78a4b8c44ff14440b82fa93834b1b97cbdcd841b5e`.
After 5bq review-row SHA-256: `41331ac39df26e158a815484150ba6e3055fd4596262a40e3eed622c696448c3`.

## Fifth N1 literal example cohort (5br)

The fifth **150 N1 literal-match-only records**, from `4bc51f4a57` through `5fe2bc62e1`, account for **267 sentences: 197 retained unchanged and 70 omitted**. The existing contract receives **50 extensions and 100 new retain decisions**. Only **57 example arrays** change; **13 two-sentence records and 11 single-sentence records** become empty. Complete originals survive in **2,894 snapshots**, 51 more than before. Comparison across all **10,307 records** confirms unchanged definitions, primary readings, levels, dictionary evidence, earlier reviews/snapshots and canonical mappings. All **10,157 records outside this cohort** are identical. Retained examples remain complete original objects in original order. The existing compiler, validators and shared assertions are reused; production logic and schemas are unchanged.

Selected senses distinguish regular gasoline and team regulars from a regular adjective, digital files from document collections, disease progression from work progress, name-title さん from its occupational politeness-marker use, remembered days from daily/every-day uses, and one-go 一気に from the selected drinking cheer. Separate words distinguish the 制 noun/suffix from 制する and the 重・え suffix from 重なる and 重さ. The explicit 一向・いっこう annotations do not establish declared ひたすら, while the eligible unannotated 尊い spelling supports declared たっとい consistently with the earlier 貴い review. Translation checks preserve differences in gender/title status, bounded participants, ownership, frequency, speech acts, academic or occupational roles, continuity, primary-cause scope, rank thresholds, medical services/supplies, technical quantities and unresolved furigana or name spelling. The profit/production-cost, WHO-name and chocolate/LDL omissions preserve earlier shared decisions. No replacement sentence, translation, reading, furigana, recipe or factual correction is authored.

Full eligible senses, productive compounds, contextually licensed observer/requesting-party roles, institutional contexts, generic beneficiaries, ordinary clothing references, metaphors, attributed theories and qualified personal observations remain. Shared retail, bath-equipped-room, bicycle-corrosion, precious-friendship, majority-rule, bestseller, employment, judo and musical-rhythm examples preserve earlier contextual decisions. Proper-name Young does not become an age adjective. Rare but attested a-thought-more wording remains; so do the night-throughout, empty-dream, whim/adjective and excessive/rash sense distinctions. Historical/institutional framing does not assert exhaustive modern legal rights, clinical truth, administrative categories or live political outcomes.

N1 now has **1,458 explicit example decisions and 4,221 effective examples**; all **575 reviewed valid nonliteral examples** remain. Its remaining queue is **1,207 literal-match-only records/2,181 sentences**, with **zero pending nonliteral-match records**. N1 example review is not complete; N5/N4/N3/N2 completion remains unchanged. Cumulative totals are **6,707 meaning reviews (1,146 correct/5,561 retain)**, **9,160 dictionary-selected examples/2,371 dictionary omissions**, plus the unchanged **one phrase selection/one phrase omission**. Combined explicit selection totals are **9,161 retained/2,372 omitted**. There are **11,342 effective examples**, **1,236 records without examples** and **1,846 nonliteral inventory signals**, including reviewed valid forms. All **17,218 meanings, 10,291 units, 10,307 members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections, four phrase attestations and three pinned phrase sources** remain. Exact/equivalent/phrase meaning counts stay at **14,686/2,526/six**; no dictionary or construction meaning gap reopens. The older immutable application Japanese **DRAFT** snapshot is not refreshed or published.

Section 5br consults [OECD's tax definition](https://www.oecd.org/en/data/dashboards/ifcma-climate-policy-dashboard/instruments/taxes.html) for the ordinary government-collection context, and [MHLW's WHO account](https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/hokabunya/kokusai/who/) for the official 世界保健機関 name. [The House of Representatives' Constitution text](https://www.shugiin.go.jp/internet/itdb_english.nsf/html/statics/english/constitution_e.htm) supports Article 1's unity-symbol framing; [the National Archives' abolition account](https://www.archives.gov/historical-docs/13th-amendment) supports the ordinary historical wording while preserving awareness of the text's exception. [NASA's Neptune account](https://science.nasa.gov/neptune/neptune-facts/) supports the eighth-planet position. [Cochilco's mining statistics account](https://www.cochilco.cl/web/cochilco-publica-una-version-renovada-de-su-anuario-de-estadisticas-del-cobre-y-otros-minerales/) supports mining as a major Chilean economic source without importing statistics into a card.

[Qualified cocoa-product research](https://pubmed.ncbi.nlm.nih.gov/12468604/) and [a separate chocolate trial](https://pubmed.ncbi.nlm.nih.gov/15454274/) do not establish the source's unrestricted chocolate-prevents-LDL-oxidation assertion. [RSC's alcohol-properties account](https://edu.rsc.org/experiments/the-properties-of-alcohols/463.article) distinguishes alcohol classes rather than validating a universal aldehyde product. [Primary whole-body cell-count research](https://pmc.ncbi.nlm.nih.gov/articles/PMC10523466/) places representative human totals at the trillion scale rather than the Japanese example's tens of billions; no numerical repair is imported. [The authors' reentry framework](https://pmc.ncbi.nlm.nih.gov/articles/PMC3753453/) supplies theoretical context without resolving the omitted sentence's undefined anatomical referents. [NHS's stress account](https://www.nhs.uk/mental-health/feelings-symptoms-behaviours/feelings-and-symptoms/stress/) distinguishes ordinary or motivating stress from a requirement to avoid it universally. [RSC's rust account](https://edu.rsc.org/experiments/what-causes-iron-to-rust/434.article) supplies ordinary iron-corrosion context for the already retained bicycle conditional, without treating every possible bicycle material as identical.

[ONS's retail-price-index account](https://www.ons.gov.uk/economy/inflationandpriceindices/methodologies/calculatingtheretailpricesindex) supports price-change context for the broad barometer metaphor, rather than equating a price index with GDP or identifying an unspecified national index. [The Freud Museum's historical teaching account](https://www.freud.org.uk/schools/resources/what-is-psychoanalysis-part-3-the-oedipus-complex/) supports attribution of the love/hate framework to Freud rather than a current universal diagnosis. 小学館's [五感 account](https://kotobank.jp/word/五感-498788) defines the conventional sensory grouping, and its [一子相伝 account](https://kotobank.jp/word/一子相伝-434183) supports single-child transmission without supplying the omitted example's transmitting parent's gender. [Merriam-Webster's thought account](https://www.merriam-webster.com/dictionary/thought) attests the little/somewhat phrase. Consulted 2026-10-26. These sources inform authored AI-assisted contextual decisions only. No source prose, exercise, procedure, formula, regimen, measurement, replacement sentence, translation, reading or furigana is imported. Source credits and all three pinned phrase-evidence files remain unchanged.

| Inventory measure | Before 5br | After 5br |
| --- | ---: | ---: |
| N1 explicit example decisions | 1,308 | 1,458 |
| N1 pending example records/sentences | 1,357 / 2,448 | 1,207 / 2,181 |
| N1 pending nonliteral-match records | 0 | 0 |
| N1 effective examples | 4,291 | 4,221 |
| N1 reviewed nonliteral examples | 575 | 575 |
| All effective examples | 11,412 | 11,342 |
| Dictionary-selected examples | 8,963 | 9,160 |
| Dictionary-omitted examples | 2,301 | 2,371 |
| Phrase-selected/omitted examples | 1 / 1 | 1 / 1 |
| Records without examples | 1,212 | 1,236 |
| Original snapshots | 2,843 | 2,894 |
| Global nonliteral inventory signals | 1,846 | 1,846 |

After-5br source catalog SHA-256: `bfb4e3468df54bb5d72c2af3fcd959fc5ba0c0ada9bd1c1f25c117ba2cc712af`.
After-5br canonical study SHA-256: `e0a462857d2e67560190a239d48b10ba7d50120fdc8f1eb8ef58f7a1b7329fac`.
After-5br review-row SHA-256: `20a4b5f27a4da716e9b54001342142630a70921a58cd658aef1649559c453d2e`.

## Sixth N1 literal example cohort (5bs)

The sixth **150 N1 literal-match-only records**, from `5fe58f6863` through `73155c92ff`, account for **267 sentences: 204 retained unchanged and 63 omitted**. The existing contract receives **68 extensions and 82 new retain decisions**. Only **55 example arrays** change; **eight two-sentence records and ten single-sentence records** become empty. Complete originals survive in **2,936 snapshots**, 42 more than before. Comparison across all **10,307 records** confirms unchanged definitions, primary readings, levels, dictionary evidence, earlier reviews/snapshots and canonical mappings. All **10,157 records outside this cohort** are identical. Retained examples remain complete original objects in original order. The existing compiler, validators and shared assertions are reused; production logic and schemas are unchanged.

Selected senses distinguish school withdrawal from expulsion, physical construction from attire/make-up appearance, serving a table from the waiter person, help from religious salvation, nationality suffixes from generic people, an animal collar from a necklace, sound playback from mental recall, a generic predecessor from a family predecessor, physical impact from psychological shock, details from the detailed adjective, and temporal after from excessive quantity. Separate words distinguish 引いてはいけない from connective ひいては, 判らない from stamp 判・はん, 実に from the noun 実 and sunlight 日当たり from daily wages 日当・にっとう. 三個/三週間 use さん rather than the declared み; these examples carry no source annotation establishing み. Unannotated 私 does not establish colloquial あたし, consistently with the earlier formal わたくし omission. Translation checks preserve direction, actor/gender/ownership, younger-sister status, material/category qualifications, shortage versus exhaustion, readiness versus achieved performance and relative cooling versus absolute cold. Missing particles, unresolved furigana and the malformed request preposition are omitted without repairs. No replacement sentence, translation, reading or furigana is authored.

Full eligible senses preserve bridge on 桟橋, doorbell on チャイム, sturdy stout, slow/sluggish tardy and attendance with assist at. Grocery can include household supplies; the rural 雑貨屋 example has bilingual dictionary support. The practical-substance proverb explicitly selects 実 sense 3. Declared かたい is established by the original 難い annotation. Ordinary workplace pay criteria, institutional metonymy, reciprocal invitations, conventional correspondence roles, food preferences, metaphors, attributed beliefs and bounded observations remain. Shared medicine/strength, sanitary-section, custom, composure, examination-relief, geometry, woodpecker, degree, tax-reform and agreement decisions preserve earlier reviews. The dated 2000 Okinawa example distinguishes G7 participation from the wider G8 event. Equal rights remains a normative principle rather than an assertion of identical domestic entitlements. Unqualified legal, population-preference and majority claims are omitted without inventing replacement rules or statistics.

N1 now has **1,608 explicit example decisions and 4,158 effective examples**; all **575 reviewed valid nonliteral examples** remain. Its remaining queue is **1,057 literal-match-only records/1,914 sentences**, with **zero pending nonliteral-match records**. N1 example review is not complete; N5/N4/N3/N2 completion remains unchanged. Cumulative totals are **6,789 meaning reviews (1,146 correct/5,643 retain)**, **9,364 dictionary-selected examples/2,434 dictionary omissions**, plus the unchanged **one phrase selection/one phrase omission**. Combined explicit selection totals are **9,365 retained/2,435 omitted**. There are **11,279 effective examples**, **1,254 records without examples** and **1,846 nonliteral inventory signals**, including reviewed valid forms. All **17,218 meanings, 10,291 units, 10,307 members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections, four phrase attestations and three pinned phrase sources** remain. Exact/equivalent/phrase meaning counts stay at **14,686/2,526/six**; no dictionary or construction meaning gap reopens. The older immutable application Japanese **DRAFT** snapshot is not refreshed or published.

Section 5bs consults 小学館's [ねじ account](https://kotobank.jp/word/ねじ-111235) for the attested 単一機械/単純機械 terminology and the [Smithsonian simple-machine collection](https://learninglab.si.edu/collections/simple-machines/LhRPdA0HVeNCTLDj) for the listed machine types. Merriam-Webster's [stout](https://www.merriam-webster.com/dictionary/stout), [tardy](https://www.merriam-webster.com/dictionary/tardy), [assist](https://www.merriam-webster.com/dictionary/assist) and [grocery](https://www.merriam-webster.com/dictionary/grocery) entries support the retained strong-build, slow-work, attendance and food/household-supplies usages. 小学館's [雑貨 account](https://kotobank.jp/jeword/雑貨) and [Cambridge's store entry](https://dictionary.cambridge.org/us/dictionary/english-japanese/store) attest the bilingual shop usage. 小学館's [名 account](https://kotobank.jp/jeword/名) supports the substance-versus-reputation proverb and its profit rendering; the [idiom account](https://kotobank.jp/word/名を棄てて実を取る-2236314) supplies contextual confirmation.

[MOFA's G7 statement dated 21 July 2000](https://www.mofa.go.jp/policy/economy/summit/2000/documents/state_g7.html) and [the wider G8 communiqué](https://www.mofa.go.jp/policy/economy/summit/2000/documents/communique.html) distinguish historical participation from an upcoming meeting or an exhaustive seven-person summit. [Tea Board India's regional area account](https://www.teaboard.gov.in/pdf/STATE_WISE_TEA_GROWERS_AND_TEA_AREA_pdf7864.pdf) supports widespread cultivation without importing acreage. The [UN declaration](https://www.un.org/en/about-us/universal-declaration-of-human-rights/) supplies the normative equal-rights context. [Congress's constitutional analysis](https://constitution.congress.gov/static/files/GPO-CONAN-2024-SUPP.pdf) distinguishes the right to bear arms from an unlimited permission claim; no current eligibility rule is written. Consulted 2026-10-27. These checks inform authored AI-assisted contextual annotations only and do not claim a human teacher signoff. No source prose, exercise, formula, procedure, regimen, statistic, replacement sentence, translation, reading or furigana is imported. Pinned dictionary and phrase sources remain unchanged.

| Inventory measure | Before 5bs | After 5bs |
| --- | ---: | ---: |
| N1 explicit example decisions | 1,458 | 1,608 |
| N1 pending example records/sentences | 1,207 / 2,181 | 1,057 / 1,914 |
| N1 pending nonliteral-match records | 0 | 0 |
| N1 effective examples | 4,221 | 4,158 |
| N1 reviewed nonliteral examples | 575 | 575 |
| All effective examples | 11,342 | 11,279 |
| Dictionary-selected examples | 9,160 | 9,364 |
| Dictionary-omitted examples | 2,371 | 2,434 |
| Phrase-selected/omitted examples | 1 / 1 | 1 / 1 |
| Records without examples | 1,236 | 1,254 |
| Original snapshots | 2,894 | 2,936 |
| Global nonliteral inventory signals | 1,846 | 1,846 |

After-5bs source catalog SHA-256: `6400774590794d861247d001ff7cbba0ff10a5ba939cd33fcb3ea1bf58e56181`.
After-5bs canonical study SHA-256: `681dd4c21d4963fb326b31f4358cee8b0a5580dbae78b95874dd3eb7e674f52a`.
After-5bs review-row SHA-256: `7f210e701cd342a04b181eae9e5f1ac88b12f7c58440e53f77d1250652589400`.

## Seventh N1 literal example cohort (5bt)

The seventh **150 N1 literal-match-only records**, from `73311cdf3b` through `857ae72c6a`, account for **270 sentences: 198 retained unchanged and 72 omitted**. The existing contract receives **53 extensions and 97 new retain decisions**. Only **61 example arrays** change; **11 two-sentence records and 12 single-sentence records** become empty. Complete originals survive in **2,993 snapshots**, 57 more than before. Comparison across all **10,307 records** confirms unchanged definitions, primary readings, levels, dictionary evidence, earlier reviews/snapshots and canonical mappings. All **10,157 records outside this cohort** are identical. Retained examples remain complete original objects in original order. The existing compiler, validators and shared assertions are reused; production logic and schemas are unchanged.

Selected senses distinguish mild climate from gentle personality/moderate measures, typhoon landfall from going ashore, political factions from artistic schools, an educational future course from a physical route, mathematical groups from flocks, interpersonal dealings from physical touch, emotional agitation from physical boiling, a darkness veil from a curtain and a dump truck from dump. The unchanged product-demo meaning explicitly cites eligible JMdict **1084080/2** as exact, rather than its protest sense. Other retained selections include commonplace 月並み sense 2, figurative leeway 余地 sense 2, negative まして sense 2, the bounded zone 一帯 sense 2 and constrained 窮屈 sense 3. Inflected 諦める/結ぶ and the separately lexicalized 結びつき do not establish the respective standalone nouns. Proper-name Jumbo does not attest the jumbo-sized word. Declared 文・ふみ is established by the original annotation.

Translation checks distinguish financial markets from Wall Street, unnamed actors from added gender/groups/ownership, exposure to punishment from unavoidable punishment, a flower bed from a flower garden, hauling ashore from abandonment, a riddle's solution from explaining a mystery, a molecule from a generic particle, a calamity from damage and frequency/complete extent from a single event or weaker degree. The storm sentence remains valid on the earlier cause verb while failing the selected disaster noun. Shared acid/metal, criticism-versus-smear, marriage-definition, unresolved-furigana and riddle omissions preserve earlier decisions. Valid printout, staff-selection, refined-conduct, oath, orbit, fire-drill, professional/amateur, advice, stress, usage and grammar contexts remain. No replacement sentence, translation, reading, furigana, statistical claim, recipe, reaction procedure, regimen or eligibility rule is authored.

Full eligible senses, noun-plus-する forms, productive compounds, metaphors, conventional personal/host/correspondence perspectives, institutional metonymy, bounded predictions and qualified observations remain. Visit with means chat; philosopher can describe equanimity; quite can express complete or extreme degree; elect can mean selected/high-quality. The explicit like-an-axis comparison retains selected physical axis used figuratively, while the novel's center uses the unselected focal-point sense. Generic harm from smoking, food/energy context, photosynthesis, coal composition and water-molecule composition have primary-source support. The jack-pine heat claim lacks cone-type scope. Unqualified crane-license, social-trend, population-characterization and transit-speed assertions are omitted; the relative last-century history is unanchored. The missing carbon-emissions graph is not invented. Demeaning gender-based worth is omitted, with its full source preserved.

N1 now has **1,758 explicit example decisions and 4,086 effective examples**; all **575 reviewed valid nonliteral examples** remain. Its remaining queue is **907 literal-match-only records/1,644 sentences**, with **zero pending nonliteral-match records**. N1 example review is not complete; N5/N4/N3/N2 completion remains unchanged. Cumulative totals are **6,886 meaning reviews (1,146 correct/5,740 retain)**, **9,562 dictionary-selected examples/2,506 dictionary omissions**, plus the unchanged **one phrase selection/one phrase omission**. Combined explicit selection totals are **9,563 retained/2,507 omitted**. There are **11,207 effective examples**, **1,277 records without examples** and **1,846 nonliteral inventory signals**, including reviewed valid forms. All **17,218 meanings, 10,291 units, 10,307 members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections, four phrase attestations and three pinned phrase sources** remain. Exact/equivalent/phrase meaning counts stay at **14,686/2,526/six**; no dictionary or construction meaning gap reopens. The older immutable application Japanese **DRAFT** snapshot is not refreshed or published.

Section 5bt consults Merriam-Webster's [visit](https://www.merriam-webster.com/dictionary/visit), [philosopher](https://www.merriam-webster.com/dictionary/philosopher), [quite](https://www.merriam-webster.com/dictionary/quite) and [inventive](https://www.merriam-webster.com/dictionary/inventive) entries for the retained chat, equanimity, strong degree and devising usages. 小学館's [花壇 entry](https://kotobank.jp/jeword/花壇) supports the flower-bed distinction. [NASA's photosynthesis account](https://science.nasa.gov/kids/earth/what-is-the-carbon-cycle/) supports oxygen release during food production; the [US Forest Service's jack-pine account](https://research.fs.usda.gov/silvics/jack-pine) distinguishes variable cone-opening conditions rather than an unqualified great-heat requirement. [EIA's coal account](https://www.eia.gov/energyexplained/coal/) supports its high carbon content. [USGS's water-molecule account](https://water.usgs.gov/edu/watercycle-kids-adv.html) supports the stated atom counts.

[CDC's lung-damage account](https://www.cdc.gov/tobacco/about/cigarettes-and-copd.html) and [NHS's food-energy account](https://www.nhs.uk/live-well/healthy-weight/managing-your-weight/understanding-calories/) supply broad health context without importing a risk figure, menu, dosage or treatment. [WHO's HIV/AIDS account](https://www.who.int/en/news-room/fact-sheets/detail/hiv-aids) distinguishes HIV transmission from AIDS while supporting ongoing prevention efforts, not the omitted unspecified rapid-spread claim. [The Bank of England's banking account](https://www.bankofengland.co.uk/explainers/how-is-money-created) supports banking context; [its July 2026 analysis](https://www.bankofengland.co.uk/monetary-policy-report/2026/july-2026?Fds-Load-Behavior=force-external) cautions that money alone does not explain inflation. The retained thus-linked excerpt is contextual economic reasoning, not a universal quantitative guarantee.

[The UN's emblem account](https://www.un.org/tr/node/44706) supports the olive-branch symbol, and [NPS's Statue of Liberty account](https://www.nps.gov/stli/learn/historyculture/the-statue-of-liberty-as-a-symbol.htm) supports the American-symbol context. [NDL's chronology](https://www.ndl.go.jp/modern/e/utility/chronology.html) anchors Meiji-era history rather than the omitted unanchored last-century wording. [OSHA's crane guidance](https://www.osha.gov/sites/default/files/enforcement/directives/CPL_02-01-063.pdf) distinguishes scoped requirements and exceptions; no current licensing rule is imported. [IBA's Cuba Libre account](https://iba-world.com/iba-cocktail/cuba-libre/) supports its rum base only; no quantities or method are copied. Consulted 2026-10-27. These sources inform authored AI-assisted contextual decisions, not a human teacher signoff. Pinned dictionary and phrase-source files remain unchanged; no source prose or exercise is imported.

| Inventory measure | Before 5bt | After 5bt |
| --- | ---: | ---: |
| N1 explicit example decisions | 1,608 | 1,758 |
| N1 pending example records/sentences | 1,057 / 1,914 | 907 / 1,644 |
| N1 pending nonliteral-match records | 0 | 0 |
| N1 effective examples | 4,158 | 4,086 |
| N1 reviewed nonliteral examples | 575 | 575 |
| All effective examples | 11,279 | 11,207 |
| Dictionary-selected examples | 9,364 | 9,562 |
| Dictionary-omitted examples | 2,434 | 2,506 |
| Phrase-selected/omitted examples | 1 / 1 | 1 / 1 |
| Records without examples | 1,254 | 1,277 |
| Original snapshots | 2,936 | 2,993 |
| Global nonliteral inventory signals | 1,846 | 1,846 |

After-5bt source catalog SHA-256: `cb91dc71f4358b45a1c723243df665ad1b9441d66ea4b058e2666e8244408f5c`.
After-5bt canonical study SHA-256: `b99847674d6e715baea7c22fd148fb5c892f9a76afc5e0d8e301a91793f98914`.
After-5bt review-row SHA-256: `418705523c20d4a43101367d519fa3fbd4b7cf4a3d81054c5ce5a4f3a0d5f3ba`.

## Eighth N1 literal example cohort (5bu)

The eighth **150 N1 literal-match-only records**, from `858ac29e35` through `99dd4adc73`, account for **267 sentences: 198 retained unchanged and 69 omitted**. The existing contract receives **52 extensions and 98 new retain decisions**. Only **58 example arrays** change; **11 two-sentence records and 11 single-sentence records** become empty. Complete originals survive in **3,049 snapshots**, 56 more than before. Comparison across all **10,307 records** confirms unchanged definitions, primary readings, levels, dictionary evidence, earlier reviews/snapshots and canonical mappings. All **10,157 records outside this cohort** are identical. Retained examples remain complete original objects in original order. The existing compiler, validators and shared assertions are reused; production logic and schemas are unchanged.

Selected senses distinguish television hogging from monopoly, reception desks from a general front, one's-own from distinctive/original, physiological responses from general or chemical reactions, food spoilage from moral/political decay, waste collection from general or hobby collecting, tracing from chasing, and mental attitude from skill knowledge or guidelines. Inflected 慣れる and 優しい do not establish the separate noun 慣れ or prefix 優・やさ. The degree adverb おおいに does not establish the hey interjection, and the しておく construction does not establish に於いて. Proper-name 谷雄 does not establish the male-animal noun 雄. Unannotated 音/銃 do not establish marked ね/つつ readings; explicitly annotated 頂・いただき and 世・よ remain. Retained examples select notice/poster 張り紙 sense 2, conventional 従来 sense 2, sports-finals 決勝 sense 2, immigrant-person sense 2, persevering 粘る sense 2, moral-corruption 腐敗 sense 2, emotional 動揺 sense 2 and extravagance 華美 sense 2.

Translation checks distinguish slander from a generic insult, submitting a bill from withdrawing one, sent documents from attachments, need from a planned placement, executive staff from general staff, a solicitor from a generic lawyer, embroidery from lace, admission/stay fees from generic hospital fees, days passing from one day progressing, and the first poor harvest in ten years from a worst-in-ten ranking. Shinjuku does not become Tokyo Station. Unknown actors, gender and ownership remain distinct from added particulars. Missing emphatic wording, unsupported historical/current assertions, unresolved furigana and unsuitable source constructions are omitted without repairs. Shared bill-procedure, noun-modifier classification, executive-rank, principal/principle, orchard-theft, utility-fee and museum-visitation omissions agree with earlier reviews. A source can be valid on one target while failing another card's selected sense or reading, as with physical spoilage, general gun use, sample collection and generic measures.

Full eligible senses, productive compounds, metaphors, maxims, bounded observations and ordinary discourse perspectives remain. Presently has an attested older at-once use; appreciate recognizes value; on the level means genuine/honest. Independent Japanese lexicography supports the formal predicate in the Christmas greeting and the hard/painful からい reading of 辛い; neither source is silently rewritten. Industry usage supports wine 育成 as maturation/elevage. Hokkaido Museum supports straw-horse making in the region. The roundabout-lake route and uncountable business service remain natural contextual renderings. Political ですね supports an inclusive conversational reaction rather than a new fixed group. Wishes/questions about recovery and personal symptom reports do not become clinical guarantees. Red Cross relief, nuclear humanitarian risk, German/Italian alliance history, Korean spice associations, whaling history and the conventional plum-liqueur description have contextual primary-source checks. No replacement sentence, translation, reading, furigana, recipe, procedure, clinical prognosis, numerical ranking or eligibility rule is authored.

After 5bu, N1 had **1,908 explicit example decisions and 4,017 effective examples**; all **575 reviewed valid nonliteral examples** remain. Its remaining queue is **757 literal-match-only records/1,377 sentences**, with **zero pending nonliteral-match records**. N1 example review is not complete; N5/N4/N3/N2 completion remains unchanged. Cumulative totals are **6,984 meaning reviews (1,146 correct/5,838 retain)**, **9,760 dictionary-selected examples/2,575 dictionary omissions**, plus the unchanged **one phrase selection/one phrase omission**. Combined explicit selection totals are **9,761 retained/2,576 omitted**. There are **11,138 effective examples**, **1,299 records without examples** and **1,846 nonliteral inventory signals**, including reviewed valid forms. All **17,218 meanings, 10,291 units, 10,307 members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections, four phrase attestations and three pinned phrase sources** remain. Exact/equivalent/phrase meaning counts stay at **14,686/2,526/six**; no dictionary or construction meaning gap reopens. The older immutable application Japanese **DRAFT** snapshot is not refreshed or published.

Section 5bu consults Merriam-Webster's [presently](https://www.merriam-webster.com/dictionary/presently), [appreciate](https://www.merriam-webster.com/dictionary/appreciate) and [on the level](https://www.merriam-webster.com/dictionary/on%20the%20level) entries for the retained immediate, value-recognition and genuine/honest usages. [Cambridge's service entry](https://dictionary.cambridge.org/dictionary/english/service) explicitly permits an uncountable commerce use; an article is not fabricated. 小学館's [御座います account](https://kotobank.jp/word/御座います-500830) attests the formal adjective predicate, including congratulations; its numbering is not substituted for the pinned JMdict sense numbers. The selected broad to-be expression remains distinct from the pinned auxiliary-after-て-verb sense. The [辛い account](https://kotobank.jp/word/辛い-22233) independently attests からい for painful/hard experience, so the existing annotation is preserved rather than normalized to つらい.

[Suntory's winery account](https://www.suntory.co.jp/wine/nihon/blog/16020916.html) attests wine 育成 in maturation context; no winemaking process is imported. [Hokkaido Museum's straw-horse event](https://www.hm.pref.hokkaido.lg.jp/event/21503/) supports the regional craft statement without generalizing to every resident. [KTO's cuisine account](https://english.visitkorea.or.kr/svc/contents/contentsView.do?vcontsId=221365) provides spice/paste context without claiming that every Korean dish is hot. [JNTO's liquor account](https://www.japan.travel/en/guide/sake-shochu/) supports the ordinary plum-liqueur description, without a recipe or botanical replacement.

[IFRC's disaster-response account](https://www.ifrc.org/article/ifrc-disaster-response-emergency-fund-2024-annual-report) supports rapid-relief context rather than a guaranteed arrival time. [ICRC's nuclear-weapons account](https://www.icrc.org/en/article/faq-nuclear-weapons) supports catastrophic humanitarian risk rather than literal planetary disintegration, a quantified forecast or technical weapon details. [USHMM's alliance history](https://encyclopedia.ushmm.org/content/en/article/axis-powers-in-world-war-ii) supports the Germany/Italy alliance; it does not identify the omitted Japan/France sentence's unnamed war or imply no historical agreements ever existed. [IWC's whaling history](https://iwc.int/management-and-conservation/whaling/commercial) supplies cessation and international-policy context without certifying every national motive, all whaling as ended or a new legal rule. Consulted 2026-10-27. These checks inform authored AI-assisted contextual decisions, not a human teacher signoff. No source prose, exercise, factual replacement or reading is imported. Pinned dictionary and phrase-source files remain unchanged.

| Inventory measure | Before 5bu | After 5bu |
| --- | ---: | ---: |
| N1 explicit example decisions | 1,758 | 1,908 |
| N1 pending example records/sentences | 907 / 1,644 | 757 / 1,377 |
| N1 pending nonliteral-match records | 0 | 0 |
| N1 effective examples | 4,086 | 4,017 |
| N1 reviewed nonliteral examples | 575 | 575 |
| All effective examples | 11,207 | 11,138 |
| Dictionary-selected examples | 9,562 | 9,760 |
| Dictionary-omitted examples | 2,506 | 2,575 |
| Phrase-selected/omitted examples | 1 / 1 | 1 / 1 |
| Records without examples | 1,277 | 1,299 |
| Original snapshots | 2,993 | 3,049 |
| Global nonliteral inventory signals | 1,846 | 1,846 |

After 5bu source catalog SHA-256: `760ea5c66cc3ec686940585ed6b85773e8000a8c98612462d464cb9b054a206e`.
After 5bu canonical study SHA-256: `edfd0485ec91b5996bb7fab02e61f0cfcda69ac6758556aecc6cf4bf9bc77d85`.
After 5bu review-row SHA-256: `14db9a4a33da63fd0bbe2890efc14e4e77bce38153590cd7b4e1df201e2cc4a7`.

## Ninth N1 literal example cohort (5bv)

The ninth **150 N1 literal-match-only records**, from `9a048b8df1` through `ad558472a4`, account for **273 sentences: 220 retained unchanged and 53 omitted**. The existing contract receives **55 extensions and 95 new retain decisions**. Only **46 example arrays** change; **seven two-sentence and seven single-sentence records** become empty. Complete originals survive in **3,089 snapshots**, 40 more than before. A full before/after comparison confirms unchanged definitions, primary readings, levels, dictionary evidence, earlier review fields/snapshots and canonical mappings. All **10,157 records outside the cohort** are identical, and kept examples remain complete original objects in original order. The existing compiler, validators and shared assertions are reused; production logic and schemas are unchanged.

Selected senses separate table napkins from sanitary pads, wealth from goods, line penetration from surmounting an obstacle, physical bare feet from an outdoing-specialist suffix, and a fight noun from a cheer or movie title. Unannotated standalone 気質 does not establish the declared かたぎ reading; the pinned entry notes that this reading is usually a suffix. Finite 打ち消す, honorific 恵む and the 頼む continuative in 頼みさえすれば do not establish the separate nouns 打ち消し, 恵み and 頼み. The unchanged exact **fear** gloss explicitly selects **1236660/2** for accident risk while horror retains sense 1. The unchanged exact **degeneration** gloss selects **1411320/2** for ecosystem deterioration while retrogression retains biological sense 1. Figurative loan-payment **hell** selects exact **1421090/3**, distinct from Christian Hell sense 2. Other retained citations distinguish grammatical 格 sense 4, public 公 sense 2, menstrual 生理 sense 2, social 交わる sense 2, restriction-removal 解除 sense 2, physical-length 長々 sense 2, ways-of-use 使い道 sense 2 and suitability 向き sense 2.

Translation checks preserve the difference between plural boys and one boy, a criminal and a prisoner, plainclothes police and private detectives, a failed election and being dropped, an offer of help and a joint proposal, an older sister and an unspecified sister, a family register and generic family/paper connections, and engineering and broader technology. Missing degree, fee/cheapness, selected context, changed speech acts/actions and added identities or ownership remain documented per sentence. Absent graphs, unresolved furigana, malformed English and unanchored numerical or current assertions are omitted without generated replacements. Japan's care-insurance next-year prediction is retained only in its original snapshot; the system began in April 2000. Shared river-basin, brief/lifelong-shame, cement-binding, billowing-smoke, clinical-care and furigana cases are checked against earlier reviews. A sentence's lexical validity can differ across target cards, as with incurring anger on 招く versus 怒り, honorific 恵む on 恵み versus the riches on 富, and temporal 末期 versus physical 舞台.

Full eligible senses, productive compounds, ordinary discourse perspectives, metaphors and bounded narratives remain. English talent can denote a performer; accessible can mean open to influence; reflect conveys unhurried consideration; carry a torch preserves especially unreturned affection. Traditional grammar's subject/object uses of relative that support the grammatical-case example without extending that analysis to every function of that. The colloquial omitted object particle in the graceful-dance sentence and the scrambled victory-prediction construction remain. Delivered twins can describe a mother's childbirth. Conventional classroom, shared-vehicle and general-knowledge perspectives remain distinct from added particular ownership. Personal symptoms, medical appointment requests, an unspecified medicine offer and monitoring for signs do not become diagnostic claims or regimens. King's Nobel Prize, Doppler effect on light, constellation history, meter/yard difference, qualified earthworm benefit, penicillin history, Hokkaido natural areas and the attested pomato crop have contextual primary checks. No sentence, translation, reading, furigana, treatment, quantity, procedure or legal rule is authored.

After 5bv, N1 had **2,058 explicit example decisions and 3,964 effective examples**; all **575 reviewed valid nonliteral examples** remain. Its remaining queue is **607 literal-match-only records/1,104 sentences**, with **zero pending nonliteral-match records**. N1 example review is not complete; N5/N4/N3/N2 completion remains unchanged. Cumulative totals are **7,079 meaning reviews (1,146 correct/5,933 retain)**, **9,980 dictionary-selected examples/2,628 dictionary omissions**, plus the unchanged **one phrase selection/one phrase omission**. Combined explicit totals are **9,981 retained/2,629 omitted**. There are **11,085 effective examples**, **1,313 records without examples** and **1,846 nonliteral inventory signals**, including reviewed valid forms. All **17,218 meanings, 10,291 units, 10,307 members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections, four phrase attestations and three pinned phrase sources** remain. Exact/equivalent/phrase meaning counts stay at **14,686/2,526/six**; no dictionary or construction meaning gap reopens. The older immutable application Japanese **DRAFT** snapshot is not refreshed or published.

Section 5bv consults [Cambridge's relative-pronoun grammar](https://dictionary.cambridge.org/grammar/british-grammar/relative-pronouns/) for the traditional subject/object analysis, Merriam-Webster's [talent](https://www.merriam-webster.com/dictionary/talent), [accessible](https://www.merriam-webster.com/dictionary/accessible) and [reflect](https://www.merriam-webster.com/dictionary/reflect) entries for performer, influence and careful-thought usages, and [Collins's carry-a-torch entry](https://www.collinsdictionary.com/us/dictionary/english/carry-a-torch-for) for unreturned-affection context. These inform the contextual decisions; pinned JMdict sense numbers remain authoritative for the ledger.

[Nobel's 1964 summary](https://www.nobelprize.org/prizes/peace/1964/summary/) supports King's prize. [NASA's Doppler account](https://science.nasa.gov/learn/basics-of-space-flight/chapter6-4/) supports light/radiation context. [IAU's constellation history](https://www.iau.org/IAU/IAU/Astronomy-FAQs/Constellations.aspx?hkey=bb9dc841-0618-41b5-ac70-149741062141) distinguishes ancient star patterns from modern 88-area boundaries. [NIST's length account](https://www.nist.gov/pml/owm/si-units-length) supports unequal meter/yard units. [Goethe-Institut's Dutch-learner material](https://www.goethe.de/prj/dlp/dlapi/v1/index.cfm?endpoint=%2Ftlm%2Fdownload&file_ID=2509&tlm_ID=922) supports Dutch/German West Germanic relationship.

[USDA's earthworm account](https://nrcs.usda.gov/sites/default/files/2022-10/Earthworms.pdf) supports qualified soil benefits. [ACS's penicillin history](https://www.acs.org/education/whatischemistry/landmarks/flemingpenicillin.html) supports historical welfare benefit without importing treatment instructions. [MHLW's history](https://www.mhlw.go.jp/content/000615002.pdf) anchors care-insurance introduction in April 2000. [WHO's smoke-free account](https://www.who.int/docs/librariesprovider2/default-document-library/05-smokefree-environments-tobacco-factsheet-2024.pdf?download=true&sfvrsn=f26822e1_2) supplies public-place restriction context without replacing national rules. [Japan's Environment Ministry's Shiretoko account](https://www.goko.go.jp/multilingual_eng/) supports retained natural landscapes in Hokkaido. [ICAR's pomato account](https://epubs.icar.org.in/index.php/IndHort/article/view/111223) establishes the crop name; no yield or grafting method is imported. [RSC's acid/alkali account](https://edu.rsc.org/cpd/acids-bases-and-salts/3009612.article) supplies neutralization/litmus context without a protocol. [UC IPM's rat account](https://ipm.ucanr.edu/home-and-landscape/rats/) supplies reproduction context. [The Sen-i-News publisher](https://sen-i-news.co.jp/) establishes its textile-industry subject; no circulation figure or ranking is asserted. Consulted 2026-10-27. These are authored AI-assisted checks and do not imply human teacher signoff. Pinned dictionary and phrase-source files remain unchanged; no source prose or exercise is imported.

| Inventory measure | Before 5bv | After 5bv |
| --- | ---: | ---: |
| N1 explicit example decisions | 1,908 | 2,058 |
| N1 pending example records/sentences | 757 / 1,377 | 607 / 1,104 |
| N1 pending nonliteral-match records | 0 | 0 |
| N1 effective examples | 4,017 | 3,964 |
| N1 reviewed nonliteral examples | 575 | 575 |
| All effective examples | 11,138 | 11,085 |
| Dictionary-selected examples | 9,760 | 9,980 |
| Dictionary-omitted examples | 2,575 | 2,628 |
| Phrase-selected/omitted examples | 1 / 1 | 1 / 1 |
| Records without examples | 1,299 | 1,313 |
| Original snapshots | 3,049 | 3,089 |
| Global nonliteral inventory signals | 1,846 | 1,846 |

After 5bv source catalog SHA-256: `baf729d864ad154c36ed02e2be42431a9f94ba3ad513cf2402bdd56e82325305`.
After 5bv canonical study SHA-256: `24f89a945fc7ae2f00a1447ef3e826989451bdffa38e68935c051c374be83ee5`.
After 5bv review-row SHA-256: `1144bc62bafda02149e555c339072faf6fc8ef70dc9f7f4caa02501c9e9cdf9c`.

## Tenth N1 literal example cohort (5bw)

The tenth **150 N1 literal-match-only records**, from `adad28a5c4` through `c21a451e73`, account for **268 sentences: 210 retained unchanged and 58 omitted**. The existing contract receives **47 extensions and 103 new retain decisions**. Only **46 example arrays** change; **12 two-sentence and nine single-sentence records** become empty. Complete originals survive in **3,135 snapshots**, 46 more than before. The full before/after comparison confirms unchanged definitions, primary readings, levels, dictionary evidence, earlier review fields/snapshots, canonical mappings and all **10,157 records outside the cohort**. Kept examples remain complete original objects in original order. The existing compiler, validators and shared assertions are reused; production logic and schemas are unchanged.

Selected senses distinguish possessed 持てる from popularity, honorary 名誉 from prestige, business-related 無用 from unnecessary, the barrage suffix 攻め from an attack noun, employment 採用 from adoption, a screenplay シナリオ from a general scenario, navigation コンパス from drawing compasses, general seedlings 苗 from the selected rice seedlings, and colloquial radiation/material 放射能 from the selected radioactivity property. 僕・ぼく does not establish the separate servant noun 僕・しもべ. Maya/Julian-calendar 暦 uses the suffix れき specified by the pinned entry, not declared こよみ. Continuative 進み and purpose-form 片付け do not establish the separate nouns; nominal 後片付け remains. Inflected 待ち構えた and 構えた do not establish the separate noun 構え. Selected retained citations include social-project 事業 sense 2, time-spanning またがる sense 2, prestige 名誉 sense 2, unnecessary 無用 sense 2, harmony 和 sense 2, comrades 同志 sense 2, flattery 甘口 sense 2, busy-schedule 過密 sense 2, camera-operator カメラマン sense 2, district 区 sense 2, sympathy 共鳴 sense 2 and honorific 女史 sense 2. Exact retained prestige, cameraman and shape citations receive explicit regression assertions.

Translation checks preserve unanimous approval versus a full committee, possible versus categorical moral testing, original form versus a generic model, fragments of time versus irregular times, current plans versus past plans, a lecture versus an argument, kindness versus misfortune, a place of origin versus nationality, ready confession versus candor, and a particular person versus a newly assigned addressee. Added gender, ownership, difficulty, rankings, purposes and processing alternatives are documented per sentence. The conditional coincidence proverb does not become an inevitability of events arriving in threes. The deer-capture sentence loses yesterday and adds a hunting purpose; the fish-cooling sentence adds a named freezing alternative. The duplicated reception wording, unsuitable English, unresolved furigana, and hospital-bed counter annotated とこ instead of しょう are omitted without repairs. Unanchored diplomatic status, historical EC negotiations, the unspecified 1609 colony-founding claim, an unqualified normal lifespan, a causal workforce/demand claim and a zero-radioactivity rain assertion are omitted with contextual reasons. The founding omission does not claim that no English colonial activity occurred in 1609 or silently replace the year with 1607.

Full eligible senses, productive compounds, broad form/appearance, idioms, ordinary viewpoints and bounded narratives remain. Paste-like and cube-shaped 状 are within the broad selected form/appearance sense. The Windows-family/root statement remains an introductory role analogy, without equating security mechanisms or adding setup instructions. Integrated iron-and-steel works support the conventional steel-factory rendering of 製鉄工場. Fine is attested as an intensive, preserving fine contempt; flat describes monotonous life; got in describes election; day and night can express sustained effort; wedding big day, present lot, seeing in a different light, eyes playing tricks, on a roll and a compliment on a finished job remain natural contextual renderings. Conventional billing experiences, private feelings, classroom/flight announcements and shared-plan perspectives remain distinct from newly assigned gender or ownership. Personal medical encounters, an unnamed dated recurrence narrative, moral opinions and unnamed historical accounts do not become clinical forecasts, sentencing rules or current-holder claims. The full eligible そうきゅう word remains; no unsupported reading restriction is invented. A commercial provider's value-for-money statement and opinions about real-estate prices remain language examples, not offered prices or investment recommendations.

Cross-sentence checks preserve the earlier omissions of the unspecified Indigenous-group weapon characterization, the categorical powder-explosion assertion without its necessary conditions, and the company president's added male identity. The same source can remain valid for a different selected lexical sense: watching for a chance does not attest nominal 構え, and a physical leak does not attest the precise radioactivity property. All earlier review entries and source snapshots remain untouched; this cohort adds decisions only to its own 150 records.

After 5bw, N1 had **2,208 explicit example decisions and 3,906 effective examples**; all **575 reviewed valid nonliteral examples** remain. Its remaining queue is **457 literal-match-only records/836 sentences**, with **zero pending nonliteral-match records**. N1 example review is not complete; N5/N4/N3/N2 completion remains unchanged. Cumulative totals are **7,182 meaning reviews (1,146 correct/6,036 retain)**, **10,190 dictionary-selected examples/2,686 dictionary omissions**, plus the unchanged **one phrase selection/one phrase omission**. Combined explicit totals are **10,191 retained/2,687 omitted**. There are **11,027 effective examples**, **1,334 records without examples** and **1,846 nonliteral inventory signals**, including reviewed valid forms. All **17,218 meanings, 10,291 units, 10,307 members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections, four phrase attestations and three pinned phrase sources** remain. Exact/equivalent/phrase meaning counts stay at **14,686/2,526/six**; no dictionary or construction meaning gap reopens. The older immutable application Japanese **DRAFT** snapshot is not refreshed or published.

Section 5bw consults [Merriam-Webster's fine entry](https://www.merriam-webster.com/dictionary/fine) for its intensive use. [小学館's 床 account](https://kotobank.jp/word/床-144954) identifies しょう as the hospital-bed counter. [The Kawagoe festival's float account](https://kawagoematsuri.jp/dashi/) supports the three/four-wheel alternatives. [The Supreme Court's map](https://www.courts.go.jp/english/vc-files/courts-en/file/AccessMap.pdf) supports palace proximity, while [the Imperial Household Agency](https://sankan.kunaicho.go.jp/multilingual/lang/en/koukyo/index.html) supports the imperial-residence context.

[MHLW's obstetrician account](https://shigoto.mhlw.go.jp/User/Occupation/Detail?occupationId=406) supplies workforce context without proving that a decline in births alone explains physician supply. [Canada's 2012 suspension statement](https://www.canada.ca/en/news/archive/2012/09/canada-closes-embassy-iran-expels-iranian-diplomats-canada.html) provides the historical event; it does not supply the missing date on the card or certify present relations indefinitely. [NPS's Jamestown chronology](https://www.nps.gov/jame/learn/historyculture/a-short-history-of-jamestown.htm) and [Yale's primary 1609 charter text](https://avalon.law.yale.edu/17th_century/va02.asp) distinguish settlement and charter events without rewriting the unspecified founding statement. [Cunningham's 1850 London account](https://www.victorianlondon.org/legal/longvacation.htm) supplies historical social-season context for June; it is not a current event timetable. [ONS's population-density material](https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/bulletins/annualmidyearpopulationestimates/mid2019/pdf) supplies dated regional context without a new current ranking.

[RSC's iron](https://periodic-table.rsc.org/element/26/Iron) and [hydrogen](https://periodic-table.rsc.org/element/1/Hydrogen) entries support the retained atomic numbers and element context. [NOAA's salt-water account](https://oceanservice.noaa.gov/education/dyw-pass-salt.html) supports the ordinary comparable-condition buoyancy contrast. [JFE's ironworks/steelmaking account](https://www.jfe-steel.co.jp/en/company/about.html) supplies integrated-works language, without treating iron and steel as identical substances or importing a production method. [Microsoft's UAC account](https://learn.microsoft.com/en-gb/windows/security/application-security/application-control/user-account-control/how-it-works) documents token/elevation distinctions; the retained root analogy does not override those distinctions. [Wines of Germany's sweetness account](https://www.winesofgermany.com/our-wine/wine-tasting/wine-tasting/195/levels-of-sweetness-in-german-wines) supplies range-of-styles context; the retained sentence attributes an impression rather than certifying all German wines as sweet.

[OSHA's combustible-dust account](https://www.osha.gov/combustible-dust) supplies the conditions missing from the omitted categorical powder-explosion assertion. [Japan's Environment Ministry](https://www.env.go.jp/chemi/rhm/current/01-01-02.html) distinguishes radioactivity, radiation and radioactive material, including the colloquial overlap. These contextual sources do not add thresholds, exposure advice, procedures, legal eligibility rules or replacement facts to the cards. Consulted 2026-10-27. The decisions are AI-assisted annotations and do not imply human teacher signoff. Pinned dictionary and phrase-source files remain unchanged; no source prose or exercise is imported.

| Inventory measure | Before 5bw | After 5bw |
| --- | ---: | ---: |
| N1 explicit example decisions | 2,058 | 2,208 |
| N1 pending example records/sentences | 607 / 1,104 | 457 / 836 |
| N1 pending nonliteral-match records | 0 | 0 |
| N1 effective examples | 3,964 | 3,906 |
| N1 reviewed nonliteral examples | 575 | 575 |
| All effective examples | 11,085 | 11,027 |
| Dictionary-selected examples | 9,980 | 10,190 |
| Dictionary-omitted examples | 2,628 | 2,686 |
| Phrase-selected/omitted examples | 1 / 1 | 1 / 1 |
| Records without examples | 1,313 | 1,334 |
| Original snapshots | 3,089 | 3,135 |
| Global nonliteral inventory signals | 1,846 | 1,846 |

After 5bw source catalog SHA-256: `3d0b8a204f4a48ea0575a4dc811c35a0414628dc9b107afd88b97935b2994760`.
After 5bw canonical study SHA-256: `5e39b20298736ab48387910711862b23fd43a12df72fe6c113315fabc7d5366d`.
After 5bw review-row SHA-256: `fd502b2656cb97cb21e9661c266965dd9122a9e75e413a7bf8f87f5473ed34bb`.

## Eleventh N1 literal example cohort (5bx)

The eleventh **150 N1 literal-match-only records**, from `c21c8f79da` through `d5bc2a73b1`, account for **278 sentences: 217 retained unchanged and 61 omitted**. The existing contract receives **51 extensions and 99 new retain decisions**. Only **53 example arrays** change; **eight two-sentence and five single-sentence records** become empty. Complete originals survive in **3,185 snapshots**, 50 more than before. The full before/after comparison confirms unchanged definitions, primary readings, levels, dictionary evidence, earlier review fields/snapshots, canonical mappings and all **10,157 records outside the cohort**. Kept examples remain complete original objects in original order. The existing compiler, validators and shared assertions are reused; production logic and schemas are unchanged.

Literal matching does not establish word identity: レンジ inside オレンジ and トーン inside ストーン do not attest the appliance or tone nouns. The physical ドリル example lacks context establishing the selected tool rather than the common practice-drill sense. Selected senses separate sacrifice from a victim, general relay from broadcasting, poisoning from addiction, drive-in service from a roadside rest stop, a cereal ear from a grafting scion, nominal movement from inflected 動きまわる, institutional establishment from equipment installation, general distribution from rationing, and kind/type from the equal/peer component in たぐいまれ. The productive 使い心地 suffix requires ごこち, while its source furigana says ここち; the explicitly annotated standalone ここち remains. Unannotated modern 予言 does not establish archaic かねごと. The オープン戦 suffix requires せん, not the source's incorrect いくさ annotation; the explicitly annotated battle proverb remains. Selected retained citations include figurative-result 産物 sense 2, splinter 刺 sense 2, gymnastics 鉄棒 sense 2, administrative 行政 sense 2, almighty/all-round 万能 sense 2, physical/social 圧力 senses 1/2, screwdriver/driver senses 2/1, notice 無断 sense 2, illness ダウン sense 3, particular/fussy 五月蝿い sense 3, and adjectival-composite 総合 sense 2. Exact result, administration and super-prefix citations receive explicit regression assertions.

Translation checks preserve reduced fat versus eliminated fat, hits versus bull's-eyes, monthly tuition/installments versus unspecified payment intervals, not necessarily both versus neither parent being alive, thinking about an attempt versus actually attempting it, a reservation versus immediately renting, a written application versus merely applying, an actual requirement versus a recommendation, and most clogs versus practically all sediment. Added gender, crystal subtype, ownership, abundance, rankings, missing list context and unsuitable English are documented per sentence. The tenacity proverb does not establish always winning. The one-in-ten myopia claim, unscoped tax-liability assertions, all-time company ranking, broad gender/fashion claims, present Fed intervention, universal fire-engine priority and the undifferentiated surgical risk-reduction claim are omitted with contextual reasons. The surgical omission does not deny findings from identified trials; their populations and viral outcomes remain distinct. No replacement statistic, rate, rule, prognosis, sentence, translation, reading or furigana is authored.

Full eligible senses, meaningful compounds, idioms and ordinary discourse perspectives remain. Rush hour preserves アワー; a pictured or narrated object need not repeat its component gloss in literal English. Abroad can mean in circulation, an encore can be an additional performed piece, take a newspaper means subscribe, and pressure points can denote figurative sensitivities. Great speed conveys the Concorde's extreme speed without a fabricated numeric threshold. Court is within the full law-court sense, including the institutional metonymy; no physical-room-only restriction is invented. Profits fits broad earnings/returns. Ordinary billing, physician-patient utterances, household subscriptions, a generic captain's role, an unnamed author's publication, clothing/meal descriptions, counter allophones, maxims and personal wishes remain distinct from newly assigned identities or current policy claims. The dog/hearing and qualified longevity comparisons, water/sound comparison, Earth/orange analogy, yoga's possible stress benefit, Bismarck torpedo narrative, Japan's oil-supplier reliance, Victoria's historical sovereignty, Roman-state persecution and Toei's 1986 film release have contextual source checks. These checks do not convert rhetoric or unnamed illustrative statements into measured universal guarantees.

Cross-sentence checks found only distinctions explained by the selected target: the Earth/orange analogy is valid on 形/オレンジ and the ripening sentence on 成熟, while both fail the unrelated レンジ appliance; nuisance remains valid on the separately selected annoying sense of 煩い; the adjective 優しい does not attest prefix 優; and adverb おおいに does not attest the hey/ahoy interjection. All earlier review entries and snapshots remain untouched.

N1 now has **2,358 explicit example decisions and 3,845 effective examples**; all **575 reviewed valid nonliteral examples** remain. Its remaining queue is **307 literal-match-only records/558 sentences**, with **zero pending nonliteral-match records**. N1 example review is not complete; N5/N4/N3/N2 completion remains unchanged. Cumulative totals are **7,281 meaning reviews (1,146 correct/6,135 retain)**, **10,407 dictionary-selected examples/2,747 dictionary omissions**, plus the unchanged **one phrase selection/one phrase omission**. Combined explicit totals are **10,408 retained/2,748 omitted**. There are **10,966 effective examples**, **1,347 records without examples** and **1,846 nonliteral inventory signals**, including reviewed valid forms. All **17,218 meanings, 10,291 units, 10,307 members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections, four phrase attestations and three pinned phrase sources** remain. Exact/equivalent/phrase meaning counts stay at **14,686/2,526/six**; no dictionary or construction meaning gap reopens. The older immutable application Japanese **DRAFT** snapshot is not refreshed or published.

Section 5bx consults Merriam-Webster's [abroad](https://www.merriam-webster.com/dictionary/abroad), [encore](https://www.merriam-webster.com/dictionary/encore) and [pressure point](https://www.merriam-webster.com/dictionary/pressure%20point) entries for circulation, additional performance and figurative sensitivity. These contextual usages do not replace pinned JMdict sense numbers or dictionary links.

[WHO's vision report](https://www.who.int/docs/default-source/documents/publications/world-vision-report-accessible.pdf) supplies population/period context for prevalence rather than a universal one-in-ten figure. [WHO's longevity account](https://www.who.int/news/item/04-04-2019-uneven-access-to-health-services-drives-life-expectancy-gaps-who) supports the qualified population-level comparison rather than identical individual lifespans. [NCCIH's yoga account](https://www.nccih.nih.gov/health/yoga-effectiveness-and-safety) supports a possible stress benefit without a regimen. [CDC's herpes account](https://www.cdc.gov/std/treatment-guidelines/herpes.htm) distinguishes trial populations and outcomes; [the Rakai HPV trial](https://pubmed.ncbi.nlm.nih.gov/20370483/) concerns identified high-risk HPV outcomes in a defined population. Those findings are not a replacement for the omitted sentence's broad viral/cancer claim. [CPNI's canine-training material, hosted by Surrey Police](https://www.surrey.police.uk/SysSiteAssets/media/downloads/surrey/about-us/dog-school/new-course-admin-forms/cpni-canine-detection-all-documents.pdf) supplies hearing-range/threshold context without claiming superiority at every frequency or for every animal.

[NOAA's sound account](https://oceanservice.noaa.gov/facts/sound.html) supports ordinary water/air transmission context without a universal propagation formula. [The Royal Navy's Bismarck account](https://www.royalnavy.mod.uk/news/2021/may/27/20210527-bismarck-sunk) documents torpedo hits alongside scuttling; the retained narrative does not claim torpedoes were the only cause or provide tactical instructions. [METI's 2025 energy account](https://www.enecho.meti.go.jp/en/category/brochures/pdf/japan_energy_2025.pdf) supports reliance on suppliers including Saudi Arabia and the UAE without importing a new percentage. [The Royal Family's Victoria history](https://www.royal.uk/queen-victoria) supports historical sovereignty. [Original research on early Christian persecution](https://academic.oup.com/past/article/261/1/3/6982747) supplies historical complexity rather than identical conduct by every Roman citizen. [Toei's catalog](https://www.toei-video.co.jp/pdf/toeivideo-catalog202101.pdf) and [NFAJ's film record](https://nfad.nfaj.go.jp/det.php?data_id=782) support the 1986 film identity/release context; no film material is imported.

[France's Interior Ministry](https://www.interieur.gouv.fr/prefectures) distinguishes prefectural administration at region/department level without rewriting territorial terminology on the omitted card. [The Road Traffic Act text](https://www.japaneselawtranslation.go.jp/en/laws/download/2962/14/s35Aa001050214je11.0_h27A76.pdf) provides emergency-vehicle conditions; it does not turn the unqualified sentence into current legal guidance. IRS material on [rates/brackets](https://www.irs.gov/filing/federal-income-tax-rates-and-brackets) and [taxable income](https://www.irs.gov/filing/taxable-income) distinguishes bracketed rates and exemptions; no tax rate, deduction or individual liability is imported. Consulted 2026-10-27. The decisions are AI-assisted annotations and do not imply human teacher signoff. Pinned dictionary and phrase-source files remain unchanged; no source prose or exercise is imported.

| Inventory measure | Before 5bx | After 5bx |
| --- | ---: | ---: |
| N1 explicit example decisions | 2,208 | 2,358 |
| N1 pending example records/sentences | 457 / 836 | 307 / 558 |
| N1 pending nonliteral-match records | 0 | 0 |
| N1 effective examples | 3,906 | 3,845 |
| N1 reviewed nonliteral examples | 575 | 575 |
| All effective examples | 11,027 | 10,966 |
| Dictionary-selected examples | 10,190 | 10,407 |
| Dictionary-omitted examples | 2,686 | 2,747 |
| Phrase-selected/omitted examples | 1 / 1 | 1 / 1 |
| Records without examples | 1,334 | 1,347 |
| Original snapshots | 3,135 | 3,185 |
| Global nonliteral inventory signals | 1,846 | 1,846 |

After 5bx source catalog SHA-256: `c0290858c1f000eea53b72b7034cbc6195a1085e343ce838d67e5ee911fc9641`.
After 5bx canonical study SHA-256: `d2ec510cffe040bf8f7462354dded304b1c81e1ed1374661ce31d58d6a3a8258`.
After 5bx review-row SHA-256: `e98f6d546707eb039f2aaf3358950ccc5dbf601a6eb219bbe8501df3a97195cb`.

## Twelfth N1 literal example cohort (5by)

The twelfth **150 N1 literal-match-only records**, from `d5c389a11d` through `eb3966f9f5`, account for **265 sentences: 204 retained unchanged and 61 omitted**. The existing contract receives **54 extensions and 96 new retain decisions**. Only **51 example arrays** change; **ten two-sentence and six single-sentence records** become empty. Complete originals survive in **3,236 snapshots**, 51 more than before. The full before/after comparison confirms unchanged definitions, primary readings, levels, dictionary evidence, earlier review fields/snapshots, canonical mappings and all **10,157 records outside the cohort**. Kept examples remain complete original objects in original order. The existing compiler, validators and shared assertions are reused; production logic and schemas are unchanged.

Literal matching does not establish word identity: ワット inside スクワット and スプリング inside スプリングフィールド do not attest the watt or coil-spring nouns. Inflected 商う・あきなう does not attest 商・しょう meaning quotient. The source annotates the side in 出席者の側 as そば instead of the required がわ, and 病 inside 感染病 as やまい instead of びょう. Selected senses separate orchestral conducting from general direction, environmental conservation from guardianship/protection, dignity from aroma, no-longer from already/now, verbal finding-useful from adjectival convenience, outlook from appearance/spectacle, pace/progress from walking, real/effectively from essence, cost-bearing from a burden noun, and Christian witnessing action from ordinary evidence/testimony. Full selected-sense citations retain 何より sense 2, hollow-sounding 空ろ sense 2, wholehearted 一心 sense 2, hungry/servile ぺこぺこ senses 1/2, private-business 私用 sense 2, tight/exact きっちり senses 2/1, floor/counter 階 senses 1/4, biological 進化 sense 1, oppression 圧迫 sense 2 and noun/conjunction 他方 senses 1/2. Exact retained best, private-business and biological-evolution citations receive explicit regression assertions.

Translation checks preserve confidence versus bravery, a lead role versus merely featuring an actor, steam propulsion versus an unspecified liner, singular versus plural referents, document quantity versus document size, intuitive hunches versus spotting an offender, barely managing versus confident ability, non-effacement versus knowing how to assert oneself, a pretext versus a neutral defence plea, a counterattack versus an unspecified response/defensive effort, a bureaucratic post versus a cabinet seat, staging versus acting alone, available land versus purchased land, completed versus present events, and prenatal development versus growing up. Added ownership, gender, proper-name substitutions, missing figure/comparison context and unsuitable English are documented per sentence. The unqualified bulk-price guarantee, unspecified city superlative, generic male-hunter/female-prey characterization and jurisdiction-free voting-entitlement assertion are omitted. The AIDS example's correct toilet-seat denial does not fix its conflation of HIV infection with AIDS; it is omitted without replacing either language. No replacement sentence, translation, reading, furigana, clinical claim, legal rule or price is authored.

Full eligible senses, meaningful compounds, idioms, maxims and ordinary discourse perspectives remain. The wholesaler idiom preserves its explicitly annotated とんや noun; broad scoring includes goals; reissue/reuse preserves the productive 再 prefix; the crewmember comparison does not become a military squad; a hollow auditory quality is within the full selected expression/sound sense. The political and pain/burden maxims remain value judgments; the silence-as-consent proverb does not become a rule for actual consent. The named music-shop introduction, conventional fisherman anaphora, existing Chart 2 description and promotional Oscar superlative follow their earlier contextual reviews. Shared holidays, service-restoration announcements, unnamed local services, family/career narratives, personal medical experiences and questions remain bounded illustrative utterances. The USB cup warmer is a narrated product, not a recommendation. The Greek democratic-institution origin, Tudor dynasty's 1603 end, Osaka's 2021 Tokyo 2020 cauldron lighting, English civil wars, US constitutional checks and balances, upper-atmosphere pollution, biological evolution/extinction, female kangaroo pouch and Koko's sex have contextual source checks. The smoking/snoring sentence states an association supported by primary population research; it does not prescribe treatment or assert that every smoker snores.

Cross-sentence checks preserve the earlier omissions for the lost self-defence pretext, unqualified recorded-silence assertion and unclear counterattack relation. Earlier retained chart, music-shop, Oscar and fishing sentences remain retained here. Different target identities, senses or readings still explain other differences: an orchestra does not establish the selected general-direction sense of 指揮; noticing in an eyes-only request does not establish fastening 留める; leisure remains valid while outlook 観 is unselected; reopening can fail a selected initial-opening sense while its closed section remains valid; an unannotated 少女 cannot establish おとめ. All earlier review entries and snapshots remain untouched.

N1 now has **2,508 explicit example decisions and 3,784 effective examples**; all **575 reviewed valid nonliteral examples** remain. Its remaining queue is **157 literal-match-only records/293 sentences**, with **zero pending nonliteral-match records**. N1 example review is not complete; N5/N4/N3/N2 completion remains unchanged. Cumulative totals are **7,377 meaning reviews (1,146 correct/6,231 retain)**, **10,611 dictionary-selected examples/2,808 dictionary omissions**, plus the unchanged **one phrase selection/one phrase omission**. Combined explicit totals are **10,612 retained/2,809 omitted**. There are **10,905 effective examples**, **1,363 records without examples** and **1,846 nonliteral inventory signals**, including reviewed valid forms. All **17,218 meanings, 10,291 units, 10,307 members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections, four phrase attestations and three pinned phrase sources** remain. Exact/equivalent/phrase meaning counts stay at **14,686/2,526/six**; no dictionary or construction meaning gap reopens. The older immutable application Japanese **DRAFT** snapshot is not refreshed or published.

Section 5by consults [KanjiPedia's がわ entry](https://www.kanjipedia.jp/kotoba/0004347800) and [Cambridge's 側 entry](https://dictionary.cambridge.org/ja/dictionary/japanese-english/%E5%81%B4) for the side/nearby reading distinction. [Merriam-Webster's bitter entry](https://www.merriam-webster.com/dictionary/bitter) supports the harsh-remarks rendering. These contextual checks do not replace pinned JMdict sense numbers or dictionary links.

The [British Museum's Athens gallery](https://www.britishmuseum.org/collection/galleries/greece-athens-and-lycia) supplies conventional Greek-democracy context, without a claim that every earlier collective decision process began there. [Historic Royal Palaces](https://www.hrp.org.uk/hampton-court-palace/history-and-stories/henry-viiis-children/) supports the Tudor dynasty's 1603 end. The [WTA's contemporary report](https://www.wtatennis.com/news/2196370/osaka-lights-olympic-cauldron-as-tokyo-2020-gets-underway) and [IOC Tokyo 2020 dates](https://www.olympics.com/ioc/news/ioc-tokyo-2020-q-a) support Osaka's cauldron lighting in 2021. The [National Army Museum](https://www.nam.ac.uk/explore/british-civil-wars) and [US National Archives](https://www.archives.gov/founding-docs/constitution/what-does-it-say) support the civil-war and constitutional-balance context. No actual contemporary officeholder, forecast, legal eligibility or timetable is asserted.

[NOAA's stratospheric observations](https://csl.noaa.gov/news/2023/388_1016.html), the [Smithsonian's extinction resource](https://naturalhistory.si.edu/education/teaching-resources/paleontology/extinction-over-time), the [Australian Museum's kangaroo account](https://australian.museum/learn/animals/mammals/red-kangaroo/) and the [Gorilla Foundation's study description](https://www.koko.org/communication/) support the bounded science and animal context. Koko's [2018 death](https://www.koko.org/about/gorilla-koko/) remains distinct from identification of her sex. The [primary smoking/snoring study](https://pubmed.ncbi.nlm.nih.gov/15242843/) supports association without importing its statistics or a causal/treatment claim. [WHO dietary guidance](https://www.who.int/health-topics/healthy-diet) supports the broad vegetable/health context. [CDC's AIDS definition](https://www.cdc.gov/nchs/hus/sources-definitions/aids.htm) distinguishes infection from advanced disease, while its [transmission education resource](https://stacks.cdc.gov/view/cdc/155843/cdc_155843_DS1.pdf) confirms the toilet-seat denial; the source example remains omitted for terminology. These are contextual checks, not new learner content or human teacher signoff.

| Inventory measure | Before 5by | After 5by |
| --- | ---: | ---: |
| N1 explicit example decisions | 2,358 | 2,508 |
| N1 effective examples | 3,845 | 3,784 |
| N1 pending records/sentences | 307/558 | 157/293 |
| Corrected / retained meaning reviews | 1,146 / 6,135 | 1,146 / 6,231 |
| Total meaning reviews | 7,281 | 7,377 |
| Dictionary-selected examples | 10,407 | 10,611 |
| Dictionary-omitted examples | 2,747 | 2,808 |
| Effective examples | 10,966 | 10,905 |
| Records without examples | 1,347 | 1,363 |
| Original snapshots | 3,185 | 3,236 |
| Nonliteral inventory signals | 1,846 | 1,846 |

After 5by source catalog SHA-256: `edcf972488471fa0446365245a06b25a1cdd8d882b95b55365e6354e0f2279d3`.
After 5by canonical study SHA-256: `3b9912a9a687a0f9a8d6b269381c7bcd3f7e087c0750fb8c10bc2729087e8196`.
After 5by review-row SHA-256: `d420df602c0718dfe99edc4351288e834a1972f80f04137e131b9e0fd340326e`.

## Thirteenth N1 literal example cohort (5bz)

The thirteenth **150 N1 literal-match-only records**, from `eb4a3a96bc` through `fefc750558`, account for **282 sentences: 213 retained unchanged and 69 omitted**. The existing contract receives **49 extensions and 101 new retain decisions**. Only **59 example arrays** change; **ten two-sentence and six single-sentence records** become empty. Complete originals survive in **3,292 snapshots**, 56 more than before. The full before/after comparison confirms unchanged definitions, primary readings, levels, dictionary evidence, earlier review fields/snapshots, canonical mappings and all **10,157 records outside the cohort**. Kept examples remain complete original objects in original order. The existing compiler, validators and shared assertions are reused; production logic and schemas are unchanged.

Selected lexical identities and readings remain distinct. 微笑みかける comes from ほほえむ, not the selected 微笑・びしょう noun; inflected 取り替える and まとめる do not establish the separate exchange and summary nouns. 慰霊碑 uses ひ, not preserved 碑・いしぶみ. Unannotated modern 天皇 does not establish archaic すめらぎ. Culinary salt does not attest chemical 塩・えん. The age noun in いい歳 requires とし, not the source's さい annotation; the three- and four-year age-difference counters remain. 病 inside 感染病 does not attest standalone やまい, consistent with the earlier omission of the same erroneous annotation. The unresolved #1392580 marker remains omitted without repair. Selected senses separate straw material from a drinking straw, locative home area from attributive local, living in the wild from attributive wild, physical handling and treating-as from service/treatment, homework from a subject/task, hanger from credit, race placement from arrival/clothing counters, humour/alcohol dry from general dryness, figurative mainstay from a physical post, document destruction from annulment, and interrogative what from exclamative 何て.

Translation checks preserve past versus present reverberation, completed versus ongoing relocation, plotting versus attempting an assassination, pressure to resign versus actually quitting, sending versus merely offering a map, looking for versus promising to find a ring, unexcavated versus uncovered sites, challenging versus establishing a world record, aggregate aircraft sorties versus missions, winning versus gaining an advantage, interference versus invasion of privacy, and explicit conditional death versus an unqualified future event. The school founding year 1900 does not become 1990. Added gender, ownership, team identity, varsity context and walk-off scope are documented per sentence. The malformed appeared-to-arms English, unsuitable sympathy particle construction and strengthened bird-care prescription are omitted without rewriting. A pickaxe requirement lacks its game context and is not presented as real-world mining advice. The unsupported never-changed-history assassination assertion, categorical absence of animal reasoning, broad national-character and poverty/crime claims, unscoped nuclear-war extinction predictions, no-sign-of-Martian-life claim, rice-and-fish staple classification, medical eye-distortion explanation, and unqualified rice-price/firearms-law claims receive bounded contextual reasons. No replacement sentence, translation, reading, furigana, statistic, clinical recommendation or legal rule is authored.

Full eligible senses, meaningful compounds, ordinary discourse perspectives, idioms and bounded narratives remain. Formula belongs to the full method sense; attempts belong to the full trial sense; book reviewer, airport information desk, rearing/upbringing, reciprocal incompatibility and aggregated bundle preserve meaningful roots. Nominal upbringing differs from a suffix construction. The original-language book is within the full original-document sense. Breeding, standstill, cause/produce, official post, age differences and the room suffix retain their full scope. Selected citations explicitly retain specification 仕様 sense 2, ordinary ムード sense 1, temporal 合間 sense 1, disgrace 汚れ sense 2, credit 掛け sense 1, causative もたらす sense 2, possession/durability 持ち senses 1/2, arrival 着 sense 1 and annulment 破棄 sense 2. Exact specification, mood and temporal-interval citations receive dedicated assertions. The shoe-on-the-other-foot, short-accounts, pain-in-the-neck, up-the-wall, breath-of-life and life-as-voyage renderings remain contextual idioms or metaphors. Attributed views about nuclear defence, disarmament, freedom, religion and education are not silently converted to measured guarantees. Personal symptoms, a pregnancy-test request, an unanswered food-safety question, an unnamed drug description, retirement announcements, historical communication requests and unnamed financial or construction narratives remain distinct from actual advice, current officeholder claims and published statistics.

Cross-sentence checks preserve the earlier omitted electrical annotation and the erroneous 感染病 reading. The unnamed illustrative business-failure decline remains retained consistently with its earlier review. Other differences follow the selected target: resentment at burden treatment remains valid while the treating-as suffix is unselected on 扱い; the Emperor's institutional role remains valid while the archaic reading is not established; finalizing a deal remains valid on まとめる but not nominal まとめ; whispering remains valid while its question does not use exclamative 何て; age differences remain valid while the generic sibling statement does not attest archaic 弟・おと; refining reading skills remains valid while it does not attest physical-polishing 磨く. All earlier review entries and snapshots remain untouched.

N1 now has **2,658 explicit example decisions and 3,715 effective examples**; all **575 reviewed valid nonliteral examples** remain. Its remaining queue is **seven literal-match-only records/11 sentences**, with **zero pending nonliteral-match records**. N1 example review is not complete; N5/N4/N3/N2 completion remains unchanged. Cumulative totals are **7,478 meaning reviews (1,146 correct/6,332 retain)**, **10,824 dictionary-selected examples/2,877 dictionary omissions**, plus the unchanged **one phrase selection/one phrase omission**. Combined explicit totals are **10,825 retained/2,878 omitted**. There are **10,836 effective examples**, **1,379 records without examples** and **1,846 nonliteral inventory signals**, including reviewed valid forms. All **17,218 meanings, 10,291 units, 10,307 members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections, four phrase attestations and three pinned phrase sources** remain. Exact/equivalent/phrase meaning counts stay at **14,686/2,526/six**; no dictionary or construction meaning gap reopens. The older immutable application Japanese **DRAFT** snapshot is not refreshed or published.

Section 5bz consults the [US Air Force's sortie definition](https://www.af.mil/News/Article-Display/Article/121698/air-mobility-command-officials-set-all-time-sortie-record/) and [mission terminology](https://static.e-publishing.af.mil/production/1/amc/publication/dafman11-401_amcsup/dafman11-401_amcsup.pdf) for the distinction between counted flights and missions. [Oxford's breath entry](https://www.oxfordlearnersdictionaries.com/us/definition/english/breath) supports the indispensability idiom. [Shogakukan's 同情 entry](https://kotobank.jp/word/%E5%90%8C%E6%83%85-580560), alongside the pinned intransitive verb classification, supports retaining the clear に-marked companion instead of the awkward を-marked person. [Shogakukan's Mencius entry](https://kotobank.jp/word/%E5%AD%9F%E5%AD%90-142096) supplies context for the learning-environment proverb. These checks do not replace pinned JMdict sense numbers or dictionary evidence.

[Call's primary great-ape inference study](https://www.eva.mpg.de/documents/Springer/Call_Inferences_AnimCog_2006_1554991.pdf) and [Imperial War Museums' 1914 account](https://www.iwm.org.uk/sites/default/files/press-release/4_August_1914_Factsheet.pdf) contextualize the categorical animal-reasoning and assassination claims without importing replacement lessons. [NASA/JPL's September 2025 report](https://www.jpl.nasa.gov/news/nasa-says-mars-rover-discovered-potential-biosignature-last-year/) distinguishes potential biosignatures from confirmed Martian life. [Xia and colleagues' primary nuclear-food-system study](https://www.nature.com/articles/s43016-022-00573-0) models distinct conflict scenarios rather than establishing inevitable human extinction after any nuclear war; no model output, casualty estimate or new forecast is inserted into the corpus. The [National Eye Institute](https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/color-blindness) distinguishes inherited and acquired causes of colour-vision deficiency from the source's eye-distortion explanation. Its omission does not make a new general claim about curability.

[MAFF's food-group guide](https://www.maff.go.jp/j/balance_guide/b_use/pdf/eng_reiari.pdf) distinguishes rice/grain dishes from fish/meat dishes. The [CPF Board's overview](https://www.cpf.gov.sg/member/cpf-overview) confirms general retirement-income support, without importing rates, eligibility ages or recommendations. [FHWA's reinforced-concrete account](https://www.fhwa.dot.gov/publications/research/infrastructure/structures/ltbp/16012/index.cfm) supports the ordinary steel-bar description without a construction specification. [Nara Prefecture's cultural-heritage account](https://www.pref.nara.jp/secure/253850/WHJ04en_web.pdf) supports the broad concentration of designated properties without a new count. [WHO sun-exposure guidance](https://www.who.int/news-room/questions-and-answers/item/radiation-protecting-against-skin-cancer) supports the general prolonged-sun warning without a duration or regimen. [ATF's licensee reference](https://www.atf.gov/firearms/tools-and-services-firearms-industry/current-licensees/federal-firearms-licensee-quick-reference-and-best-practices-guide) demonstrates that federal and state conditions matter; no replacement legal rule is inserted. [Fluke's safety guidance](https://www.fluke.com/en-au/learn/blog/maintenance-monitoring/how-to-use-a-multimeter-guide) supplies technical context only: neither the bypass proposal nor the unresolved annotated circuit sentence is selected, and no repair procedure is authored. These contextual checks are not human teacher signoff.

| Inventory measure | Before 5bz | After 5bz |
| --- | ---: | ---: |
| N1 explicit example decisions | 2,508 | 2,658 |
| N1 effective examples | 3,784 | 3,715 |
| N1 pending records/sentences | 157/293 | 7/11 |
| Corrected / retained meaning reviews | 1,146 / 6,231 | 1,146 / 6,332 |
| Total meaning reviews | 7,377 | 7,478 |
| Dictionary-selected examples | 10,611 | 10,824 |
| Dictionary-omitted examples | 2,808 | 2,877 |
| Effective examples | 10,905 | 10,836 |
| Records without examples | 1,363 | 1,379 |
| Original snapshots | 3,236 | 3,292 |
| Nonliteral inventory signals | 1,846 | 1,846 |

After 5bz source catalog SHA-256: `9aa9d5e8b4e0e813513036128b2169131b0b4e823832fbcc8867cb707c674f21`.
After 5bz canonical study SHA-256: `89e5dfb6c227dacb2893068d701204c4ba64d475de8950f8d1388b5ab7cda044`.
After 5bz review-row SHA-256: `d313085290620fc730d2bcaf2c77592d1dffd07ed464fb553027368ecdeed79f`.

## Final N1 literal example cohort (5ca)

The final **seven N1 literal-match-only records**, from `ff3f63ebf1` through `ffe3908e99`, account for **11 sentences: eight retained unchanged and three omitted**. The existing contract receives **three extensions and four new retain decisions**. Only **three example arrays** change; the single wine example becomes empty. Complete originals survive in **3,295 snapshots**, three more than before. The full before/after comparison confirms unchanged definitions, primary readings, levels, dictionary evidence, earlier review fields/snapshots, canonical mappings and all **10,300 records outside the cohort**. Kept examples remain complete original objects in original order. The existing compiler, validators and shared assertions are reused; production logic and schemas are unchanged.

幾多 retains the many-difficulties example but omits the present/future obligation rendered as past had to. 富豪 retains the unnamed millionaire's poor-boy background but omits the added male identity in the gender-neutral wealthy-person marriage sentence. The unqualified bottling-only 国産ワイン classification lacks historical/jurisdictional scope and is omitted after consulting the National Tax Agency's manufacturing/origin distinctions; no replacement definition or label rule is inserted. The existing nominal domestic-products meaning remains unchanged.

Both 壷 container examples retain selected sense 1, including the small remaining sugar quantity and several old coins. The full 鈍感 sense includes insensitivity and responsiveness to trends, preserving the qualified social criticism and not-having-a-nose idiom as contextual judgments. 所定's full selected prescribed/fixed sense includes designated. 主権 retains the popular-sovereignty principle as a constitutional or political principle rather than a claim of uniform institutions everywhere. Hosts of difficulties preserves numerous, and cope with includes successful dealing with difficulty. Exact many, fixed and sovereignty citations receive explicit assertions. No duplicate sentence from this final cohort appears in an earlier reviewed record; earlier reviews remain untouched.

The **N5–N1 vocabulary example-selection queue is complete**, with no pending example-bearing records. N1 has **2,665 explicitly reviewed dictionary example records and 3,712 effective examples**, including all **575 reviewed valid nonliteral forms**. Of its 3,124 records, **458 were already empty** and the earlier documented correction for 中っ腹 (`8814988b80`) removed one original sentence; those 459 members remain separately accounted for. Across all **7,924 vocabulary records**, **7,241 have dictionary example decisions and two have phrase example decisions**. The other **681** comprise **678 pre-existing empty records and three earlier root-correction omissions containing four original sentences**: 中っ腹, お元気で and しいんと. The existing phrase evidence and earlier root-correction patches remain unchanged. Completion covers the named pinned community corpus and example-selection accounting; it does not assert an exhaustive official JLPT list or human teacher signoff.

Cumulative totals are **7,482 meaning reviews (1,146 correct/6,336 retain)**, **10,832 dictionary-selected examples/2,880 dictionary omissions**, plus the unchanged **one phrase selection/one phrase omission**. Combined explicit totals are **10,833 retained/2,881 omitted**. All **10,833 effective examples** now equal dictionary selections plus the phrase selection. There are **1,380 records without examples** and **1,846 nonliteral inventory signals**, including reviewed valid forms. All **17,218 meanings, 10,291 units, 10,307 members, 161 overlap families, 16 variant groups, 408 level decisions, 76 root corrections, four phrase attestations and three pinned phrase sources** remain. Exact/equivalent/phrase meaning counts stay at **14,686/2,526/six**; no dictionary or construction meaning gap reopens. The older immutable application Japanese **DRAFT** snapshot is not refreshed or published.

Section 5ca consults the [National Tax Agency's wine-label leaflet](https://www.nta.go.jp/about/organization/osaka/sake/wine/pdf/displayrule_leaflet.pdf) and [later label-rule account](https://www.nta.go.jp/taxes/sake/hambai/moderutekisuto/pdf/r07_07_07.pdf). They distinguish domestic manufacture, including wine using imported raw materials, Japan wine made from domestic grapes, and imported wine. This context does not support an unqualified bottling-only rule; no statutory replacement or claim that all domestically manufactured wine uses only Japanese grapes is authored. [Cambridge's cope entry](https://dictionary.cambridge.org/dictionary/english/cope) supports the successful-dealing paraphrase. The [official Constitution translation](https://www.japaneselawtranslation.go.jp/en/laws/download/174/09/s21Ak000010101en3.0.pdf), in its preamble and Article 1, supplies context for popular sovereignty without asserting that all states share that constitutional arrangement. These contextual sources do not replace pinned JMdict sense numbers or dictionary evidence.

| Inventory measure | Before 5ca | After 5ca |
| --- | ---: | ---: |
| N1 explicit example records | 2,658 | 2,665 |
| N1 effective examples | 3,715 | 3,712 |
| N1 pending records/sentences | 7/11 | 0/0 |
| Corrected / retained meaning reviews | 1,146 / 6,332 | 1,146 / 6,336 |
| Total meaning reviews | 7,478 | 7,482 |
| Dictionary-selected examples | 10,824 | 10,832 |
| Dictionary-omitted examples | 2,877 | 2,880 |
| Effective examples | 10,836 | 10,833 |
| Records without examples | 1,379 | 1,380 |
| Original snapshots | 3,292 | 3,295 |
| Nonliteral inventory signals | 1,846 | 1,846 |

Current source catalog SHA-256: `39fe0ff9f5355a3559055797779b4f99aabb9a57f7ff75d816c8d73e1e1a295a`.
Current canonical study SHA-256: `d9a72223da0534a2bbec995f8e26a508f1dd678c3c39f9d958607484207457b2`.
Current review-row SHA-256: `e5a2a9a9b56816ae126e8fba2c2848b83ede5a281cfde1be0ead17f7aa7b669e`.

## Verification

For 5l, TDD red/green covered the formerly unsupported meaning-review contract, exact/retained evidence, wrong readings and senses, stale snapshots, unsupported glosses, protected fields, duplicate decisions, complete example accounting, retained-wording reporting and the real curated batch. Its 960 passing targeted tests are recorded in the plan.

For 5m, both new corpus regressions failed first against the previous artifact, exposing likeable and the unresolved beginner cohort. The green tests verify the concrete corrections, original/pre-review retention, resolution of N5 `needs-review` meanings, and independent coat/court evidence. The full existing ledger tests replay all decisions against pinned sources. **140 content tests, 174 study tests, 11 isolated PostgreSQL study tests, 375 mirror regressions and 262 Japanese assessment tests pass (962 targeted tests)**. TypeScript, focused ESLint, whitespace and production build pass. Catalog/review `--check` and the full prompt audit reproduce their outputs. Opt-in skips/todos remain outside the passing totals.

For 5n, four red tests expose incorrect N4 meanings, the unresolved cohort and missing construction review support. The green regressions verify the concrete corrections, unchanged primary identities, source/pre-review retention and the two construction meanings, including negative cases for unsupported/direct assertions. **144 content tests, 174 study tests, 11 isolated PostgreSQL study tests, 375 mirror regressions and 262 Japanese assessment tests pass (966 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, catalog/review `--check` and the full prompt audit pass. The local database retains English PUBLISHED (3,284 cards), Japanese DRAFT (10,291 units), zero Japanese progress/reviews/questions and the unchanged active version-3 Japanese assessment. Isolated schemas/connections are removed.

For 5o, five red failures expose the missing authored-construction relation, incorrect injury/N3 meanings and the unresolved cohort. The green cases verify semantic boundaries, independently cited homonyms, exact source retention, example omissions and the bounded cohort. Full pinned-corpus replay passes. **147 content tests, 174 study tests, 11 isolated PostgreSQL study tests, 375 mirror regressions and 262 Japanese assessment tests pass (969 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, catalog/review `--check` and the full prompt audit pass. Opt-in skips/todos are outside these totals. No UI/style decision or new Impeccable visual surface is introduced.

For 5p, two red regressions expose the old marital-status meanings and unresolved 200-record cohort. Green checks verify concrete meanings, primary identity/level retention, selected examples and the actual meanings plus dictionary entries of five loanword homonyms. **149 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (334 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact `--check` commands and the complete prompt audit pass. Broader mirror/assessment suites are not repeated for this data/test-only increment; their last results are recorded under 5o. No UI/style decision or new Impeccable visual surface is introduced.

For 5q, two red regressions expose 支える's wrong-reading meanings and the unresolved final 296-record N3 cohort. Green checks verify reading/sense boundaries, primary identity/level and snapshot retention, example selection and the actual meanings plus eight independent dictionary entries for six existing records. Full pinned-corpus replay validates every decision. **151 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (336 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact `--check` commands and the complete prompt audit pass. Mirror/assessment suites are unchanged and were last repeated in 5o. The read-only application check confirms English PUBLISHED (3,284 cards), the earlier Japanese DRAFT (10,291 units), unchanged active version-3 assessment, zero Japanese progress/reviews/questions and zero isolated schemas/connections.

For 5r, two red regressions expose the old 務める meanings and 215 unresolved strings in the bounded N2 cohort. Green checks verify the concrete role/direction/spelling corrections, primary identity/level and snapshot retention, selected examples, explicitly retained fluid wording and resolution of the 150-record cohort while later N2 work stays flagged. The bounded count excludes the two earlier reviews. Full pinned-corpus replay passes. **153 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (338 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact `--check` commands and the complete prompt audit pass. The unchanged mirror/assessment suites were last repeated in 5o. Read-only application status confirms the earlier Japanese DRAFT, unchanged English publication/active assessment, zero Japanese progress/reviews/questions and zero isolated schemas/connections.

For 5s, two red regressions expose the old returning meanings and 220 unresolved strings in the next bounded cohort. Green checks verify reading/sense boundaries, primary identity/level and snapshot retention, date/duration examples, the exact 150-record cohort and independent boat-launch/collar evidence while later N2 work remains flagged. Full pinned-corpus replay passes. **155 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (340 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact `--check` commands and the full prompt audit pass. The unchanged mirror/assessment suites were last repeated in 5o. Read-only application status confirms the earlier Japanese DRAFT (10,291 units), English PUBLISHED (3,284 cards), unchanged active version-3 assessment and zero Japanese progress/reviews/questions or isolated schemas/connections.

For 5t, two red regressions expose the old pocket-money/expense wording and 227 unresolved strings in the third bounded cohort. Green checks verify thresholds, rounding, institution/plant/instrument categories, primary spelling/level and source snapshots, the temporal example selection, retained ESC evidence and the exact 150-record cohort while later N2 work remains flagged. Full pinned-corpus replay passes. **157 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (342 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact `--check` commands and the full prompt audit pass. The unchanged mirror/assessment suites were last repeated in 5o. Read-only application status confirms the earlier Japanese DRAFT (10,291 units), English PUBLISHED (3,284 cards), unchanged active version-3 assessment and zero Japanese progress/reviews/questions or isolated schemas/connections.

For 5u, two red regressions expose the old passive separation meaning and 219 unresolved strings in the fourth bounded cohort. Green checks verify effort/statistics/direction/category distinctions, primary identity/level and source snapshots, separate wooden/ceramic bowl units, the exact 150-record cohort and independently evidenced chock/chalk meanings while later N2 work remains flagged. Full pinned-corpus replay passes. **159 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (344 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact `--check` commands and the complete prompt audit pass. Unchanged mirror/assessment suites were last repeated in 5o. Read-only status confirms the earlier Japanese DRAFT (10,291 units), English PUBLISHED (3,284 cards), unchanged active version-3 assessment and zero Japanese progress/reviews/questions or isolated schemas/connections.

For 5v, two red regressions expose the old 傑作 meanings and all 190 unresolved N2 dictionary/construction strings. Green checks verify the concrete spelling/category/pronoun/date/word-form corrections, protected fields and originals, example omissions, independent cook/tap and tip/chip evidence, shared variant identity, zero N2 dictionary/construction meaning flags, and the four separately attested phrases. Full pinned-corpus replay passes. **161 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (346 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both reproducible artifact checks and the complete prompt audit pass. Unchanged mirror/assessment suites were last repeated in 5o. Read-only status confirms the earlier Japanese DRAFT (10,291 units), English PUBLISHED (3,284 cards), unchanged active version-3 assessment and zero Japanese progress/reviews/questions or isolated schemas/connections.

For 5w, two red regressions expose 勤まる's old unqualified meanings and 245 unresolved strings in the first N1 cohort. Green checks verify reading/radical/calendar/category boundaries, protected fields and originals, example omissions, independent foam/form, hanger/hangar/hunger and seat/sheet evidence, and the exact 150 new reviews while later N1 work remains flagged. The bounded count excludes 奨励's earlier 5l correction. Full pinned-corpus replay passes. **163 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (348 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both reproducible artifact checks and the complete prompt audit pass. Unchanged mirror/assessment suites were last repeated in 5o. Read-only status confirms the earlier Japanese DRAFT (10,291 units), English PUBLISHED (3,284 cards), unchanged active version-3 assessment and zero Japanese progress/reviews/questions or isolated schemas/connections.

For 5x, two red regressions expose 卯's combined calendar gloss and 253 unresolved strings in the next bounded N1 cohort. Green checks verify ordinal/calendar/reading/direction/category boundaries, protected fields and originals, omitted word forms/readings, the timbre example, all five independent homonym entries and 150 new reviews while later N1 work remains flagged. The bounded count excludes 手数's earlier 5l correction. Full pinned-corpus replay passes. **165 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (350 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both reproducible artifact checks and the complete prompt audit pass. Unchanged mirror/assessment suites were last repeated in 5o. Read-only status confirms the earlier Japanese DRAFT (10,291 units), English PUBLISHED (3,284 cards), unchanged active version-3 assessment and zero Japanese progress/reviews/questions or isolated schemas/connections.

For 5y, two red regressions expose 共's overbroad definitions and 232 unresolved strings in the third bounded N1 cohort. Green checks verify primary readings, all-people scope, grammatical roles, passive dyeing, word categories, protected fields/originals, the drying-verb omission and independently evidenced pear/vest meanings. The bounded 150-new-review test excludes 水気 and 上手's earlier 5l reviews while later N1 work remains flagged. Full pinned-corpus replay passes. **167 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (352 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both reproducible artifact checks and the complete prompt audit pass. Unchanged mirror/assessment suites were last repeated in 5o. Read-only status confirms the earlier Japanese DRAFT (10,291 units), English PUBLISHED (3,284 cards), unchanged active version-3 assessment and zero Japanese progress/reviews/questions or isolated schemas/connections.

For 5z, two red regressions expose 少女's overbroad definitions and 238 unresolved strings in the fourth bounded N1 cohort. Green checks verify negation, gathering/heat quantity, active acceptance, primary readings, word categories, protected fields/originals, example omissions, separate 南 units and all four independent dictionary citations. The bounded 150-new-review test excludes 収まる's earlier 5l correction while later N1 work remains flagged. Full pinned-corpus replay passes. **169 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (354 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both reproducible artifact checks and the complete prompt audit pass. Unchanged mirror/assessment suites were last repeated in 5o. Read-only status confirms the earlier Japanese DRAFT (10,291 units), English PUBLISHED (3,284 cards), unchanged active version-3 assessment and zero Japanese progress/reviews/questions or isolated schemas/connections.

This increment changes offline content and validation only. It makes no UI/style decision, so the existing Impeccable-governed study surface remains unchanged; no preview, browser or new design handoff is introduced. Task-owned build/test processes exit before handoff. Nothing is staged, committed or pushed by the agent.

For 5aa, two red regressions expose 碌に's unqualified positive meanings and 240 unresolved strings in the fifth bounded N1 cohort. Green checks verify folk-customs/taxonomic/poetic boundaries, giving direction, primary readings, protected fields/originals, example omissions, separate 民俗/民族 units, independent lace evidence and the retained household-head sense. Exactly 150 N1 reviews are resolved while later N1 work stays flagged. Full pinned-corpus replay passes. **171 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (356 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both reproducible artifact checks and the full prompt audit pass. Unchanged mirror/assessment suites were last repeated in 5o. Read-only status confirms the earlier Japanese DRAFT (10,291 units), English PUBLISHED (3,284 cards), unchanged active version-3 assessment and zero Japanese progress/reviews/questions or isolated schemas/connections.

For 5ab, two red regressions expose 甲's wrong-reading definitions and 266 unresolved strings in the sixth bounded N1 cohort. Green checks verify primary readings, area scale, sensitivity, grammatical roles, verb direction, protected fields/originals, example omissions, separate 御 units and 出産's retained production meaning. The bounded test resolves exactly 150 new reviews, excluding 有様's earlier 5l correction, while later N1 work stays flagged. Full pinned-corpus replay passes. **173 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (358 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both reproducible artifact checks and the full prompt audit pass. Unchanged mirror/assessment suites were last repeated in 5o. Read-only status confirms the earlier Japanese DRAFT (10,291 units), English PUBLISHED (3,284 cards), unchanged active version-3 assessment and zero Japanese progress/reviews/questions or isolated schemas/connections.

For 5ac, two red regressions expose the thigh/femur confusion and 264 unresolved strings in the seventh bounded N1 cohort. Green checks verify anatomy, primary readings, ratios, institutions, transformation direction, protected fields/originals, example omissions, separate 大事 units and independently evidenced lever/liver meanings. Exactly 150 new reviews are resolved while later N1 work stays flagged. Full pinned-corpus replay passes. **175 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (360 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both reproducible artifact checks and the full prompt audit pass. Unchanged mirror/assessment suites were last repeated in 5o. Read-only status confirms the earlier Japanese DRAFT (10,291 units), English PUBLISHED (3,284 cards), unchanged active version-3 assessment and zero Japanese progress/reviews/questions or isolated schemas/connections.

For 5ad, two red regressions expose the passive 導く meanings and 241 unresolved strings in the eighth bounded N1 cohort. Green checks verify active/passive inflection, primary readings, degree and possession categories, both 賜る directions, protected fields/originals, example omissions, separate units, independent ramp evidence and the rare treasure sense. The bounded test resolves exactly 150 new reviews, excluding 落ち葉 and 乳's earlier 5l corrections, while later N1 work stays flagged. Full pinned-corpus replay passes. **177 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (362 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both reproducible artifact checks and the full prompt audit pass. Unchanged mirror/assessment suites were last repeated in 5o. Read-only status confirms the earlier Japanese DRAFT (10,291 units), English PUBLISHED (3,284 cards), unchanged active version-3 assessment and zero Japanese progress/reviews/questions or isolated schemas/connections.

For 5ae, two red regressions expose 反感's revolt gloss and the final 208 dictionary/construction strings. Green checks verify reading-specific senses, counters, ethnic groups, quantities, primary IDs and originals, both example omissions, separate 民族/民俗 and 丈夫 units, three independent homonym entries and the declared 煌々と base construction. The final cohort has exactly 116 new direct records plus that construction; all five levels have zero `needs-review` or `construction` meaning statuses. Earlier bounded cohort assertions remain, while obsolete assertions requiring a permanently pending N1 tail are removed; the second cohort excludes the separately reviewed construction as well as its earlier 手数 review. Full pinned-corpus replay passes. **179 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (364 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both reproducible artifact checks and the full prompt audit pass. Unchanged mirror/assessment suites were last repeated in 5o. Read-only status confirms the earlier Japanese DRAFT (10,291 units), English PUBLISHED (3,284 cards), unchanged active version-3 assessment and zero Japanese progress/reviews/questions or isolated schemas/connections. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

For 5af, two red regressions expose the non-phone cooking sentence on かける and the 174-record unreviewed example cohort. Green checks verify specific sense/translation omissions, complete originals, legitimate conjugations, alternate scripts and numeric dates. Exactly 111 new retain decisions and 63 extended decisions account for all 348 examples; only 51 example arrays change. Full pinned-corpus replay passes. **181 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (366 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all 19,016 prompt projections pass. Definitions, dictionary evidence and canonical mappings remain unchanged. The broader unchanged mirror/assessment suites were last repeated in 5o. Read-only status confirms the earlier Japanese DRAFT (10,291 units), English PUBLISHED (3,284 cards), unchanged active version-3 assessment and zero Japanese progress/reviews/questions or isolated schemas/connections. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

For 5ag, red regressions expose the not-both/neither translation, the missing 150-record cohort and selected-sense reporting precedence. Green checks cover counters, particles, unselected senses, complete originals, the rare raincoat spelling, measurements, ゆうべ readings and separate 一人 units. Three pure cases verify selected exact/equivalent citations, an equivalent-labelled decision with an exact cited gloss, complete dictionary context, immutable sources and invalid-sense rejection. **186 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (371 targeted tests)**. The first combined run reported a connection-cleanup failure; read-only status found no residual test resources, and the standalone 11-test replay passed. TypeScript, focused ESLint, whitespace, production build, both reproducible artifact checks and all 19,016 prompt projections pass. The broader unchanged mirror/assessment suites were last repeated in 5o. Read-only status confirms the earlier Japanese DRAFT (10,291 units), English PUBLISHED (3,284 cards), unchanged active version-3 assessment and zero Japanese progress/reviews/questions or isolated schemas/connections. This offline report/data/test increment introduces no UI/style decision or new Impeccable visual surface.

For 5ah, two red regressions expose the famous/able translation and the missing second 150-record cohort. Green checks verify substring-only gram matches, selected senses/compounds, changed propositions, full originals, negative-answer conventions, accepted readings, cake, the exact location citation and separate 丈夫 units. **188 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (373 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both reproducible artifact checks and all 19,016 prompt projections pass. The database suite runs after the build/check processes finish. The broader unchanged mirror/assessment suites were last repeated in 5o. Read-only status confirms the earlier Japanese DRAFT (10,291 units), English PUBLISHED (3,284 cards), unchanged active version-3 assessment and zero Japanese progress/reviews/questions or isolated schemas/connections. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

For 5ai, two red regressions expose the street-name substring and final 189-record review gap. Green checks cover names, grammar, homophones, translation propositions, explicit readings, retained many/much/cooking/politeness contexts, separate soap/economy and 私 units, complete originals and all 13 pre-existing empty records. **190 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (375 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all 19,016 prompt projections pass. The isolated database suite runs after build/check processes finish. The broader unchanged mirror/assessment suites were last repeated in 5o. Read-only status confirms the earlier Japanese DRAFT (10,291 units), English PUBLISHED (3,284 cards), unchanged active version-3 assessment and zero Japanese progress/reviews/questions or isolated schemas/connections. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

For 5aj, four red regressions expose appearance/translation mismatches, the automatic baseball-depth citation and the complete 177-record review gap. Green checks verify distinct senses/auxiliaries/readings, eligible spellings, numeric forms, proper names, physical-depth/route-passage equivalents, exact grasping evidence, unchanged definitions, complete originals and the remaining queue. One new assertion initially compared the previously corrected 落ちる wording to its older snapshot; it now checks the explicit reviewed definitions, and full content replay passes. **194 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (379 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all 19,016 prompt projections pass. The database suite runs after other checks finish. Unchanged mirror/assessment suites were last repeated in 5o. Read-only status confirms the earlier Japanese DRAFT (10,291 units), English PUBLISHED (3,284 cards), unchanged active version-3 assessment and zero Japanese progress/reviews/questions or isolated schemas/connections. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

For 5ak, two red regressions expose the about-time mismatch and missing 150-record cohort; the four earlier N4 regressions still pass. Green checks verify selected senses, grammatical roles, changed propositions, full originals, separate he/boyfriend citations, retained broad meanings, permission and explicit remaining-queue counts. Earlier cohort assertions remain bounded; current queue totals live with the new batch. **196 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (381 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all 19,016 prompt projections pass. The database suite runs after other checks finish. Unchanged mirror/assessment suites were last repeated in 5o. Read-only status confirms the earlier Japanese DRAFT (10,291 units), English PUBLISHED (3,284 cards), unchanged active version-3 assessment and zero Japanese progress/reviews/questions or isolated schemas/connections. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

For 5al, three red regressions expose the numerical boundary, automatic adjective citation on stereo and missing second 150-record cohort; the six earlier N4 regressions still pass. Green checks verify selected senses, word identities, grammatical roles, changed propositions, complete originals, explicit noun/aspiration citations, declared alternate forms, few/a-few contrast and current queue counts. **199 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (384 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all 19,016 prompt projections pass. The database suite runs after other checks finish. Unchanged mirror/assessment suites were last repeated in 5o. Read-only status confirms the earlier Japanese DRAFT (10,291 units), English PUBLISHED (3,284 cards), unchanged active version-3 assessment and zero Japanese progress/reviews/questions or isolated schemas/connections. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

For 5am, three red regressions expose the grammatical-role mismatch, bitter's wrong-context exact match and remaining 138-record gap; the nine earlier N4 regressions still pass. Green checks verify quantities, names, readings, contractions/idioms, complete originals, selected taste/clothing citations, retained contextual contrasts, final queue accounting and all nine pre-existing empty members. **202 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (387 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all 19,016 prompt projections pass. The database suite runs after other checks finish. Unchanged mirror/assessment suites were last repeated in 5o. Read-only status confirms the earlier Japanese DRAFT (10,291 units), English PUBLISHED (3,284 cards), unchanged active version-3 assessment and zero Japanese progress/reviews/questions or isolated schemas/connections. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

For 5an, three red regressions expose the incomplete attachment translation, ambiguous primary striking reading and missing bounded cohort. Green checks verify selected senses, grammatical roles, propositions, explicit primary readings, valid inflections/forms, full original retention and remaining-queue accounting. **205 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (390 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all 19,016 prompt projections pass. The database suite runs after other checks finish. Unchanged mirror/assessment suites were last repeated in 5o. Read-only status confirms the earlier Japanese DRAFT (10,291 units), English PUBLISHED (3,284 cards), unchanged active version-3 assessment and zero Japanese progress/reviews/questions or isolated schemas/connections. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

For 5ao, three red regressions expose the spoilage/abundance mismatch, vacancy/space mismatch and missing 76-record cohort; the three earlier N3 regressions still pass. Green checks verify selected senses, word/phrase identities, grammatical roles, propositions, complete originals, pinned spelling context, valid inflections and zero unreviewed N3 nonliteral-match records while preserving the remaining 1,343-record queue. **208 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (393 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all 19,016 prompt projections pass. The database suite runs after other checks finish. Unchanged mirror/assessment suites were last repeated in 5o. Read-only status confirms the earlier Japanese DRAFT (10,291 units), English PUBLISHED (3,284 cards), unchanged active version-3 assessment and zero Japanese progress/reviews/questions or isolated schemas/connections. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

For 5ap, two red regressions expose the country-reference mismatch and missing 150-record cohort; the six earlier N3 regressions and retained-context test still pass. Green checks verify selected senses, grammatical roles, propositions, complete originals, contextual paraphrases, numerical/temporal boundaries, shared-sentence consistency and remaining-queue accounting. **211 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (396 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all 19,016 prompt projections pass. The database suite runs after other checks finish. Unchanged mirror/assessment suites were last repeated in 5o. Read-only status confirms the earlier Japanese DRAFT (10,291 units), English PUBLISHED (3,284 cards), unchanged active version-3 assessment and zero Japanese progress/reviews/questions or isolated schemas/connections. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

For 5aq, three red regressions expose the permission/grade mismatch, unattested primary sound reading and missing 150-record cohort; all nine earlier N3 regressions pass. Green checks verify selected senses, word identities, roles, propositions, full originals, primary readings, valid full-sense contexts, numerical boundaries and remaining-queue accounting. **214 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (399 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all 19,016 prompt projections pass. The database suite runs after other checks finish. Unchanged mirror/assessment suites were last repeated in 5o. Read-only status confirms the earlier Japanese DRAFT (10,291 units), English PUBLISHED (3,284 cards), unchanged active version-3 assessment and zero Japanese progress/reviews/questions or isolated schemas/connections. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

For 5ar, tDD red/green exposes the unreviewed silence example and missing 150-record cohort; all twelve earlier N3 regressions pass in the red run. Green checks verify the curated examples, primary readings, contextual sense citations (including positive-factor プラス), original retention, shared-sentence consistency and current queue totals. **217 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (402 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after the other checks finish. Unchanged mirror/assessment suites were last repeated in 5o. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. All task-owned test/build processes have exited; no preview server or task port remains. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5as, tDD red/green exposes the interjection/adverb mismatch, the missing explicit calamity citation and the missing 150-record cohort; all fifteen earlier N3 regressions pass in the red run. Green checks verify word identities, grammatical roles, changed propositions, source quality, primary readings, full originals, selected calamity/juice citations, retained natural contexts and queue accounting. **220 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (405 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after the other checks finish. Unchanged mirror/assessment suites were last repeated in 5o. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port remains. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5at, tDD red/green exposes the added possibility-question agent, missing explicit social-development citation and missing 150-record cohort; all eighteen earlier N3 regressions pass in the red run. Green checks verify word identity, grammatical roles, numerical/time boundaries, source quality, full original retention, primary readings, separate development/growth citations, pinned valid spelling, natural figurative contexts and queue accounting. **223 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (408 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after the other checks finish. Unchanged mirror/assessment suites were last repeated in 5o. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port remains. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5au, tDD red/green exposes the additive-versus-concessive translation mismatch, missing explicit postal-items citation and missing 150-record cohort; all twenty-one earlier N3 regressions pass in the red run. Green checks verify roles, names, grammatical uses, selected senses, source quality, complete originals, primary readings, separate service/items citations, full pinned context, exact quantities, shared-sentence consistency and remaining-queue accounting. **226 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (411 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after the other checks finish. Unchanged mirror/assessment suites were last repeated in 5o. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port remains. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5av, tDD red/green exposes the changed difficulty timing, missing explicit contextual-sense decisions and missing 150-record cohort; all twenty-four earlier N3 regressions pass in the red run. Green checks verify selected senses, grammatical roles, source quality, complete originals, contextual metaphors, primary readings, exact quantities and remaining-queue accounting. **229 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (414 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after the other checks finish. Unchanged mirror/assessment suites were last repeated in 5o. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port remains. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5aw, TDD red/green exposes the interjection-versus-flaw mismatch, missing contextual-sense decisions and missing 150-record cohort; all twenty-seven earlier N3 regressions pass in the red run. Green checks verify homophones, selected senses, grammatical roles, source quality, original retention, eligible primary readings, register, full senses, natural paraphrases, metaphors, quantities and queue accounting. **232 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (417 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after the other checks finish. Unchanged mirror/assessment suites were last repeated in 5o. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port remains. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5ax, TDD red/green exposes the added ceremony, missing ordinary-conclusion citation and final 143 pending N3 records; all thirty earlier N3 regressions pass in the red run. Green checks verify selected senses, grammatical roles, changed propositions, source quality, full originals, primary readings, the authored conclusion equivalent, natural language and quantities, shared-sentence consistency, all 70 pre-existing empty members and a zero pending N3 queue. **235 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (420 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after the other checks finish. Unchanged mirror/assessment suites were last repeated in 5o. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port remains. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5ay, TDD red/green exposes the added car ownership, missing selected-sense citations and missing 150-record cohort. Green checks verify selected senses, grammatical roles, changed propositions, source quality, eligible spellings/readings, full original retention, valid inflections, broad senses, contextual idioms and complete cohort/queue accounting. Historical N2 meaning-cohort counts exclude the later example-only decisions through one shared test predicate. Vocabulary narrowing makes the selected-sense assertions type-safe, including the existing N3 assertions. **238 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (423 targeted tests)**; the 46 affected N2/N3 tests pass again after the type-narrowing edits. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after the other checks finish. Unchanged mirror/assessment suites were last repeated in 5o. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port remains. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5az, TDD red/green exposes the added male gender in the elderly-people translation, missing contextual sense citations and missing 150-record cohort; all three earlier N2 example regressions pass in the red run. Green checks verify selected senses, word identities, grammatical roles, changed propositions, full original retention, eligible forms/readings, full senses, the exact contextual soft citation, natural personal references, idioms, shared-sentence consistency and complete queue accounting. Current N2 totals live in the latest cohort test, and the existing shared predicate preserves historical meaning-cohort boundaries. **241 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (426 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after the other checks finish. Unchanged mirror/assessment suites were last repeated in 5o. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port remains. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5ba, TDD red/green exposes the unqualified ignition example, missing contextual sense decisions and final 97-record cohort; all six earlier N2 example regressions pass in the red run. Green checks verify primary reading boundaries, distinct grammatical words, selected senses, changed propositions, full original retention, eligible spellings, inflections, full senses, natural personal references, idioms, shared-sentence consistency and a zero pending N2 nonliteral-match queue. Current N2 totals remain in the latest cohort test, and the existing shared predicate preserves historical meaning-cohort boundaries. **244 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (429 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after the other checks finish. Unchanged mirror/assessment suites were last repeated in 5o. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port remains. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5bb, TDD red/green exposes the two shared しょうがない omissions, missing contextual sense decisions and missing 150-record cohort; all nine earlier N2 example regressions pass in the red run. Green checks verify other readings, grammatical roles, selected senses, changed propositions, full original retention, valid forms, full senses, natural contextual renderings, shared-sentence consistency, exact quantities and the remaining queue. Current N2 totals remain in the latest cohort test, and the existing shared predicate preserves historical meaning-cohort boundaries. **247 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (432 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after the other checks finish. Unchanged mirror/assessment suites were last repeated in 5o. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port remains. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5bc, TDD red/green exposes the 水滴 proposition mismatch, missing selected-sense decisions and missing 150-record cohort; all 12 earlier N2 example regressions pass in the red run. Green verifies selected senses, source/translation distinctions, full original retention, valid contextual forms, the untouched phrase-backed example and exact queue accounting. Current N2 totals remain in the latest cohort test, and the shared predicate preserves historical meaning-cohort boundaries. **250 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (435 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after every other check finishes. Unchanged mirror/assessment suites were last repeated in 5o. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port remains. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5bd, TDD red/green exposes the added-nationality 民謡 example, missing explicit platform-stage citation and missing 150-record cohort; all 15 earlier N2 example regressions pass in the red run. Green verifies numbered senses, primary readings, distinct lexical identities, proposition/scope decisions, full original retention, valid contextual forms, exact counts and the two explicitly pending phrase examples. Current N2 totals remain in the latest cohort test, and the shared predicate preserves historical meaning-cohort boundaries. **253 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (438 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after every other check finishes. Unchanged mirror/assessment suites were last repeated in 5o. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port remains. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5be, TDD red/green exposes the mismatched soba companion, missing selected-sense decisions and missing 150-record cohort; all 18 earlier N2 example regressions pass in the red run. Green verifies numbered senses, shared-sentence consistency, propositions, source scope, full original retention, valid contextual forms, exact quantities and the two explicitly pending phrase examples. Current N2 totals remain in the latest cohort test, and the shared predicate preserves historical meaning-cohort boundaries. **256 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (441 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after every other check finishes. Unchanged mirror/assessment suites were last repeated in 5o. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port remains. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5bf, TDD red/green exposes the changed child-to-boy proposition, missing selected-sense decisions and missing 150-record cohort; all 21 earlier N2 example regressions pass in the red run. Green verifies lexical identities, selected senses, shared-sentence consistency, propositions, source scope, full original retention, valid contextual forms, exact quantities and the two explicitly pending phrase examples. Current N2 totals remain in the latest cohort test, and the shared predicate preserves historical meaning-cohort boundaries. **259 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (444 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after every other check finishes. Unchanged mirror/assessment suites were last repeated in 5o. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port remains. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5bg, TDD red/green exposes the unselected security-device prefix, missing selected-sense decisions and missing 150-record cohort; all 24 earlier N2 example regressions pass in the red run. Green verifies numbered senses, shared-sentence consistency, changed information, unresolved annotations, full original retention, grammatical constructions, natural contextual renderings, exact quantities and the two explicitly pending phrase examples. Current N2 totals remain in the latest cohort test, and the shared predicate preserves historical meaning-cohort boundaries. **262 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (447 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after every other check finishes. Unchanged mirror/assessment suites were last repeated in 5o. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port remains. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5bh, TDD red/green exposes the added workplace assumption on 後輩, missing selected-sense decisions and missing 150-record cohort; all 27 earlier N2 example regressions pass in the red run. Green verifies numbered senses, the exact results/physical 実る citations, shared-sentence consistency, actions, participants, source scope, unresolved annotations, full original retention, natural contextual renderings, exact quantities and the two explicitly pending phrase examples. Current N2 totals remain in the latest cohort test, and the shared predicate preserves historical meaning-cohort boundaries. **265 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (450 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after every other check finishes. Unchanged mirror/assessment suites were last repeated in 5o. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

The first isolated database run passed the access-test assertions but failed its immediate post-disconnect connection-cleanup check; the other ten tests passed. Read-only status then confirmed zero leftover test schemas or connections. The helper was inspected and left unchanged. One full-suite retry passed all 11 tests, and final cleanup again confirmed zero test schemas/connections. A transient delay in observing disconnect completion is a possible explanation; this run does not establish the root cause or change the helper.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port remains. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5bi, TDD red/green exposes the changed seasoning propositions, missing selected-sense decisions and missing 104-record cohort; all 30 earlier N2 example regressions pass in the red run. Green verifies word boundaries, numbered senses, shared-sentence consistency, participants, readings, source scope, full original retention, natural contextual renderings, exact quantities and the two explicitly pending phrase examples. Current N2 totals remain in the latest cohort test, and the shared predicate preserves historical meaning-cohort boundaries. **268 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (453 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after every other check finishes. Unchanged mirror/assessment suites were last repeated in 5o. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port remains. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5bj, TDD red/green starts with four expected failures: the missing phrase example-review contract, missing inventory handling, the unchanged city-narrowed example and the unaccounted two-record queue. Eight invalid-input checks also pass in the red run. Green covers all 18 new tests, including incomplete/duplicate/out-of-range indices, unsupported source/quote/citation fields, stale originals, competing example patches, missing snapshots, effective-content/evidence drift and duplicate inventory decisions. Both compiler and inventory reuse the same phrase verifier; dictionary and phrase selections reuse the same index-accounting/filtering function. The final corpus regression also accounts for all 1,787 N2 members, including 128 pre-existing empty members and the two earlier correction omissions. All earlier dictionary-review tests pass.

**286 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (471 targeted tests)**. TypeScript passes after correcting typed access to the synthetic test fixture. Focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after every other check finishes. Unchanged mirror/assessment suites were last repeated in 5o. This increment changes the offline correction/inventory contract and draft data; it introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port remains. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5bk, TDD red/green first exposes the added male child reference, missing selected-sense decisions and missing 150-record cohort. Green verifies 57 changed-array oracles, 131 selected-sense oracles and 93 unchanged-array oracles, plus complete cohort/pending-queue accounting. The shared predicate now excludes example-only additions from historical meaning cohorts for every band, replacing the private N2 predicate and preserving all N1/N2 cohort boundaries. Volatile corpus totals live in the latest example regression; the completed N2 phrase test retains its own evidence and N2 accounting assertions.

**289 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (474 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after every other check finishes. Unchanged mirror/assessment suites were last repeated in 5o. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port remains. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5bl, TDD red/green first exposes the unqualified ancient-world belief example, missing selected-sense decisions and missing 150-record cohort; all three earlier N1 example tests pass in the red run. Green verifies **71 changed-array oracles, 129 selected-sense oracles and 79 unchanged-array oracles**, including the explicit robust-strong sense 3 citation with unchanged physical burly/sturdy sense 1. The complete regression checks polarity, participants, lexical identities, readings, scope, full originals, contextual forms and exact cohort/remaining-queue accounting. Volatile totals move to the latest cohort test; historical meaning and example cohorts retain their boundaries through the shared predicate and assertions.

**292 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (477 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after every other check finishes. Unchanged mirror/assessment suites were last repeated in 5o. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port remains. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5bm, TDD red/green first exposes the explicit かって reading mismatch, missing selected-sense decisions and missing 131-record cohort; all six earlier N1 example tests pass in the red run. Green verifies **49 changed-array oracles, 114 selected-sense oracles and 82 unchanged-array oracles**, complete original-index accounting and selected eligible citations. The complete queue regression confirms that all remaining N1 example-bearing records have literal matches only; matching characters still require later contextual review. Volatile totals move to the latest cohort test while historical cohorts retain their boundaries through the shared predicate and assertions.

**295 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (480 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after every other check finishes and passes on its first run. Unchanged mirror/assessment suites were last repeated in 5o. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port was started. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5bn, TDD red/green first exposes the concessive 遅くとも match, missing selected-sense decisions and missing 150-record cohort; all nine earlier N1 example tests pass in the red run. Green verifies **42 changed-array oracles, 140 selected-sense oracles and 108 unchanged-array oracles**, complete original-index accounting and selected citations. The existing shared helper now owns the repeated index/citation assertions; both N1 cohorts reuse it. Volatile totals move to the latest cohort while all historical boundaries remain intact.

**298 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (483 targeted tests)**. The separate TypeScript check initially exposed an overly narrow discriminator assumption in the test helper; narrowing by the vocabulary row's written field fixes it. TypeScript, focused lint and all 12 N1 example tests then pass. Production build, both artifact reproducibility checks, whitespace and all **19,016 prompt projections** pass. The isolated database suite runs after every other check finishes and passes on its first run. Unchanged mirror/assessment suites were last repeated in 5o. This increment introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port was started. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5bo, TDD red/green first exposes the medical-monitor/computer-display mismatch, missing selected-sense decisions and missing 150-record cohort; all 12 earlier N1 example tests pass in the red run. Green verifies **48 changed-array oracles, 128 selected-sense oracles and 102 unchanged-array oracles**, complete original-index accounting and selected eligible citations. The existing shared assertions are reused and volatile totals move to the latest cohort, preserving all historical cohort boundaries. Shared-sentence cases verify consistent omissions and retained contextual renderings without equating different cards' selected senses.

**301 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (486 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after every other check finishes and passes on its first run. Unchanged mirror/assessment suites were last repeated in 5o. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port was started. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5bp, the red run exposes both other-sense ポイント examples, missing selected-sense decisions and the absent 150-record cohort, while all **15 earlier N1 example tests pass**. Green reuses existing shared assertions for **68 changed-array oracles, 128 selected-sense oracles and 82 unchanged-array oracles**, complete original-index accounting, eligible selected citations and unchanged earlier cohort boundaries. All 10,307 source members are compared; definitions, primary readings, levels, dictionary evidence, earlier reviews/snapshots and canonical mappings remain unchanged. Retained examples are full original objects in their original order.

**304 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (489 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after every other check finishes and passes on its first run. Unchanged mirror/assessment suites were last repeated in 5o. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port was started. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5bq, the red run exposes the reliance example on selected addressed-to 宛, missing selected-sense decisions and the absent 150-record cohort, while all **18 earlier N1 example tests pass**. Green reuses existing shared assertions for **54 changed-array oracles, 131 selected-sense oracles and 96 unchanged-array oracles**, complete original-index accounting, eligible selected citations and unchanged historical cohort boundaries. All 10,307 source members are compared; definitions, readings, levels, dictionary evidence, earlier reviews/snapshots and canonical mappings remain unchanged. Retained examples remain complete original objects in their original order.

**307 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (492 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after every other check finishes and passes on its first run. Unchanged mirror/assessment suites were last repeated in 5o. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port was started. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5br, the red run exposes the added-group meeting example on 開催, missing selected-sense decisions and the absent 150-record cohort, while all **21 earlier N1 example tests pass**. Green reuses existing shared assertions for **57 changed-array oracles, 126 selected-sense oracles and 93 unchanged-array oracles**, complete original-index accounting, eligible selected citations and unchanged historical cohort boundaries. All 10,307 source members are compared; definitions, readings, levels, dictionary evidence, earlier reviews/snapshots and canonical mappings remain unchanged. Retained examples remain complete original objects in their original order.

**310 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (495 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after every other check finishes and passes on its first run. Review began on 2026-10-26; final verification completed on 2026-10-27. Unchanged mirror/assessment suites were last repeated in 5o. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port was started. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5bs, tDD red/green begins with three expected failures: 台無し still carries the added-group trip example, selected-sense decisions are missing and the 150-record cohort is absent. All **24 earlier N1 example tests pass** in the red run. New static regressions reuse existing shared assertions for **55 changed-array oracles, 132 selected-sense oracles and 95 unchanged-array oracles**, complete original-index accounting and selected eligible citations. Volatile totals move to the latest cohort; historical cohort boundaries remain fixed.

**313 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (498 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after every other executable check finishes and passes on its first run. Unchanged mirror/assessment suites were last repeated in 5o. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port was started. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5bt, tDD red/green begins with three expected failures: 取材 still carries the Wall Street/added-gender examples, selected-sense decisions are missing and the 150-record cohort is absent. All **27 earlier N1 example tests pass** in the red run. New static regressions reuse existing shared assertions for **61 changed-array oracles, 127 selected-sense oracles and 89 unchanged-array oracles**, complete original-index accounting and selected eligible citations. The product-demo meaning explicitly asserts exact entry 1084080/sense 2. Volatile totals move to the latest cohort; historical cohort boundaries remain fixed.

**316 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (501 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after the content, study, build, lint, TypeScript and artifact checks finish and passes on its first run. Unchanged mirror/assessment suites were last repeated in 5o. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port was started. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5bu, final TDD red verification exposes three expected failures: 中傷 still carries the generic-insult example, selected-sense decisions are missing and the 150-record cohort is absent. All **30 earlier N1 example tests pass** in the red run. New static regressions reuse existing shared assertions for **58 changed-array oracles, 128 selected-sense oracles and 92 unchanged-array oracles**, complete original-index accounting and selected eligible citations. The final fixtures preserve the natural roundabout-route and uncountable-service renderings. Volatile totals move to the latest cohort; historical cohort boundaries remain fixed.

**319 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (504 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after the content, study, build, lint, TypeScript and artifact checks finish and passes on its first run. Unchanged mirror/assessment suites were last repeated in 5o. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port was started. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5bv, TDD red exposes three expected failures: 革新 still carries the unsuitable source construction, selected-sense decisions are missing and the 150-record cohort is absent. All **33 earlier N1 example tests pass** in red. Three new static regressions reuse shared assertions for **46 changed-array oracles, 136 selected-sense oracles and 104 unchanged-array oracles**, complete original-index accounting and selected eligible citations. Explicit exact-citation assertions cover accident-risk fear, ecosystem degeneration and figurative hell. Volatile totals move to the latest cohort; historical cohort boundaries remain fixed.

**322 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (507 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after all other executable code/artifact checks finish and passes on its first run. Unchanged mirror/assessment suites were last repeated in 5o. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port was started. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5bw, TDD red exposes three expected failures: 産婦人科 still carries the unscoped workforce/demand example, selected-sense decisions are missing and the 150-record cohort is absent. All **36 earlier N1 example tests pass** in red. Three new static regressions reuse shared assertions for **46 changed-array oracles, 129 selected-sense oracles and 104 unchanged-array oracles**, complete original-index accounting and selected eligible citations. Explicit exact-citation assertions cover prestige, camera operator and broad form/shape. Volatile totals move to the latest cohort; historical cohort boundaries remain fixed.

**325 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (510 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after all other executable code/artifact checks finish and passes on its first run. Unchanged mirror/assessment suites were last repeated in 5o. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port was started. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5bx, TDD red exposes three expected failures: ドリル still carries the ambiguous practice/tool example, selected-sense decisions are missing and the 150-record cohort is absent. All **39 earlier N1 example tests pass** in red. Three new static regressions reuse shared assertions for **53 changed-array oracles, 137 selected-sense oracles and 97 unchanged-array oracles**, complete original-index accounting and selected eligible citations. Explicit exact-citation assertions cover result, administration and super-prefix senses. Volatile totals move to the latest cohort; historical cohort boundaries remain fixed.

**328 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (513 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after all other executable code/artifact checks finish and passes on its first run. Unchanged mirror/assessment suites were last repeated in 5o. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port was started. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5by, TDD red exposes three expected failures: 冷酷 still carries the added-ownership example, selected-sense decisions are missing and the 150-record cohort is absent. All **42 earlier N1 example tests pass** in red. Three new static regressions reuse shared assertions for **51 changed-array oracles, 134 selected-sense oracles and 99 unchanged-array oracles**, complete original-index accounting and selected eligible citations. Explicit exact-citation assertions cover best, private business and biological evolution. Volatile totals move to the latest cohort; historical cohort boundaries remain fixed.

**331 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (516 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after all other executable code/artifact checks finish and passes on its first run. Unchanged mirror/assessment suites were last repeated in 5o. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port was started. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5bz, TDD red exposes three expected failures: 反響 still carries the past-to-present example, selected-sense decisions are missing and the 150-record cohort is absent. All **45 earlier N1 example tests pass** in red. Three new static regressions reuse shared assertions for **59 changed-array oracles, 134 selected-sense oracles and 91 unchanged-array oracles**, complete original-index accounting and selected eligible citations. Explicit exact-citation assertions cover technical specification, ordinary mood and temporal interval. Volatile totals move to the latest cohort; historical cohort boundaries remain fixed.

**334 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (519 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after all other executable code/artifact checks finish and passes on its first run. Unchanged mirror/assessment suites were last repeated in 5o. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port was started. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

For 5ca, TDD red exposes three expected failures: 幾多 still carries the changed-tense example, selected-sense decisions are missing and the final seven-record cohort is absent. All **48 earlier N1 example tests pass** in red. Three new static regressions reuse shared assertions for **three changed-array oracles, six selected-sense oracles and four unchanged-array oracles**, complete original-index accounting and selected eligible citations. Explicit exact-citation assertions cover many, fixed and sovereignty. The final boundary test also checks N1 empty/earlier-omission accounting and the complete N5–N1 queue, including separate phrase decisions. Volatile totals move to the completion test; historical cohort boundaries remain fixed.

**337 content tests, 174 study tests and 11 isolated PostgreSQL study tests pass (522 targeted tests)**. TypeScript, focused ESLint, whitespace, production build, both artifact reproducibility checks and all **19,016 prompt projections** pass. The isolated database suite runs after all other executable code/artifact checks finish and passes on its first run. Unchanged mirror/assessment suites were last repeated in 5o. This offline data/test increment introduces no UI/style decision or new Impeccable visual surface.

The application retains its earlier immutable Japanese **DRAFT** snapshot (10,291 units); no refresh, publication, application migration or application learner-state write occurs. Read-only status confirms English PUBLISHED (3,284 cards), unchanged active version-3 assessment digest `43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203`, latest migration `20261023030000_study_review_prompts`, zero Japanese progress/reviews/questions and zero isolated schemas/connections. Task-owned test/build processes have exited; no preview server or task port was started. Nothing is staged, committed or pushed; Brandon retains commits and pushes.

Next: deliberately refresh the application's Japanese **DRAFT** from the reviewed catalog through the existing import workflow, verify the imported content and canonical identities, then complete section 6 cross-product verification. Flashcard publication remains separate from assessment authorization.
