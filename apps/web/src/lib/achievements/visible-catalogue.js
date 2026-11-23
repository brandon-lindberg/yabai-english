// Public first-edition catalogue, shared with the offline design preview.
const studyDayDetails = [
  "Review at least 5 different flashcards in a day. Wrong answers count too.",
  "1日に違うカードを5枚以上復習すると1日分。間違えたカードも数えます。"
];
const studyStreakDetails = [
  "Review 5 different flashcards or complete a lesson. Each calendar day counts once.",
  "違うカードを5枚復習するか、レッスンを1回終えると達成。1日につき1回まで数えます。"
];
const lessonDetails = [
  "A confirmed lesson counts once its scheduled end time passes. Free trials count too.",
  "予約が確定したレッスンは、終了予定時刻を過ぎると1回として数えます。無料体験も対象です。"
];
const lessonWeekDetails = [
  "Finish at least one lesson each week, Monday through Sunday. Free trials count too.",
  "月曜から日曜までにレッスンを1回以上受けると、その週の分になります。無料体験も対象です。"
];

function anniversaryDetails(months, activeMonths) {
  return [
    `Review 5 different cards in a day or finish a lesson to start the clock. Do either again once ${months} months have passed. Be active in at least ${activeMonths} of the last ${months} months, including this month.`,
    `初めて1日に違うカードを5枚復習した日か、最初のレッスンを終えた日から数えます。${months}か月たったら、またどちらかに挑戦。今月を含む直近${months}か月のうち${activeMonths}か月以上で、どちらかを達成すると獲得できます。`
  ];
}

