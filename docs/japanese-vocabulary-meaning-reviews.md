# Japanese meaning decisions and example selection

Sections 5l–5ae of `MIRROR_PLAN.md`, updated 2026-10-25. Branch: `the-mirror`. Brandon owns commits and pushes.

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

Meaning decisions run after the existing form/dictionary corrections. Both the initial source content and the effective pre-review snapshot survive, so a later semantic decision cannot overwrite an earlier original. After 5ae there are **1,210 complete original-content snapshots**, plus explicit pre-review snapshots for all 3,074 meaning decisions (1,159 originals/2,957 reviews after 5ad; 1,098 originals/2,807 reviews after 5ac; 1,037 originals/2,657 reviews after 5ab; 981 originals/2,507 reviews after 5aa; 927 originals/2,357 reviews after 5z; 863 originals/2,207 reviews after 5y; 804 originals/2,057 reviews after 5x; 743 originals/1,907 reviews after 5w; 683 originals/1,757 reviews after 5v; 638 originals/1,647 reviews after 5u; 593 originals/1,497 reviews after 5t; 532 originals/1,347 reviews after 5s; 458 originals/1,197 reviews after 5r; 390 originals/1,047 reviews after 5q; 282 originals/751 reviews after 5p; 203 originals/551 reviews after 5o; 141 originals/396 reviews after 5n; 92 originals/197 reviews after 5m; 53 originals/21 reviews after 5l). The compiler, correction validator and inventory reuse one text normalizer; no second importer, grader or patch engine is added.

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

Current source catalog SHA-256: `0fccd5db1811170df6afdfd142e6c9b035f5101f606dca456b383e1d0f4d5983`.
Current canonical study SHA-256: `595a64155ead259426b1b4eac0347cc9ace32843ddc86f37857214e7fee66310`.
Current review-row SHA-256: `3c61f3d698dd42964573ac1359ca803d3f33d7e65fbf0c92cabe79fd6170a3c1`.

The application retains its earlier immutable Japanese **DRAFT** snapshot. No refresh, publication, migration or application learner-state write occurs. English publication and the active Japanese assessment remain unchanged.

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

Next: broader example curation, followed by deliberate draft refresh and section 6 cross-product verification. The four N2 phrases keep their distinct source-attestation status; their six inventory signals are not unresolved dictionary gaps. The 2,450 nonliteral target signals need contextual interpretation, not automatic deletion. Publication remains separate from the owner's earlier Japanese assessment authorization.
