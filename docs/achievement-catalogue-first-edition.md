# First Edition — achievement and artwork catalogue

Prepared 18 November 2026. **All 39 artworks generated and visually reviewed after owner authorization. Copy and detailed qualification rules remain a pre-implementation draft; no application behavior changed.** Read with the [product plan](learning-achievements-plan.md), which owns qualification semantics, the real-time popup requirement and the [performance policy](performance-policy.md). See the [complete artwork collection](assets/achievements/first-edition/README.md).

Locked inventory: **39 illustrations, 128×128 native pixel art, shared between the independent English and Japanese collections; 36 visible and 3 hidden.** Reviewed 64×64 thumbnails are exports, not extra achievements. Gallery art is 128×128, with 256×256 enlargement. All titles, requirements, and captions are HTML/interface text, never baked into the art.

The IDs below are proposed permanent identifiers shared by both languages. Award identity includes learner + learning subject + achievement ID. Neither a title change nor a locale switch creates a new award. The owner approved the sample themes with a fox-mascot correction and then authorized the remaining 36 artworks. The complete asset manifest uses these same 39 IDs.

## Reading the requirements

- Every threshold applies only to the current learning subject. Count distinct logical cards across catalog revisions; repeated prompts for one unit do not create new cards.
- A **study day** means completing reviews of five distinct cards in the learner's achievement timezone; mistakes count. Quick-review participation handling follows the product plan. Mere visits do not qualify.
- A **mastered card** is a distinct card that has met the existing subject's mastery rules at least once. These awards do not change the live mastery percentage or revoke an award after a wrong answer.
- A **completed lesson** counts when a stored `CONFIRMED` or `COMPLETED` booking reaches its scheduled end. Pending/unpaid or cancelled bookings do not count; attendance is unverified. Count by scheduled end date and once per booking, including eligible free trials.
- Weeks are proposed as Monday–Sunday in the learner's persisted achievement timezone. Anniversary participation thresholds remain proposed as detailed below; they are not consecutive-day requirements.
- Any valid recorded review or eligible ended lesson interrupts a period of inactivity, even if the review day has fewer than five cards. Comeback awards require completing a study day or completing a lesson on the return day. Preserve the earlier gap while that day is being completed.
- Use locale-aware number/date formatting in the implementation. The literal numbers below make the draft readable; do not build UI copy by concatenating these sentences.

## Cards studied — 6 visible awards

### 01 — First Spark / はじまりのひらめき

- ID: `cards-0001` · Visible.
- Unlock EN: Answer your first flashcard.
- Unlock JA: フラッシュカードの練習で最初の1問に答える。
- Caption EN: Every adventure starts with one tiny spark.
- Caption JA: 小さなひらめきから、冒険がはじまる。
- Art: **Sunny platformer.** A cute white fox adventurer opens a book; one bright star rises above a grassy island. Pointed ears, a fox muzzle and fluffy tail connect the mascot to the app's white fox logo. Bold, simple silhouette and joyful sky. The owner requested the fox after rejecting the chicken-like character in the first sample.

### 02 — Pocket Scholar / ポケットの学者

- ID: `cards-0025` · Visible.
- Unlock EN: Study 25 different flashcards.
- Unlock JA: 異なるフラッシュカードを25枚学習する。
- Caption EN: Your pockets are getting suspiciously knowledgeable.
- Caption JA: ポケットの中、知識でいっぱいになってきた。
- Art: **Cute chibi.** A tiny scholar peeks from an oversized coat pocket, with a miniature book and a jaunty bookmark. Warm, expressive face.

### 03 — Century Club / 100枚クラブ

- ID: `cards-0100` · Visible.
- Unlock EN: Study 100 different flashcards.
- Unlock JA: 異なるフラッシュカードを100枚学習する。
- Caption EN: A hundred small discoveries. Membership approved.
- Caption JA: 100枚ぶんの発見。ようこそ、クラブへ。
- Art: **Retro space arcade.** A small starship enters a luminous circular gate; a fan of collectible card shapes forms the trail. No numerals or lettering in the image.

