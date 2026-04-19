/**
 * Build data/study/beginner-1.json from curated Beginner L1 vocabulary (no API).
 * This is the supported source of truth for the Beginner 1 bank; run after edits, then `yarn db:seed`.
 * Beginner 1 uses Japanese-dominant `frontJa` per `src/lib/study/prompt-locale-policy.ts`.
 *
 *   yarn study:build-beginner1-json   (repo root or apps/web)
 */
import fs from "node:fs";
import path from "node:path";
import { StudyLevelCode } from "../src/generated/prisma/client";
import { beginnerLevelFileSchema } from "../src/lib/study/schemas";

const OUT = path.join(__dirname, "../data/study/beginner-1.json");

type Pair = [string, string];

const DECKS: { titleJa: string; titleEn: string; cards: Pair[] }[] = [
  {
    titleJa: "挨拶と丁寧さ",
    titleEn: "Greetings & Politeness",
    cards: [
      ["こんにちは", "Hello / Good afternoon"],
      ["おはよう", "Good morning"],
      ["こんばんは", "Good evening"],
      ["ありがとう", "Thank you"],
      ["ありがとうございます", "Thank you very much"],
      ["すみません", "Excuse me / I'm sorry"],
      ["ごめんなさい", "I'm sorry"],
      ["どういたしまして", "You're welcome"],
      ["お願いします", "Please"],
      ["初めまして", "Nice to meet you"],
      ["さようなら", "Goodbye"],
      ["おやすみなさい", "Good night"],
      ["助けてください", "Please help me."],
    ],
  },
  {
    titleJa: "基本の代名詞",
    titleEn: "Basic Pronouns",
    cards: [
      ["私", "I / me"],
      ["あなた", "you"],
      ["彼", "he / him"],
      ["彼女", "she / her"],
      ["私たち", "we / us"],
      ["彼ら", "they / them (people)"],
      ["これ", "this (thing near me)"],
      ["それ", "that (thing near you)"],
      ["あれ", "that (thing over there)"],
      ["誰", "who"],
      ["何", "what"],
      ["どこ", "where"],
    ],
  },
  {
    titleJa: "be動詞（am / is / are）",
    titleEn: "To Be (am / is / are)",
    cards: [
      ["私は学生です", "I am a student."],
      ["彼女は幸せです", "She is happy."],
      ["彼は先生です", "He is a teacher."],
      ["これは本です", "This is a book."],
      ["私たちは友達です", "We are friends."],
      ["それはペンです", "That is a pen."],
      ["あなたは元気ですか", "Are you okay?"],
      ["私は日本人です", "I am Japanese."],
      ["彼は忙しいです", "He is busy."],
      ["ここは学校です", "This is a school."],
      ["時間です", "It is time."],
      ["今日は暑いです", "It is hot today."],
    ],
  },
  {
    titleJa: "数字 1〜10",
    titleEn: "Numbers 1–10",
    cards: [
      ["一", "one"],
      ["二", "two"],
      ["三", "three"],
      ["四", "four"],
      ["五", "five"],
      ["六", "six"],
      ["七", "seven"],
      ["八", "eight"],
      ["九", "nine"],
      ["十", "ten"],
    ],
  },
  {
    titleJa: "数字 11〜20",
    titleEn: "Numbers 11–20",
    cards: [
      ["十一", "eleven"],
      ["十二", "twelve"],
      ["十三", "thirteen"],
      ["十四", "fourteen"],
      ["十五", "fifteen"],
      ["十六", "sixteen"],
      ["十七", "seventeen"],
      ["十八", "eighteen"],
      ["十九", "nineteen"],
      ["二十", "twenty"],
    ],
  },
  {
    titleJa: "身の回りの名詞",
    titleEn: "Basic Nouns (Everyday Objects)",
    cards: [
      ["本", "book"],
      ["ペン", "pen"],
      ["スマホ", "smartphone"],
      ["水", "water"],
      ["カバン", "bag"],
      ["机", "desk"],
      ["椅子", "chair"],
      ["鍵", "key"],
      ["電話", "phone"],
      ["パソコン", "computer"],
      ["時計", "clock"],
      ["傘", "umbrella"],
    ],
  },
  {
    titleJa: "基本動詞",
    titleEn: "Basic Verbs",
    cards: [
      ["食べる", "eat"],
      ["飲む", "drink"],
      ["行く", "go"],
      ["見る", "see / look / watch"],
      ["好き", "like"],
      ["読む", "read"],
      ["書く", "write"],
      ["聞く", "listen / hear"],
      ["話す", "speak / talk"],
      ["待つ", "wait"],
      ["買う", "buy"],
      ["する", "do"],
    ],
  },
  {
    titleJa: "簡単な文",
    titleEn: "Simple Sentences",
    cards: [
      ["私はご飯を食べます", "I eat rice."],
      ["私は犬が好きです", "I like dogs."],
      ["彼はコーヒーを飲みます", "He drinks coffee."],
      ["私たちは学校に行きます", "We go to school."],
      ["彼女は映画を見ます", "She watches a movie."],
      ["私は日本語を勉強します", "I study Japanese."],
      ["彼はサッカーが好きです", "He likes soccer."],
      ["私はパンを食べます", "I eat bread."],
      ["彼女はお茶を飲みます", "She drinks tea."],
      ["私は海が好きです", "I like the sea."],
      ["彼らは友達です", "They are friends."],
      ["私は仕事に行きます", "I go to work."],
    ],
  },
  {
    titleJa: "Yes / No の質問",
    titleEn: "Yes / No Questions",
    cards: [
      ["あなたは幸せですか", "Are you happy?"],
      ["寿司が好きですか", "Do you like sushi?"],
      ["日本語を勉強していますか", "Do you study Japanese?"],
      ["コーヒーを飲みますか", "Do you drink coffee?"],
      ["学校に行きますか", "Do you go to school?"],
      ["ペンがありますか", "Do you have a pen?"],
      ["忙しいですか", "Are you busy?"],
      ["明日は暇ですか", "Are you free tomorrow?"],
      ["英語は話せますか", "Can you speak English?"],
      ["これはあなたのですか", "Is this yours?"],
      ["彼は先生ですか", "Is he a teacher?"],
      ["一緒に行きますか", "Will you go together?"],
      ["はい", "yes"],
      ["いいえ", "no"],
    ],
  },
  {
    titleJa: "教室の英語",
    titleEn: "Classroom English",
    cards: [
      ["リピートしてください", "Please repeat."],
      ["聞いてください", "Please listen."],
      ["書いてください", "Please write."],
      ["読んでください", "Please read."],
      ["見てください", "Please look."],
      ["次のページを開いてください", "Please open your book to the next page."],
      ["質問がありますか", "Do you have a question?"],
      ["分かりますか", "Do you understand?"],
      ["もう一度お願いします", "One more time, please."],
      ["ゆっくり話してください", "Please speak slowly."],
      ["英語でいいですか", "Is English okay?"],
      ["静かにしてください", "Please be quiet."],
      ["分かりました", "I understand."],
      ["分かりません", "I don't understand."],
    ],
  },
];

