// Visible artwork for the offline design preview.
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
      "Submit a graded answer for your first flashcard.",
      "はじめてフラッシュカードの問題に回答する。"
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
      "Bring your first flashcard to mastery.",
      "はじめて1枚のフラッシュカードをマスターする。"
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
      "Bring 10 different flashcards to mastery.",
      "異なるフラッシュカードを10枚マスターする。"
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
      "Bring 50 different flashcards to mastery.",
      "異なるフラッシュカードを50枚マスターする。"
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
      "Bring 100 different flashcards to mastery.",
      "異なるフラッシュカードを100枚マスターする。"
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
      "Bring 250 different flashcards to mastery.",
      "異なるフラッシュカードを250枚マスターする。"
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
      "Complete a study day on 3 consecutive days.",
      "3日連続で、毎日5枚以上の異なるカードを復習する。"
    ]
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
      "Complete a study day on 7 consecutive days.",
      "7日連続で、毎日5枚以上の異なるカードを復習する。"
    ]
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
      "Complete a study day on 14 consecutive days.",
      "14日連続で、毎日5枚以上の異なるカードを復習する。"
    ]
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
      "Complete a study day on 30 consecutive days.",
      "30日連続で、毎日5枚以上の異なるカードを復習する。"
    ]
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
      "Earn your first lesson credit.",
      "はじめてレッスン実績を1回分獲得する。"
    ]
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
      "Earn 5 lesson credits.",
      "レッスン実績を5回分獲得する。"
    ]
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
      "Earn 10 lesson credits.",
      "レッスン実績を10回分獲得する。"
    ]
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
      "Earn 25 lesson credits.",
      "レッスン実績を25回分獲得する。"
    ]
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
      "Earn 50 lesson credits.",
      "レッスン実績を50回分獲得する。"
    ]
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
      "Earn 100 lesson credits.",
      "レッスン実績を100回分獲得する。"
    ]
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
      "Earn at least one lesson credit in each of 4 consecutive weeks.",
      "4週連続で、毎週1回以上のレッスン実績を獲得する。"
    ]
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
      "Earn at least one lesson credit in each of 8 consecutive weeks.",
      "8週連続で、毎週1回以上のレッスン実績を獲得する。"
    ]
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
      "Earn at least one lesson credit in each of 12 consecutive weeks.",
      "12週連続で、毎週1回以上のレッスン実績を獲得する。"
    ]
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
      "Complete 10 study days in total. They do not have to be consecutive.",
      "学習日を合計10日達成する。連続していなくてもOK。"
    ]
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
      "Complete 30 study days in total. They do not have to be consecutive.",
      "学習日を合計30日達成する。連続していなくてもOK。"
    ]
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
      "Complete 100 study days in total. They do not have to be consecutive.",
      "学習日を合計100日達成する。連続していなくてもOK。"
    ]
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
      "Complete 250 study days in total. They do not have to be consecutive.",
      "学習日を合計250日達成する。連続していなくてもOK。"
    ]
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
      "On or after your 3-month learning anniversary, complete a study day or earn a lesson credit, with activity in at least 2 of the last 3 calendar months, including the current month.",
      "学びはじめて3か月以降に、学習日を達成するか、レッスン実績を獲得する。その時点で、今月を含む直近3か月のうち2か月以上に学習日またはレッスン実績があること。"
    ]
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
      "On or after your 6-month learning anniversary, complete a study day or earn a lesson credit, with activity in at least 3 of the last 6 calendar months, including the current month.",
      "学びはじめて6か月以降に、学習日を達成するか、レッスン実績を獲得する。その時点で、今月を含む直近6か月のうち3か月以上に学習日またはレッスン実績があること。"
    ]
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
      "On or after your one-year learning anniversary, complete a study day or earn a lesson credit, with activity in at least 6 of the last 12 calendar months, including the current month.",
      "学びはじめて1年以降に、学習日を達成するか、レッスン実績を獲得する。その時点で、今月を含む直近12か月のうち6か月以上に学習日またはレッスン実績があること。"
    ]
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
      "Complete 3 study days and earn at least one lesson credit in the same calendar week.",
      "同じ週に学習日を3日達成し、レッスン実績を1回以上獲得する。"
    ]
  }
];
