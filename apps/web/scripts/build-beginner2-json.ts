/**
 * Build data/study/beginner-2.json — Beginner L2 (functional daily English).
 * Spec: 15–20 decks, 10–12 cards each, 180–220 total. B2 prompts: still Japanese-friendly; see `prompt-locale-policy.ts`.
 *
 *   yarn study:build-beginner2-json   (repo root or apps/web)
 */
import fs from "node:fs";
import path from "node:path";
import { StudyLevelCode } from "@prisma/client";
import { beginner2LevelFileSchema } from "../src/lib/study/schemas";

const OUT = path.join(__dirname, "../data/study/beginner-2.json");

type Pair = [string, string];

const DECKS: { titleJa: string; titleEn: string; cards: Pair[] }[] = [
  {
    titleJa: "毎日のルーティン（朝）",
    titleEn: "Daily Routines — Morning",
    cards: [
      ["起きる", "wake up"],
      ["顔を洗う", "wash your face"],
      ["歯を磨く", "brush your teeth"],
      ["朝ご飯を食べる", "eat breakfast"],
      ["着替える", "get dressed"],
      ["コーヒーを飲む", "drink coffee"],
      ["家を出る", "leave home"],
      ["通勤する", "commute"],
      ["会社に着く", "arrive at work"],
      ["ストレッチをする", "stretch"],
    ],
  },
  {
    titleJa: "毎日のルーティン（学校・仕事）",
    titleEn: "Daily Routines — School & Work",
    cards: [
      ["仕事に行く", "go to work"],
      ["学校に行く", "go to school"],
      ["授業がある", "have class"],
      ["休憩する", "take a break"],
      ["昼ご飯を食べる", "eat lunch"],
      ["仕事が終わる", "finish work"],
      ["帰宅する", "go home"],
      ["夕食を作る", "cook dinner"],
      ["シャワーを浴びる", "take a shower"],
      ["寝る", "go to bed"],
    ],
  },
  {
    titleJa: "曜日",
    titleEn: "Days of the Week",
    cards: [
      ["月曜日", "Monday"],
      ["火曜日", "Tuesday"],
      ["水曜日", "Wednesday"],
      ["木曜日", "Thursday"],
      ["金曜日", "Friday"],
      ["土曜日", "Saturday"],
      ["日曜日", "Sunday"],
      ["週末", "weekend"],
      ["平日", "weekday"],
      ["今日は金曜日です", "Today is Friday."],
    ],
  },
  {
    titleJa: "今日・明日・過去",
    titleEn: "Time & Days — Today / Tomorrow / Past",
    cards: [
      ["今日", "today"],
      ["明日", "tomorrow"],
      ["昨日", "yesterday"],
      ["今夜", "tonight"],
      ["昨夜", "last night"],
      ["先週", "last week"],
      ["来週", "next week"],
      ["毎日", "every day"],
      ["ときどき", "sometimes"],
      ["もうすぐ", "soon"],
    ],
  },
  {
    titleJa: "時刻の言い方",
    titleEn: "Telling Time",
    cards: [
      ["3時", "three o'clock"],
      ["3時半", "half past three"],
      ["4時15分", "quarter past four"],
      ["ちょうど6時", "six o'clock sharp"],
      ["朝の8時", "eight in the morning"],
      ["正午", "noon"],
      ["真夜中", "midnight"],
      ["約7時", "about seven"],
      ["何時ですか", "What time is it?"],
      ["5時までに", "by five o'clock"],
    ],
  },
  {
    titleJa: "動詞：動き",
    titleEn: "Expanded Verbs — Motion",
    cards: [
      ["走る", "run"],
      ["歩く", "walk"],
      ["泳ぐ", "swim"],
      ["飛ぶ", "fly"],
      ["運転する", "drive"],
      ["急ぐ", "hurry"],
      ["登る", "climb"],
      ["ジャンプする", "jump"],
      ["踊る", "dance"],
      ["止まる", "stop"],
    ],
  },
  {
    titleJa: "動詞：勉強・メディア",
    titleEn: "Expanded Verbs — Study & Media",
    cards: [
      ["勉強する", "study"],
      ["テレビを見る", "watch TV"],
      ["音楽を聞く", "listen to music"],
      ["本を読む", "read a book"],
      ["メモを取る", "take notes"],
      ["検索する", "search online"],
      ["復習する", "review"],
      ["練習する", "practice"],
      ["映画を見る", "watch a movie"],
      ["ニュースを見る", "watch the news"],
    ],
  },
  {
    titleJa: "動詞：買い物",
    titleEn: "Expanded Verbs — Shopping",
    cards: [
      ["買う", "buy"],
      ["売る", "sell"],
      ["払う", "pay"],
      ["返品する", "return (an item)"],
      ["注文する", "order"],
      ["カードで払う", "pay by card"],
      ["お釣り", "change (money)"],
      ["レシート", "receipt"],
      ["セール", "sale"],
      ["値段", "price"],
    ],
  },
  {
    titleJa: "場所：家と学校",
    titleEn: "Objects & Places — Home & School",
    cards: [
      ["家", "home"],
      ["リビング", "living room"],
      ["寝室", "bedroom"],
      ["キッチン", "kitchen"],
      ["教室", "classroom"],
      ["廊下", "hallway"],
      ["屋上", "rooftop"],
      ["校門", "school gate"],
      ["図書室", "school library"],
      ["職員室", "teachers' office"],
    ],
  },
  {
    titleJa: "場所：街・駅・店",
    titleEn: "Objects & Places — Town, Station, Store",
    cards: [
      ["お店", "store"],
      ["駅", "station"],
      ["公園", "park"],
      ["銀行", "bank"],
      ["病院", "hospital"],
      ["郵便局", "post office"],
      ["映画館", "movie theater"],
      ["スーパー", "supermarket"],
      ["カフェ", "cafe"],
      ["交差点", "intersection"],
    ],
  },
  {
    titleJa: "現在形（基本）",
    titleEn: "Present Simple — I / You / We / They",
    cards: [
      ["私は働く", "I work"],
      ["あなたは勉強する", "you study"],
      ["彼らは遊ぶ", "they play"],
      ["私たちは住む", "we live"],
      ["私は泳がない", "I don't swim"],
      ["彼は来ない", "he doesn't come"],
      ["毎日走る", "I run every day."],
      ["よく読む", "I read often."],
      ["手伝う", "I help."],
      ["料理しない", "I don't cook."],
    ],
  },
  {
    titleJa: "現在形（三人称）",
    titleEn: "Present Simple — He / She / It",
    cards: [
      ["彼は働く", "he works"],
      ["彼女は歌う", "she sings"],
      ["犬は吠える", "the dog barks"],
      ["猫は眠る", "the cat sleeps"],
      ["雨が降る", "it rains"],
      ["鐘が鳴る", "the bell rings"],
      ["子どもが泣く", "the baby cries"],
      ["時間がかかる", "it takes time"],
      ["電池が切れる", "the battery dies"],
      ["彼は英語を話さない", "He doesn't speak English."],
    ],
  },
  {
    titleJa: "疑問詞：what / who",
    titleEn: "Wh- Questions — What & Who",
    cards: [
      ["これは何ですか", "What is this?"],
      ["彼は誰ですか", "Who is he?"],
      ["何時ですか", "What time is it?"],
      ["お名前は何ですか", "What's your name?"],
      ["何色ですか", "What color is it?"],
      ["どれがいいですか", "Which one is better?"],
      ["これは誰のカバンですか", "Whose bag is this?"],
      ["何が欲しいですか", "What do you want?"],
      ["誰が知っていますか", "Who knows?"],
      ["何のためにですか", "What for?"],
    ],
  },
  {
    titleJa: "疑問詞：where / when / why",
    titleEn: "Wh- Questions — Where, When, Why",
    cards: [
      ["どこ", "where"],
      ["いつ", "when"],
      ["なぜ", "why"],
      ["どのくらいの頻度で", "how often"],
      ["どれくらい", "how long"],
      ["どうやって", "how"],
      ["いつまで", "by when"],
      ["どちらへ", "which way"],
      ["何時から", "from what time"],
      ["どこから来ましたか", "Where are you from?"],
    ],
  },
  {
    titleJa: "前置詞：in / on / at",
    titleEn: "Basic Prepositions — In, On, At",
    cards: [
      ["箱の中に", "in the box"],
      ["机の上に", "on the desk"],
      ["学校で", "at school"],
      ["3時に", "at three o'clock"],
      ["月曜日に", "on Monday"],
      ["朝", "in the morning"],
      ["夜", "at night"],
      ["家に", "at home"],
      ["バスで", "by bus"],
      ["電車で", "by train"],
    ],
  },
  {
    titleJa: "前置詞：位置・近さ",
    titleEn: "Prepositions — Position & Distance",
    cards: [
      ["下に", "under"],
      ["後ろに", "behind"],
      ["隣に", "next to"],
      ["〜の間に", "between"],
      ["前に", "in front of"],
      ["近くに", "near"],
      ["遠くに", "far (away)"],
      ["向こうに", "across from"],
      ["周りに", "around"],
      ["中へ", "into"],
    ],
  },
  {
    titleJa: "形容詞",
    titleEn: "Adjectives",
    cards: [
      ["大きい", "big"],
      ["小さい", "small"],
      ["高い", "tall"],
      ["速い", "fast"],
      ["遅い", "slow"],
      ["いい", "good"],
      ["悪い", "bad"],
      ["忙しい", "busy"],
      ["簡単な", "easy"],
      ["難しい", "difficult"],
    ],
  },
  {
    titleJa: "好き・欲しい",
    titleEn: "Likes & Wants",
    cards: [
      ["コーヒーが欲しい", "I want coffee."],
      ["音楽が好き", "I like music."],
      ["水が欲しい", "I want water."],
      ["この本が欲しい", "I want this book."],
      ["映画が好き", "I like movies."],
      ["犬が好き", "I like dogs."],
      ["旅行したい", "I want to travel."],
      ["休みたい", "I want to rest."],
      ["会いたい", "I want to see you."],
      ["手伝ってほしい", "I want (some) help."],
    ],
  },
  {
    titleJa: "会話：行き先",
    titleEn: "Simple Conversations — Where You're Going",
    cards: [
      ["どこに行くの？", "Where are you going?"],
      ["家に帰る", "I'm going home."],
      ["学校に行く", "I'm going to school."],
      ["買い物に行く", "I'm going shopping."],
      ["仕事に行く", "I'm going to work."],
      ["友達に会いに行く", "I'm going to meet a friend."],
      ["駅まで歩く", "I'm walking to the station."],
      ["バスに乗る", "I'm taking the bus."],
      ["ちょっと出かける", "I'm going out for a bit."],
      ["今出発する", "I'm leaving now."],
    ],
  },
  {
    titleJa: "会話：短いやりとり",
    titleEn: "Simple Conversations — Short Exchanges",
    cards: [
      ["元気？", "How are you?"],
      ["元気だよ", "I'm fine."],
      ["ありがとう", "Thanks."],
      ["どういたしまして", "You're welcome."],
      ["失礼します", "Excuse me. / Goodbye. (when leaving)"],
      ["久しぶり", "Long time no see."],
      ["そうだね", "That's right. / I agree."],
      ["わからない", "I don't know."],
      ["ちょっと待って", "Wait a moment."],
      ["またね", "See you."],
    ],
  },
];