const catalogue = [
  {
    "id": "cards-0001",
    "title": [
      "First Spark",
      "はじまりのひらめき"
    ],
    "caption": [
      "Every adventure starts with one tiny spark.",
      "小さなひらめきから、冒険がはじまる。"
    ],
    "rule": [
      "Answer your first flashcard.",
      "フラッシュカードの練習で最初の1問に答える。"
    ]
  },
  {
    "id": "cards-0025",
    "title": [
      "Pocket Scholar",
      "ポケットの学者"
    ],
    "caption": [
      "Your pockets are getting suspiciously knowledgeable.",
      "ポケットの中、知識でいっぱいになってきた。"
    ],
    "rule": [
      "Study 25 different flashcards.",
      "異なるフラッシュカードを25枚学習する。"
    ]
  },
  {
    "id": "cards-0100",
    "title": [
      "Century Club",
      "100枚クラブ"
    ],
    "caption": [
      "A hundred small discoveries. Membership approved.",
      "100枚ぶんの発見。ようこそ、クラブへ。"
    ],
    "rule": [
      "Study 100 different flashcards.",
      "異なるフラッシュカードを100枚学習する。"
    ]
  },
  {
    "id": "cards-0250",
    "title": [
      "Deck Detective",
      "カード探偵"
    ],
    "caption": [
      "Another card. Another clue. The plot thickens.",
      "カードをめくれば、新しい手がかり。謎は深まるばかり。"
    ],
    "rule": [
      "Study 250 different flashcards.",
      "異なるフラッシュカードを250枚学習する。"
    ]
  },
  {
    "id": "cards-0500",
    "title": [
      "Paper Dragon",
      "紙のドラゴン"
    ],
    "caption": [
      "That little stack of cards has developed wings.",
      "いつのまにか、カードの山に翼が生えた。"
    ],
    "rule": [
      "Study 500 different flashcards.",
      "異なるフラッシュカードを500枚学習する。"
    ]
  },
  {
    "id": "cards-1000",
    "title": [
      "Grand Librarian",
      "大図書館の司書"
    ],
    "caption": [
      "We may need a bigger bookshelf.",
      "そろそろ、大きな本棚が必要かもしれない。"
    ],
    "rule": [
      "Study 1,000 different flashcards.",
      "異なるフラッシュカードを1,000枚学習する。"
    ]
  },
  {
    "id": "mastery-0001",
    "title": [
      "That One Stuck!",
      "ひとつ、身についた！"
    ],
    "caption": [
      "A little less guessing. A little more knowing.",
      "「たぶん」が、少しずつ「わかった」に。"
    ],
    "rule": [
      "Master your first flashcard.",
      "カードを初めて1枚マスターする。"
    ]
  },
  {
    "id": "mastery-0010",
    "title": [
      "Memory Smith",
      "記憶の鍛冶屋"
    ],
    "caption": [
      "Forged through practice. Tempered by the occasional wrong answer.",
      "練習で鍛えて、ときどき間違えて。記憶のできあがり。"
    ],
    "rule": [
      "Master 10 different flashcards.",
      "違うカードを10枚マスターする。"
    ]
  },
  {
    "id": "mastery-0050",
    "title": [
      "Mind Palace",
      "記憶の宮殿"
    ],
    "caption": [
      "Your ideas have moved into a rather lovely address.",
      "覚えたことに、すてきな住まいができました。"
    ],
    "rule": [
      "Master 50 different flashcards.",
      "違うカードを50枚マスターする。"
    ]
  },
  {
    "id": "mastery-0100",
    "title": [
      "Memory Guardian",
      "記憶の守り人"
    ],
    "caption": [
      "The knowledge is guarded. The guardian is surprisingly small.",
      "知識を守るのは、意外とちいさな守り人。"
    ],
    "rule": [
      "Master 100 different flashcards.",
      "違うカードを100枚マスターする。"
    ]
  },
  {
    "id": "mastery-0250",
    "title": [
      "Archive Keeper",
      "知識の番人"
    ],
    "caption": [
      "Some people collect souvenirs. You collect understanding.",
      "おみやげもいいけれど、集めたのは「わかった」の数。"
    ],
    "rule": [
      "Master 250 different flashcards.",
      "違うカードを250枚マスターする。"
    ]
  },
  {
    "id": "rank-0005",
    "title": [
      "Side Quest Enthusiast",
      "サブクエスト好き"
    ],
    "caption": [
      "You came for one card. The quest log disagreed.",
      "1枚だけのつもりが、冒険はまだまだ続くらしい。"
    ],
    "rule": [
      "Reach study rank 5.",
      "学習ランク5に到達する。"
    ]
  },
  {
    "id": "rank-0010",
    "title": [
      "XP Magnet",
      "経験値マグネット"
    ],
    "caption": [
      "Experience seems to be following you around.",
      "経験値のほうから、ついてくるようになった。"
    ],
    "rule": [
      "Reach study rank 10.",
      "学習ランク10に到達する。"
    ]
  },
  {
    "id": "rank-0025",
    "title": [
      "Quest Veteran",
      "クエストの達人"
    ],
    "caption": [
      "Weathered map. Well-used notebook. Plenty of road ahead.",
      "くたびれた地図と、使い込んだノート。道はまだ続く。"
    ],
    "rule": [
      "Reach study rank 25.",
      "学習ランク25に到達する。"
    ]
  },
  {
    "id": "level-first",
    "title": [
      "Chapter Champion",
      "ひとつの章を越えて"
    ],
    "caption": [
      "Turn the page. There is more adventure on the other side.",
      "ページをめくろう。その先にも、冒険が待っている。"
    ],
    "rule": [
      "Complete your first study level.",
      "はじめて学習レベルをひとつ修了する。"
    ]
  },
  {
    "id": "study-streak-0003",
    "title": [
      "Small Flame",
      "小さな炎"
    ],
    "caption": [
      "A spark is nice. Keeping it going is nicer.",
      "火花もすてき。育っていく炎は、もっとすてき。"
    ],
    "rule": [
      "Keep a 3-day study streak.",
      "3日連続で学習する。"
    ],
    "details": studyStreakDetails
  },
  {
    "id": "study-streak-0007",
    "title": [
      "Seven-Day Spell",
      "7日間の魔法"
    ],
    "caption": [
      "The secret ingredient was showing up again.",
      "魔法のひけつは、今日もまた来たこと。"
    ],
    "rule": [
      "Keep a 7-day study streak.",
      "7日連続で学習する。"
    ],
    "details": studyStreakDetails
  },
  {
    "id": "study-streak-0014",
    "title": [
      "Routine Familiar",
      "習慣の使い魔"
    ],
    "caption": [
      "Your study habit has acquired a small, judgment-free companion.",
      "学習習慣に、そっと寄りそう相棒ができた。"
    ],
    "rule": [
      "Keep a 14-day study streak.",
      "14日連続で学習する。"
    ],
    "details": studyStreakDetails
  },
  {
    "id": "study-streak-0030",
    "title": [
      "Flame Keeper",
      "炎を絶やさぬ者"
    ],
    "caption": [
      "Through ordinary days, the flame kept burning.",
      "いつもの日々の中で、炎をつなぎ続けた。"
    ],
    "rule": [
      "Keep a 30-day study streak.",
      "30日連続で学習する。"
    ],
    "details": studyStreakDetails
  },
  {
    "id": "lessons-0001",
    "title": [
      "Hello There",
      "こんにちは、冒険！"
    ],
    "caption": [
      "A new conversation. A new beginning.",
      "新しい会話から、新しい一歩。"
    ],
    "rule": [
      "Complete your first lesson.",
      "初めてのレッスンを終える。"
    ],
    "details": lessonDetails
  },
  {
    "id": "lessons-0005",
    "title": [
      "I Have Notes",
      "メモならあります！"
    ],
    "caption": [
      "The notebook has entered its main-character era.",
      "ノート、ついに主役になる。"
    ],
    "rule": [
      "Complete 5 lessons.",
      "レッスンを5回受ける。"
    ],
    "details": lessonDetails
  },
  {
    "id": "lessons-0010",
    "title": [
      "Conversation Party",
      "会話のパーティー"
    ],
    "caption": [
      "The conversation has officially joined the adventure.",
      "会話が、冒険の仲間になった。"
    ],
    "rule": [
      "Complete 10 lessons.",
      "レッスンを10回受ける。"
    ],
    "details": lessonDetails
  },
  {
    "id": "lessons-0025",
    "title": [
      "Dialogue Adventurer",
      "対話の冒険者"
    ],
    "caption": [
      "Every conversation opens another little door.",
      "会話を重ねるたび、小さな扉が開いていく。"
    ],
    "rule": [
      "Complete 25 lessons.",
      "レッスンを25回受ける。"
    ],
    "details": lessonDetails
  },
  {
    "id": "lessons-0050",
    "title": [
      "Speaking of Which",
      "そういえば、もう50回"
    ],
    "caption": [
      "One conversation led to another. And rather a lot more.",
      "ひとつの会話が、次の会話へ。気づけば、こんなに。"
    ],
    "rule": [
      "Complete 50 lessons.",
      "レッスンを50回受ける。"
    ],
    "details": lessonDetails
  },
  {
    "id": "lessons-0100",
    "title": [
      "Centurion of Conversation",
      "100回の語り部"
    ],
    "caption": [
      "A hundred chapters of conversation. The story continues.",
      "100回ぶんの会話。その物語は、まだ続いていく。"
    ],
    "rule": [
      "Complete 100 lessons.",
      "レッスンを100回受ける。"
    ],
    "details": lessonDetails
  },
  {
    "id": "lesson-weeks-0004",
    "title": [
      "Same Time Next Week?",
      "また来週、この時間に"
    ],
    "caption": [
      "A little room in the week for a little more learning.",
      "1週間の中に、学びの居場所ができた。"
    ],
    "rule": [
      "Take a lesson 4 weeks in a row.",
      "4週連続でレッスンを受ける。"
    ],
    "details": lessonWeekDetails
  },
  {
    "id": "lesson-weeks-0008",
    "title": [
      "Regular Character",
      "すっかりおなじみ"
    ],
    "caption": [
      "You were a guest star. Now you are a regular.",
      "ゲスト出演のはずが、すっかりレギュラーに。"
    ],
    "rule": [
      "Take a lesson 8 weeks in a row.",
      "8週連続でレッスンを受ける。"
    ],
    "details": lessonWeekDetails
  },
  {
    "id": "lesson-weeks-0012",
    "title": [
      "Season Regular",
      "ワンシーズンのおなじみさん"
    ],
    "caption": [
      "The scenery changes. Your learning keeps its place.",
      "景色が変わっても、学びはいつもの場所に。"
    ],
    "rule": [
      "Take a lesson 12 weeks in a row.",
      "12週連続でレッスンを受ける。"
    ],
    "details": lessonWeekDetails
  },
  {
    "id": "study-days-0010",
    "title": [
      "Showing Up",
      "今日も来た！"
    ],
    "caption": [
      "Ten days of making a little space for yourself.",
      "自分の学びに、小さな時間をつくった10日間。"
    ],
    "rule": [
      "Practice flashcards on 10 different days.",
      "合計10日、カードを練習する。"
    ],
    "details": studyDayDetails
  },
  {
    "id": "study-days-0030",
    "title": [
      "Making It a Habit",
      "いつもの習慣"
    ],
    "caption": [
      "A book, a moment, and a familiar little ritual.",
      "本を開いて、ひと息。いつもの小さな習慣。"
    ],
    "rule": [
      "Practice flashcards on 30 different days.",
      "合計30日、カードを練習する。"
    ],
    "details": studyDayDetails
  },
  {
    "id": "study-days-0100",
    "title": [
      "Frequent Flyer",
      "学びの常連"
    ],
    "caption": [
      "Your next destination appears to be another discovery.",
      "次の行き先は、まだ知らない発見。"
    ],
    "rule": [
      "Practice flashcards on 100 different days.",
      "合計100日、カードを練習する。"
    ],
    "details": studyDayDetails
  },
  {
    "id": "study-days-0250",
    "title": [
      "Part of the Furniture",
      "もはや住人"
    ],
    "caption": [
      "We saved you a seat. It appears to be yours now.",
      "席、空けておきました。もう、あなたの指定席ですね。"
    ],
    "rule": [
      "Practice flashcards on 250 different days.",
      "合計250日、カードを練習する。"
    ],
    "details": studyDayDetails
  },
  {
    "id": "loyalty-0003m",
    "title": [
      "Getting Comfortable",
      "ここがしっくり"
    ],
    "caption": [
      "This little corner of the world is starting to feel familiar.",
      "この場所が、少しずつなじんできた。"
    ],
    "rule": [
      "Three months in. Back for more!",
      "学び始めて3か月。今日もひとつ！"
    ],
    "details": anniversaryDetails(3, 2)
  },
  {
    "id": "loyalty-0006m",
    "title": [
      "Long Story Short",
      "気づけば半年"
    ],
    "caption": [
      "Six months later, the story still has more to say.",
      "半年たっても、物語にはまだ続きがある。"
    ],
    "rule": [
      "Six months in. Keep the story going!",
      "学び始めて半年。続きのページへ！"
    ],
    "details": anniversaryDetails(6, 3)
  },
  {
    "id": "loyalty-0012m",
    "title": [
      "One Year Together",
      "一緒に歩んだ1年"
    ],
    "caption": [
      "A year of returning to the story, in your own rhythm.",
      "自分のペースで、何度もこの物語に戻ってきた1年。"
    ],
    "rule": [
      "One year in. Hello, chapter two!",
      "学び始めて1年。さあ、2年目へ！"
    ],
    "details": anniversaryDetails(12, 6)
  },
  {
    "id": "study-and-lessons-week",
    "title": [
      "Side Quests & Main Story",
      "サブクエも本編も"
    ],
    "caption": [
      "The practice and the conversation have joined forces.",
      "ひとりの練習と、先生との会話が合流した。"
    ],
    "rule": [
      "Three study days. One lesson. Same week!",
      "1週間で、カードを3日、レッスンを1回！"
    ],
    "details": [
      "Between Monday and Sunday, review 5 different cards on at least 3 days and finish at least one lesson.",
      "月曜から日曜までに、違うカードを1日5枚以上復習する日を3日つくり、レッスンを1回以上受けます。"
    ]
  }
];

if (typeof module !== "undefined") module.exports = catalogue;