### 04 — Deck Detective / カード探偵

- ID: `cards-0250` · Visible.
- Unlock EN: Study 250 different flashcards.
- Unlock JA: 異なるフラッシュカードを250枚学習する。
- Caption EN: Another card. Another clue. The plot thickens.
- Caption JA: カードをめくれば、新しい手がかり。謎は深まるばかり。
- Art: **Chibi detective / rainy city.** A little detective examines a glowing card through a magnifying glass beside a rain-streaked cafe window. A playful noir palette.

### 05 — Paper Dragon / 紙のドラゴン

- ID: `cards-0500` · Visible.
- Unlock EN: Study 500 different flashcards.
- Unlock JA: 異なるフラッシュカードを500枚学習する。
- Caption EN: That little stack of cards has developed wings.
- Caption JA: いつのまにか、カードの山に翼が生えた。
- Art: **Japanese paper fantasy.** An origami dragon unfolds from a stack of cards, with red maple leaves circling its wings. Clear dragon silhouette rather than intricate microtexture.

### 06 — Grand Librarian / 大図書館の司書

- ID: `cards-1000` · Visible.
- Unlock EN: Study 1,000 different flashcards.
- Unlock JA: 異なるフラッシュカードを1,000枚学習する。
- Caption EN: We may need a bigger bookshelf.
- Caption JA: そろそろ、大きな本棚が必要かもしれない。
- Art: **Pixel fine art.** A grand, warmly lit library with one imposing central bookshelf and a tiny ladder-climbing librarian; painterly clusters, restrained detail, strong light shape.

## Cards mastered — 5 visible awards

### 07 — That One Stuck! / ひとつ、身についた！

- ID: `mastery-0001` · Visible.
- Unlock EN: Master your first flashcard.
- Unlock JA: カードを初めて1枚マスターする。
- Caption EN: A little less guessing. A little more knowing.
- Caption JA: 「たぶん」が、少しずつ「わかった」に。
- Art: **Cute chibi.** A delighted little creature proudly holds a single star-shaped card close to its chest. A tiny celebratory sparkle, no brain or intelligence ranking imagery.

### 08 — Memory Smith / 記憶の鍛冶屋

- ID: `mastery-0010` · Visible.
- Unlock EN: Master 10 different flashcards.
- Unlock JA: 違うカードを10枚マスターする。
- Caption EN: Forged through practice. Tempered by the occasional wrong answer.
- Caption JA: 練習で鍛えて、ときどき間違えて。記憶のできあがり。
- Art: **Samurai-era craft.** A small swordsmith at a forge shapes a glowing bookmark on an anvil. Warm sparks, indigo apron, no military insignia.

### 09 — Mind Palace / 記憶の宮殿

- ID: `mastery-0050` · Visible.
- Unlock EN: Master 50 different flashcards.
- Unlock JA: 違うカードを50枚マスターする。
- Caption EN: Your ideas have moved into a rather lovely address.
- Caption JA: 覚えたことに、すてきな住まいができました。
- Art: **French romantic fantasy.** A miniature illuminated palace surrounded by roses, with a book-shaped gate and a moonlit garden. The central facade must survive thumbnail reduction.

### 10 — Memory Guardian / 記憶の守り人

- ID: `mastery-0100` · Visible.
- Unlock EN: Master 100 different flashcards.
- Unlock JA: 違うカードを100枚マスターする。
- Caption EN: The knowledge is guarded. The guardian is surprisingly small.
- Caption JA: 知識を守るのは、意外とちいさな守り人。
- Art: **Dark fantasy.** A tiny armored guardian with an oversized book-shaped shield stands before an ember-lit ruined arch. Expressive rather than threatening.

### 11 — Archive Keeper / 知識の番人