function build() {
  const decks = DECKS.map((d, di) => ({
    id: `study-b2-deck-${di}`,
    titleJa: d.titleJa,
    titleEn: d.titleEn,
    sortOrder: di,
    cards: d.cards.map(([frontJa, backEn], ci) => ({
      id: `study-b2-d${di}-c${ci}`,
      frontJa,
      backEn,
      sortOrder: ci,
    })),
  }));

  const items = [
    {
      id: "study-b2-a0",
      promptJa: "「明日」は英語で？",
      promptEn: "What is 明日 in English?",
      options: ["today", "tomorrow", "yesterday", "tonight"],
      correctIndex: 1,
    },
    {
      id: "study-b2-a1",
      promptJa: "「He works.」に近い文は？",
      promptEn: "Which English matches “he works” (habit)?",
      options: ["He working.", "He works.", "He work.", "He is work."],
      correctIndex: 1,
    },
    {
      id: "study-b2-a2",
      promptJa: "「Where are you going?」の意味は？",
      promptEn: "Which Japanese matches “Where are you going?”?",
      options: ["どこにいるの？", "どこに行くの？", "いつ行くの？", "なぜ行くの？"],
      correctIndex: 1,
    },
    {
      id: "study-b2-a3",
      promptJa: "「under」に近い前置詞は？",
      promptEn: "Which Japanese pair is closest to “under”?",
      options: ["上に", "下に", "隣に", "前に"],
      correctIndex: 1,
    },
    {
      id: "study-b2-a4",
      promptJa: "「I want coffee.」に近い日本語は？",
      promptEn: "Which Japanese is closest to “I want coffee.”?",
      options: ["コーヒーが好き。", "コーヒーが欲しい。", "コーヒーを飲む。", "コーヒーはいらない。"],
      correctIndex: 1,
    },
    {
      id: "study-b2-a5",
      promptJa: "「月曜日」は英語で？",
      promptEn: "What is 月曜日 in English?",
      options: ["Sunday", "Monday", "Tuesday", "March"],
      correctIndex: 1,
    },
    {
      id: "study-b2-a6",
      promptJa: "「なぜ」は英語で？",
      promptEn: "What is なぜ in English?",
      options: ["where", "when", "why", "what"],
      correctIndex: 2,
    },
    {
      id: "study-b2-a7",
      promptJa: "「busy」の意味に近い形容詞は？",
      promptEn: "Which Japanese adjective is closest to “busy”?",
      options: ["暇な", "忙しい", "遅い", "簡単な"],
      correctIndex: 1,
    },
    {
      id: "study-b2-a8",
      promptJa: "「at three o'clock」に近い表現は？",
      promptEn: "Which Japanese is closest to “at three o'clock”?",
      options: ["3時から", "3時に", "3時まで", "3時半"],
      correctIndex: 1,
    },
    {
      id: "study-b2-a9",
      promptJa: "「I'm going home.」に近い日本語は？",
      promptEn: "Which Japanese is closest to “I'm going home.”?",
      options: ["家にいる。", "家に帰る。", "家を出る。", "家に着いた。"],
      correctIndex: 1,
    },
    {
      id: "study-b2-a10",
      promptJa: "「buy」は日本語で？",
      promptEn: "Which Japanese verb means “buy”?",
      options: ["売る", "買う", "払う", "返す"],
      correctIndex: 1,
    },
  ];

  const doc = {
    version: 1 as const,
    levelCode: StudyLevelCode.BEGINNER_2,
    decks,
    assessment: { passingScore: 68, items },
  };

  return beginner2LevelFileSchema.parse(doc);
}

function main() {
  const validated = build();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  const total = validated.decks.reduce((s, d) => s + d.cards.length, 0);
  console.log(`Wrote ${OUT} (${validated.decks.length} decks, ${total} cards)`);
}

main();