function build() {
  const decks = DECKS.map((d, di) => ({
    id: `study-b1-deck-${di}`,
    titleJa: d.titleJa,
    titleEn: d.titleEn,
    sortOrder: di,
    cards: d.cards.map(([frontJa, backEn], ci) => ({
      id: `study-b1-d${di}-c${ci}`,
      frontJa,
      backEn,
      sortOrder: ci,
    })),
  }));

  const items = [
    {
      id: "study-b1-a0",
      promptJa: "「こんにちは」に近い英語は？",
      promptEn: "Which English is closest to a general daytime “hello”?",
      options: ["Good night", "Hello", "Goodbye", "Please"],
      correctIndex: 1,
    },
    {
      id: "study-b1-a1",
      promptJa: "「私」の英語は？",
      promptEn: "Which English means “I / me”?",
      options: ["you", "I / me", "they", "we"],
      correctIndex: 1,
    },
    {
      id: "study-b1-a2",
      promptJa: "「食べる」は英語で？",
      promptEn: "What is 食べる in English?",
      options: ["drink", "eat", "go", "see"],
      correctIndex: 1,
    },
    {
      id: "study-b1-a3",
      promptJa: "「水」は英語で？",
      promptEn: "What is 水 in English?",
      options: ["food", "water", "book", "phone"],
      correctIndex: 1,
    },
    {
      id: "study-b1-a4",
      promptJa: "「十三」は英語で？",
      promptEn: "What is 十三 in English?",
      options: ["twelve", "thirteen", "fourteen", "thirty"],
      correctIndex: 1,
    },
    {
      id: "study-b1-a5",
      promptJa: "「寿司が好きですか」の意味に近い英語は？",
      promptEn: "Which question matches “Do you like sushi?”",
      options: ["Do you like sushi?", "Do you eat sushi?", "Is this sushi?", "I like sushi."],
      correctIndex: 0,
    },
    {
      id: "study-b1-a6",
      promptJa: "「聞いてください」の意味は？",
      promptEn: "What does 聞いてください mean?",
      options: ["Please write.", "Please listen.", "Please read.", "Please repeat."],
      correctIndex: 1,
    },
    {
      id: "study-b1-a7",
      promptJa: "「彼は先生です」の意味は？",
      promptEn: "Which sentence matches “He is a teacher”?",
      options: ["She is a teacher.", "He is a teacher.", "I am a teacher.", "They are teachers."],
      correctIndex: 1,
    },
    {
      id: "study-b1-a8",
      promptJa: "「いいえ」は英語で？",
      promptEn: "What is いいえ in English?",
      options: ["yes", "no", "maybe", "please"],
      correctIndex: 1,
    },
    {
      id: "study-b1-a9",
      promptJa: "「私はご飯を食べます」の意味は？",
      promptEn: "Which English matches this Japanese?",
      options: ["I drink rice.", "I eat rice.", "I like rice.", "I buy rice."],
      correctIndex: 1,
    },
    {
      id: "study-b1-a10",
      promptJa: "「二十」は英語で？",
      promptEn: "What is 二十 in English?",
      options: ["twelve", "twenty", "two", "two hundred"],
      correctIndex: 1,
    },
  ];

  const doc = {
    version: 1 as const,
    levelCode: StudyLevelCode.BEGINNER_1,
    decks,
    assessment: { passingScore: 65, items },
  };

  return beginnerLevelFileSchema.parse(doc);
}

function main() {
  const validated = build();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  const total = validated.decks.reduce((s, d) => s + d.cards.length, 0);
  console.log(`Wrote ${OUT} (${validated.decks.length} decks, ${total} cards)`);
}

main();