- ID: `mastery-0250` · Visible.
- Unlock EN: Master 250 different flashcards.
- Unlock JA: 違うカードを250枚マスターする。
- Caption EN: Some people collect souvenirs. You collect understanding.
- Caption JA: おみやげもいいけれど、集めたのは「わかった」の数。
- Art: **Science fiction.** A little archivist tends a floating crystalline book inside an orbital library; deep blue space and one bright cyan focal object.

## Study rank — 3 visible awards

### 12 — Side Quest Enthusiast / サブクエスト好き

- ID: `rank-0005` · Visible.
- Unlock EN: Reach study rank 5.
- Unlock JA: 学習ランク5に到達する。
- Caption EN: You came for one card. The quest log disagreed.
- Caption JA: 1枚だけのつもりが、冒険はまだまだ続くらしい。
- Art: **Retro adventure.** A cheerful traveler at a signpost with a map and several enticing miniature paths. Signposts carry shapes, never readable words.

### 13 — XP Magnet / 経験値マグネット

- ID: `rank-0010` · Visible.
- Unlock EN: Reach study rank 10.
- Unlock JA: 学習ランク10に到達する。
- Caption EN: Experience seems to be following you around.
- Caption JA: 経験値のほうから、ついてくるようになった。
- Art: **Science-fiction arcade.** A whimsical magnetic robot attracts glowing star fragments around a book-shaped power cell. Chunky, readable forms.

### 14 — Quest Veteran / クエストの達人

- ID: `rank-0025` · Visible.
- Unlock EN: Reach study rank 25.
- Unlock JA: 学習ランク25に到達する。
- Caption EN: Weathered map. Well-used notebook. Plenty of road ahead.
- Caption JA: くたびれた地図と、使い込んだノート。道はまだ続く。
- Art: **Samurai travel story.** A wandering scholar in a straw hat rests beside a milestone, carrying a bundle of books beneath an autumn tree. No rank insignia.

## Curriculum — 1 visible award

### 15 — Chapter Champion / ひとつの章を越えて

- ID: `level-first` · Visible.
- Unlock EN: Complete your first study level.
- Unlock JA: はじめて学習レベルをひとつ修了する。
- Caption EN: Turn the page. There is more adventure on the other side.
- Caption JA: ページをめくろう。その先にも、冒険が待っている。
- Art: **Sunny platformer.** A traveler passes through a giant open-book arch into a brighter landscape. A completed chapter, not an exam certificate or proficiency claim.

## Study streak — 4 visible awards

### 16 — Small Flame / 小さな炎

- ID: `study-streak-0003` · Visible.
- Unlock EN: Keep a 3-day flashcard streak.
- Unlock JA: 3日連続でカードを練習する。
- Caption EN: A spark is nice. Keeping it going is nicer.
- Caption JA: 火花もすてき。育っていく炎は、もっとすてき。
- Art: **Chibi fantasy.** A friendly little flame curls around a candle shaped like a closed book. Cheerful eyes and generous negative space.

### 17 — Seven-Day Spell / 7日間の魔法

- ID: `study-streak-0007` · Visible.
- Unlock EN: Keep a 7-day flashcard streak.
- Unlock JA: 7日連続でカードを練習する。
- Caption EN: The secret ingredient was showing up again.
- Caption JA: 魔法のひけつは、今日もまた来たこと。
- Art: **Romantic anime magic.** A small witch and an open spellbook under a crescent moon, with a ring of seven clear stars. Soft violet and warm gold.

### 18 — Routine Familiar / 習慣の使い魔

- ID: `study-streak-0014` · Visible.
- Unlock EN: Keep a 14-day flashcard streak.
- Unlock JA: 14日連続でカードを練習する。
- Caption EN: Your study habit has acquired a small, judgment-free companion.
- Caption JA: 学習習慣に、そっと寄りそう相棒ができた。
- Art: **Cozy storybook.** A round magical cat curls around a book beside a steaming cup; a little flame floats above its tail. Calm amber window light.

### 19 — Flame Keeper / 炎を絶やさぬ者

- ID: `study-streak-0030` · Visible.
- Unlock EN: Keep a 30-day flashcard streak.
- Unlock JA: 30日連続でカードを練習する。
- Caption EN: Through ordinary days, the flame kept burning.
- Caption JA: いつもの日々の中で、炎をつなぎ続けた。
- Art: **Dark fantasy.** A small keeper shelters a bright brazier beneath a broken stone canopy while rain falls outside. Warmth and resilience lead the scene.

## Teacher lessons — 6 visible awards

### 20 — Hello There / こんにちは、冒険！

- ID: `lessons-0001` · Visible.
- Unlock EN: Complete your first lesson.
- Unlock JA: 初めてのレッスンを終える。
- Caption EN: A new conversation. A new beginning.
- Caption JA: 新しい会話から、新しい一歩。
- Art: **Romantic French cafe.** Two welcoming chairs, two cups, and an open notebook at a tiny window table; the scene celebrates conversation, not a romantic teacher relationship.

### 21 — I Have Notes / メモならあります！

- ID: `lessons-0005` · Visible.
- Unlock EN: Complete 5 lessons.
- Unlock JA: レッスンを5回受ける。
- Caption EN: The notebook has entered its main-character era.
- Caption JA: ノート、ついに主役になる。
- Art: **Expressive anime pixel art.** A delighted notebook character raises a pencil like a dramatic prop, with flying bookmarks and a spotlight-shaped burst. No rendered handwriting.

### 22 — Conversation Party / 会話のパーティー

- ID: `lessons-0010` · Visible.
- Unlock EN: Complete 10 lessons.
- Unlock JA: レッスンを10回受ける。
- Caption EN: The conversation has officially joined the adventure.
- Caption JA: 会話が、冒険の仲間になった。
- Art: **Science-fiction ensemble.** A small space crew gathers around a glowing radio and book, with simple speech-bubble shapes. This is a metaphor, not a claim that the learner took group lessons.

### 23 — Dialogue Adventurer / 対話の冒険者

- ID: `lessons-0025` · Visible.
- Unlock EN: Complete 25 lessons.
- Unlock JA: レッスンを25回受ける。
- Caption EN: Every conversation opens another little door.
- Caption JA: 会話を重ねるたび、小さな扉が開いていく。
- Art: **Samurai travel / spring Japan.** A traveler steps through a courtyard gate with a notebook as cherry petals drift past. A luminous open doorway is the focal shape.

### 24 — Speaking of Which / そういえば、もう50回

- ID: `lessons-0050` · Visible.
- Unlock EN: Complete 50 lessons.
- Unlock JA: レッスンを50回受ける。
- Caption EN: One conversation led to another. And rather a lot more.
- Caption JA: ひとつの会話が、次の会話へ。気づけば、こんなに。
- Art: **French romance.** A glowing cafe on a riverside street at dusk, with a bridge and two empty cups in the foreground. Rose, amber, and deep blue color clusters.

### 25 — Centurion of Conversation / 100回の語り部

- ID: `lessons-0100` · Visible.
- Unlock EN: Complete 100 lessons.
- Unlock JA: レッスンを100回受ける。
- Caption EN: A hundred chapters of conversation. The story continues.
- Caption JA: 100回ぶんの会話。その物語は、まだ続いていく。
- Art: **Pixel fine art / art nouveau.** A luminous open book within a flowing botanical arch; theatrical golden light suggests a grand storytelling stage. No embedded count or text.

## Weekly lesson streak — 3 visible awards

### 26 — Same Time Next Week? / また来週、この時間に

- ID: `lesson-weeks-0004` · Visible.
- Unlock EN: Take a lesson 4 weeks in a row.
- Unlock JA: 4週連続でレッスンを受ける。
- Caption EN: A little room in the week for a little more learning.
- Caption JA: 1週間の中に、学びの居場所ができた。
- Art: **Cozy French cafe.** A familiar corner table and an open appointment book under a hanging lamp. No clock hands implying a required lesson time.

### 27 — Regular Character / すっかりおなじみ

- ID: `lesson-weeks-0008` · Visible.
- Unlock EN: Take a lesson 8 weeks in a row.
- Unlock JA: 8週連続でレッスンを受ける。
- Caption EN: You were a guest star. Now you are a regular.
- Caption JA: ゲスト出演のはずが、すっかりレギュラーに。
- Art: **Cute chibi.** A friendly owl settles into a book-lined alcove with slippers and a little reserved-looking cushion, but no text on the cushion.

### 28 — Season Regular / ワンシーズンのおなじみさん

- ID: `lesson-weeks-0012` · Visible.
- Unlock EN: Take a lesson 12 weeks in a row.
- Unlock JA: 12週連続でレッスンを受ける。
- Caption EN: The scenery changes. Your learning keeps its place.
- Caption JA: 景色が変わっても、学びはいつもの場所に。
- Art: **Autumn Japan.** A welcoming study room framed by a glowing maple branch, with a lantern and an open book. Seasonal atmosphere is decorative, not a calendar restriction.

## Active study days — 4 visible awards

### 29 — Showing Up / 今日も来た！

- ID: `study-days-0010` · Visible.
- Unlock EN: Practice flashcards on 10 different days.
- Unlock JA: 合計10日、カードを練習する。
- Caption EN: Ten days of making a little space for yourself.
- Caption JA: 自分の学びに、小さな時間をつくった10日間。
- Art: **Chibi adventure.** A small learner waves from a path of stepping stones, carrying a bright book-shaped backpack. Each step feels achievable.

### 30 — Making It a Habit / いつもの習慣

- ID: `study-days-0030` · Visible.
- Unlock EN: Practice flashcards on 30 different days.
- Unlock JA: 合計30日、カードを練習する。
- Caption EN: A book, a moment, and a familiar little ritual.
- Caption JA: 本を開いて、ひと息。いつもの小さな習慣。
- Art: **Quiet spring Japan.** A teapot, open book, and one cherry blossom at a sunlit desk. A compact still life with no tiny illegible page detail.

### 31 — Frequent Flyer / 学びの常連

- ID: `study-days-0100` · Visible.
- Unlock EN: Practice flashcards on 100 different days.
- Unlock JA: 合計100日、カードを練習する。
- Caption EN: Your next destination appears to be another discovery.
- Caption JA: 次の行き先は、まだ知らない発見。
- Art: **Science-fiction travel.** A compact starship with a book-shaped sail passes colorful planets. Travel patches are abstract shapes, not flags or passport text.

### 32 — Part of the Furniture / もはや住人

- ID: `study-days-0250` · Visible.
- Unlock EN: Practice flashcards on 250 different days.
- Unlock JA: 合計250日、カードを練習する。
- Caption EN: We saved you a seat. It appears to be yours now.
- Caption JA: 席、空けておきました。もう、あなたの指定席ですね。
- Art: **Cozy storybook.** A well-loved armchair, a slightly precarious book stack, and a tiny creature asleep on the armrest. Warm light gives the chair a recognizable silhouette.

## Loyalty — 3 visible awards

These participation requirements implement the proposed anniversary-plus-continued-learning approach. "Active month" means at least one qualifying study day or completed lesson; it does not mean activity every day in that month. The current month is included in the trailing month window. Open a badge for the exact rule. On or after the anniversary, the learner completes a study day or a lesson. Counting the current calendar month, the activity minimums are 2 of the last 3 months, 3 of the last 6 months, and 6 of the last 12 months, respectively.

### 33 — Getting Comfortable / ここがしっくり

- ID: `loyalty-0003m` · Visible.
- Unlock EN: Three months in. Back for more!
- Unlock JA: 学び始めて3か月。今日もひとつ！
- Caption EN: This little corner of the world is starting to feel familiar.
- Caption JA: この場所が、少しずつなじんできた。
- Art: **French romance.** A welcoming cafe window with a book, flowering plant, and a comfortably rumpled seat cushion. Intimate, warm, and unhurried.

### 34 — Long Story Short / 気づけば半年

- ID: `loyalty-0006m` · Visible.
- Unlock EN: Six months in. Keep the story going!
- Unlock JA: 学び始めて半年。続きのページへ！
- Caption EN: Six months later, the story still has more to say.
- Caption JA: 半年たっても、物語にはまだ続きがある。
- Art: **Romantic anime landscape.** A little riverside bench, a closed notebook, and glowing lantern reflections under a violet evening sky. Original quiet storytelling scene.

### 35 — One Year Together / 一緒に歩んだ1年

- ID: `loyalty-0012m` · Visible.
- Unlock EN: One year in. Hello, chapter two!
- Unlock JA: 学び始めて1年。さあ、2年目へ！
- Caption EN: A year of returning to the story, in your own rhythm.
- Caption JA: 自分のペースで、何度もこの物語に戻ってきた1年。
- Art: **Japanese seasons.** One strong tree silhouette changes from blossoms to summer green, maple red, and snow across its canopy. A small book rests at the roots. No anniversary number in the art.

## Hidden surprises — 3 awards

The following names, copy, goals, scene descriptions, and image references must not be sent to learners before unlocking. The all-achievements view displays only anonymous mystery placeholders. These are owner/editor review details, not a public art manifest.

### 36 — Where Have You Been? / おかえり、待ってたよ

- ID: `return-0014d` · Hidden.
- Unlock EN: Back for more after 14 days away!
- Unlock JA: 14日以上休んで、学びにカムバック！
- Detail EN: Return after at least 14 full inactive days. Review 5 different cards or complete a lesson on the day you return.
- Detail JA: 学習を丸14日以上休んだ後、復帰した日に違うカードを5枚復習するか、レッスンを1回受ける。
- Caption EN: Your flashcards started a search party. Welcome back.
- Caption JA: カードたちが捜索隊を結成していました。おかえりなさい。
- Art: **Cute chibi.** A worried-but-delighted companion holds a lantern and a comically oversized map. The map contains doodle paths, not readable words.

### 37 — Somehow, You Returned / 伝説の帰還

- ID: `return-0090d` · Hidden.
- Unlock EN: Back for more after 90 days away!
- Unlock JA: 90日以上休んで、学びにカムバック！
- Detail EN: Return after at least 90 full inactive days. Review 5 different cards or complete a lesson on the day you return.
- Detail JA: 学習を丸90日以上休んだ後、復帰した日に違うカードを5枚復習するか、レッスンを1回受ける。
- Caption EN: The quest log was getting dusty. Your adventure continues.
- Caption JA: 冒険の記録に、少しほこりが。続きのページを開こう。
- Art: **Dark fantasy.** An absurdly small armored traveler emerges from a moss-covered doorway holding a warm lantern. Gentle humor and the glow of a second beginning.

### 38 — Consistently Inconsistent / 安定の気まぐれ

- ID: `irregular-0001` · Hidden.
- Unlock EN: Ten study days. Three comebacks!
- Unlock JA: 学習日が10日、カムバックが3回！
- Detail EN: Spread 10 study days across at least 30 calendar days. On 3 of those study days, return after at least 3 full inactive days.
- Detail JA: 30日以上の期間で学習日を10日達成する。そのうち3回は、丸3日以上休んだ後の復帰日に達成する。
- Caption EN: Your timetable is abstract art. You still keep showing up.
- Caption JA: あなたの予定表は抽象画。それでも、ちゃんと戻ってくる。
- Art: **Pixel fine art.** A whimsical calendar-like mosaic with scattered star markers, a wandering ribbon, and a tiny paintbrush. No dates, numbers, or shame-coded red crosses.

## Study and lessons — 1 visible award

### 39 — Side Quests & Main Story / サブクエも本編も

- ID: `study-and-lessons-week` · Visible.
- Unlock EN: Three study days. One lesson. Same week!
- Unlock JA: 1週間で、カードを3日、レッスンを1回！
- Caption EN: The practice and the conversation have joined forces.
- Caption JA: ひとりの練習と、先生との会話が合流した。
- Art: **Retro adventure.** Two paths—one marked by a book, the other by speech-bubble shapes—meet at a bright gateway. One small traveler proceeds through it. No text embedded in the symbols.

## Shared localized explanations

Use expandable, accessible explanations for terms instead of hiding essential qualifications in a tooltip. These are draft sentences, to be adapted into localized message templates during implementation.

| Term | English | Japanese |
| --- | --- | --- |
| Study day | Review five different cards in one day. Wrong answers count too. | 1日に異なるカードを5枚復習すると、学習日として数えます。間違えた回答も含まれます。 |
| Distinct cards | Each card counts once, however many times you review it. | 同じカードを何度復習しても、枚数は1枚として数えます。 |
| Mastery | A card counts when it first reaches mastery under this subject's study rules. | この学習言語のルールで、はじめてマスターしたカードを数えます。 |
| Completed lesson | Confirmed lessons count after their scheduled end time. Cancelled bookings and bookings still awaiting payment do not count. Confirmed free trials count too. Attendance is not verified. | 予約が確定したレッスンを、終了予定時刻の後に数えます。キャンセル済み・支払い待ちの予約は含みません。予約が確定した無料体験レッスンも対象です。実際の出席確認は行っていません。 |
| Active month | A month with at least one study day or completed lesson. Months do not have to be consecutive. | 学習日が1日以上あるか、レッスンを1回以上受けた月です。連続していなくてもかまいません。 |
| First learning activity | Your first verifiable study day or eligible lesson in this learning language. | この学習言語で、記録から確認できる最初の学習日、または対象のレッスンです。 |
| Retained award | Once earned, this achievement stays in your collection even if a streak ends. | 一度獲得した実績は、連続記録が途切れてもコレクションに残ります。 |
| Gallery invitation | Your Art Gallery is open. Your first artwork is waiting for you. | アートギャラリーが開きました。最初の作品が、あなたを待っています。 |

Lesson end dates, inactivity gaps, and anniversaries use server-owned facts and the persisted achievement timezone. A 90-day return can legitimately unlock both comeback tiers together; show one coalesced celebration. Backfilled awards receive one collection notice, not a replay of every toast.

## Art-production and localization review

- All 39 scene briefs have corresponding generated artwork. Confirm final localized copy and detailed qualification rules before implementing awards; the artwork itself does not settle historical evidence, timezone or recovery semantics.
- First art sample batch generated on 18 November: `cards-0001` (sunny platformer), `mastery-0100` (dark fantasy), and `loyalty-0006m` (romantic landscape). These are **3 of the 39**, not additional achievements. PixelLab charged 18 generation units initially plus 6 for the owner's white-fox correction to First Spark: 24 total. All four jobs completed. Source prompts, edit lineage, approval states, checksums, and exports are in the [sample manifest](assets/achievements/first-edition-samples/manifest.json).
- Review each sample at 64, 128, and 256 display pixels on light and dark backgrounds before generating the other 36. Native artwork is always 128×128; use the same artwork in both learning subjects and locales.
- The remaining 36 artworks are complete. They used 216 units plus 6 for a seven-star correction, bringing all project art generation to 246 units including the initial samples/fox edit. All 39 native images, thumbnails, prompts and review sheets are indexed in the [complete collection](assets/achievements/first-edition/README.md). This directory is not a client-shipped asset manifest.
- Keep source prompts/provenance with the asset workflow. Use original characters/scenes and label theme references as mood references. Generation cost and retries depend on the selected PixelLab tool; 39 approved artworks is an output target, not a promise of exactly 39 billed generations.
- The Japanese copy is a complete editorial draft, not a claim of native-speaker review. Verify natural tone, number/date templates, truncation/wrapping, and accessibility in both locales before release.
- A functional implementation needs the shared copy beyond these 39 entries: gallery navigation, filters, progress, loading/errors, empty/locked states, and announcements listed in the product plan. These are not additional artworks.
- This document is a development artifact. Do not import it wholesale into the frontend or publish its hidden-achievement sections to learners.
