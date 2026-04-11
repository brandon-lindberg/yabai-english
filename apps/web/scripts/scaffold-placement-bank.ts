/**
 * Writes data/placement-bank/{A1|…|C1}.json — five files, one per CEFR level, each with 400 questions
 * (100 × grammar, vocabulary, reading, functional). Use --force to replace an existing bank.
 */
import fs from "node:fs";
import path from "node:path";
import type { PlacementBankFile } from "../src/lib/placement-bank/schema";
import {
  PLACEMENT_BANK_BANDS,
  PLACEMENT_BANK_SECTIONS,
  PLACEMENT_QUESTIONS_PER_BAND_SECTION,
} from "../src/lib/placement-bank/constants";
import { generateDefaultPlacementQuestion } from "../src/lib/placement-bank/generate-default-question";
import { splitLegacyPromptsToPresentation } from "../src/lib/placement-bank/presentation-fields";

/** Run from apps/web: `yarn placement-bank:scaffold` */
const WEB_ROOT = process.cwd();
const DATA_ROOT = path.join(WEB_ROOT, "data", "placement-bank");

type CuratedLegacyRow = Omit<
  PlacementBankFile,
  "instructionEn" | "instructionJa" | "questionEn" | "questionJa"
> & {
  promptEn: string;
  promptJa: string;
};

const CURATED_LEGACY: Record<string, CuratedLegacyRow> = {
  "A1/grammar/001": {
    id: "pb-A1-grammar-001",
    weight: 1,
    section: "grammar",
    cefrBand: "A1",
    promptJa: "空所に入る語を選んでください: \"She ___ from Japan.\"",
    promptEn: 'Choose the best option: "She ___ from Japan."',
    optionsJa: ["is", "are", "am"],
    optionsEn: ["is", "are", "am"],
    correctIndex: 0,
  },
  "A1/grammar/002": {
    id: "pb-A1-grammar-002",
    weight: 1,
    section: "grammar",
    cefrBand: "A1",
    promptJa: "正しい文を選んでください。",
    promptEn: "Choose the correct sentence.",
    optionsJa: ["He don't like coffee.", "He doesn't like coffee.", "He doesn't likes coffee."],
    optionsEn: ["He don't like coffee.", "He doesn't like coffee.", "He doesn't likes coffee."],
    correctIndex: 1,
  },
  "A1/vocabulary/001": {
    id: "pb-A1-vocabulary-001",
    weight: 1,
    section: "vocabulary",
    cefrBand: "A1",
    promptJa: "「安い」に最も近い語を選んでください。",
    promptEn: 'Choose the word closest to "inexpensive."',
    optionsJa: ["cheap", "large", "quiet"],
    optionsEn: ["cheap", "large", "quiet"],
    correctIndex: 0,
  },
  "A1/functional/001": {
    id: "pb-A1-functional-001",
    weight: 1,
    section: "functional",
    cefrBand: "A1",
    promptJa: "店員に丁寧に値段を聞く最も自然な表現は？",
    promptEn: "Which is the most polite way to ask the price?",
    optionsJa: ["How much is this?", "Price?", "Tell me price now."],
    optionsEn: ["How much is this?", "Price?", "Tell me price now."],
    correctIndex: 0,
  },
  "A2/grammar/001": {
    id: "pb-A2-grammar-001",
    weight: 2,
    section: "grammar",
    cefrBand: "A2",
    promptJa: "空所に入る語を選んでください: \"I ___ my homework before dinner yesterday.\"",
    promptEn: 'Choose the best option: "I ___ my homework before dinner yesterday."',
    optionsJa: ["finish", "finished", "have finished"],
    optionsEn: ["finish", "finished", "have finished"],
    correctIndex: 1,
  },
  "A2/grammar/002": {
    id: "pb-A2-grammar-002",
    weight: 2,
    section: "grammar",
    cefrBand: "A2",
    promptJa: "空所に入る語を選んでください: \"There aren't ___ apples left.\"",
    promptEn: 'Choose the best option: "There aren\'t ___ apples left."',
    optionsJa: ["some", "any", "much"],
    optionsEn: ["some", "any", "much"],
    correctIndex: 1,
  },
  "A2/vocabulary/001": {
    id: "pb-A2-vocabulary-001",
    weight: 2,
    section: "vocabulary",
    cefrBand: "A2",
    promptJa: "空所に入る語を選んでください: \"Could you ___ me a favor?\"",
    promptEn: 'Choose the best option: "Could you ___ me a favor?"',
    optionsJa: ["do", "make", "take"],
    optionsEn: ["do", "make", "take"],
    correctIndex: 0,
  },
  "A2/vocabulary/002": {
    id: "pb-A2-vocabulary-002",
    weight: 2,
    section: "vocabulary",
    cefrBand: "A2",
    promptJa: "「予約する」の意味に最も近い語句を選んでください。",
    promptEn: 'Choose the phrase closest to "reserve."',
    optionsJa: ["book in advance", "look around", "turn down"],
    optionsEn: ["book in advance", "look around", "turn down"],
    correctIndex: 0,
  },
  "A2/reading/001": {
    id: "pb-A2-reading-001",
    weight: 2,
    section: "reading",
    cefrBand: "A2",
    promptJa:
      "文を読んで答えてください: \"The museum opens at 9:00 and closes at 17:00. Last entry is at 16:30.\" 最終入場は？",
    promptEn:
      'Read and answer: "The museum opens at 9:00 and closes at 17:00. Last entry is at 16:30." What is the last entry time?',
    optionsJa: ["16:00", "16:30", "17:00"],
    optionsEn: ["16:00", "16:30", "17:00"],
    correctIndex: 1,
  },
  "A2/reading/002": {
    id: "pb-A2-reading-002",
    weight: 2,
    section: "reading",
    cefrBand: "A2",
    promptJa:
      "文を読んで答えてください: \"Please submit your report by Friday noon.\" いつまでに提出する必要がありますか？",
    promptEn: 'Read and answer: "Please submit your report by Friday noon." When is the deadline?',
    optionsJa: ["金曜の正午まで", "金曜の夜まで", "土曜の朝まで"],
    optionsEn: ["By Friday noon", "By Friday night", "By Saturday morning"],
    correctIndex: 0,
  },
  "A2/functional/001": {
    id: "pb-A2-functional-001",
    weight: 2,
    section: "functional",
    cefrBand: "A2",
    promptJa: "上司との定例1on1に5分遅れる連絡として最も適切なのは？",
    promptEn:
      "Which message is most appropriate if you will be 5 minutes late for your manager's weekly one-on-one?",
    optionsJa: [
      "I'm stuck in traffic. I'll be there in about five minutes. Sorry.",
      "Meeting late me.",
      "You start. I maybe come.",
    ],
    optionsEn: [
      "I'm stuck in traffic. I'll be there in about five minutes. Sorry.",
      "Meeting late me.",
      "You start. I maybe come.",
    ],
    correctIndex: 0,
  },
  "B1/grammar/001": {
    id: "pb-B1-grammar-001",
    weight: 3,
    section: "grammar",
    cefrBand: "B1",
    promptJa: "空所に入る最も自然な語を選んでください: \"If it ___ tomorrow, we'll cancel the picnic.\"",
    promptEn: 'Choose the best option: "If it ___ tomorrow, we\'ll cancel the picnic."',
    optionsJa: ["rains", "will rain", "would rain"],
    optionsEn: ["rains", "will rain", "would rain"],
    correctIndex: 0,
  },
  "B1/grammar/002": {
    id: "pb-B1-grammar-002",
    weight: 3,
    section: "grammar",
    cefrBand: "B1",
    promptJa: "空所に入る語を選んでください: \"By the time we arrived, the movie ___.\"",
    promptEn: 'Choose the best option: "By the time we arrived, the movie ___."',
    optionsJa: ["started", "had started", "has started"],
    optionsEn: ["started", "had started", "has started"],
    correctIndex: 1,
  },
  "B1/vocabulary/001": {
    id: "pb-B1-vocabulary-001",
    weight: 3,
    section: "vocabulary",
    cefrBand: "B1",
    promptJa: "空所に入る語を選んでください: \"The new policy will ___ everyone in the company.\"",
    promptEn: 'Choose the best option: "The new policy will ___ everyone in the company."',
    optionsJa: ["affect", "effect", "infect"],
    optionsEn: ["affect", "effect", "infect"],
    correctIndex: 0,
  },
  "B1/vocabulary/002": {
    id: "pb-B1-vocabulary-002",
    weight: 3,
    section: "vocabulary",
    cefrBand: "B1",
    promptJa: "最も自然なコロケーションを選んでください。",
    promptEn: "Choose the most natural collocation.",
    optionsJa: ["make progress", "do progress", "take progress"],
    optionsEn: ["make progress", "do progress", "take progress"],
    correctIndex: 0,
  },
  "B1/reading/001": {
    id: "pb-B1-reading-001",
    weight: 3,
    section: "reading",
    cefrBand: "B1",
    promptJa:
      "文章: \"Although the weather forecast predicted rain, the event organizers decided to proceed, citing improved drainage systems.\" 主催者が開催した主な理由は？",
    promptEn:
      'Text: "Although the weather forecast predicted rain, the event organizers decided to proceed, citing improved drainage systems." Why did they proceed?',
    optionsJa: ["雨予報が外れたから", "排水設備が改善されていたから", "参加者が少なかったから"],
    optionsEn: [
      "Because the forecast was wrong",
      "Because drainage systems had improved",
      "Because attendance was low",
    ],
    correctIndex: 1,
  },
  "B1/reading/002": {
    id: "pb-B1-reading-002",
    weight: 3,
    section: "reading",
    cefrBand: "B1",
    promptJa:
      "文章: \"Sales increased by 12%, largely due to repeat customers rather than new acquisitions.\" 何が増加の主因でしたか？",
    promptEn:
      'Text: "Sales increased by 12%, largely due to repeat customers rather than new acquisitions." What mainly drove the increase?',
    optionsJa: ["新規顧客", "既存顧客の再購入", "広告費の削減"],
    optionsEn: ["New customers", "Repeat customers", "Reduced advertising costs"],
    correctIndex: 1,
  },
  "B1/functional/001": {
    id: "pb-B1-functional-001",
    weight: 3,
    section: "functional",
    cefrBand: "B1",
    promptJa: "丁寧に意見に反対する最も適切な表現は？",
    promptEn: "Which is the most appropriate way to disagree politely?",
    optionsJa: ["You're wrong.", "I see your point, but I have a different view.", "No, absolutely not."],
    optionsEn: ["You're wrong.", "I see your point, but I have a different view.", "No, absolutely not."],
    correctIndex: 1,
  },
  "B1/functional/002": {
    id: "pb-B1-functional-002",
    weight: 3,
    section: "functional",
    cefrBand: "B1",
    promptJa: "上司への依頼メールの締めとして最も適切なのは？",
    promptEn: "Which closing is most suitable in a request email to your manager?",
    optionsJa: [
      "Let me know if this works for you. Thank you.",
      "Reply soon.",
      "Do it quickly.",
    ],
    optionsEn: [
      "Let me know if this works for you. Thank you.",
      "Reply soon.",
      "Do it quickly.",
    ],
    correctIndex: 0,
  },
  "B2/grammar/001": {
    id: "pb-B2-grammar-001",
    weight: 4,
    section: "grammar",
    cefrBand: "B2",
    promptJa: "空所に入る語を選んでください: \"Hardly ___ the meeting started when the fire alarm went off.\"",
    promptEn: 'Choose the best option: "Hardly ___ the meeting started when the fire alarm went off."',
    optionsJa: ["had", "did", "was"],
    optionsEn: ["had", "did", "was"],
    correctIndex: 0,
  },
  "B2/vocabulary/001": {
    id: "pb-B2-vocabulary-001",
    weight: 4,
    section: "vocabulary",
    cefrBand: "B2",
    promptJa:
      "「The proposal was rejected due to budget constraints.」で constraints に最も近い意味は？",
    promptEn: 'In "The proposal was rejected due to budget constraints," what does constraints mean?',
    optionsJa: ["limitations", "benefits", "bonuses"],
    optionsEn: ["limitations", "benefits", "bonuses"],
    correctIndex: 0,
  },
  "B2/reading/001": {
    id: "pb-B2-reading-001",
    weight: 4,
    section: "reading",
    cefrBand: "B2",
    promptJa:
      "文章: \"The committee's recommendation, while not legally binding, carries substantial influence over municipal funding decisions.\" recommendation の性質として正しいのは？",
    promptEn:
      'Text: "The committee\'s recommendation, while not legally binding, carries substantial influence over municipal funding decisions." Which is true?',
    optionsJa: [
      "法的拘束力があり必ず従う必要がある",
      "法的拘束力はないが、実務上の影響は大きい",
      "資金配分には全く影響しない",
    ],
    optionsEn: [
      "It is legally binding",
      "It is not binding but highly influential",
      "It has no effect on funding decisions",
    ],
    correctIndex: 1,
  },
  "B2/functional/001": {
    id: "pb-B2-functional-001",
    weight: 4,
    section: "functional",
    cefrBand: "B2",
    promptJa: "交渉で譲歩しつつ条件提示する最も適切な文は？",
    promptEn: "Which sentence best shows concession plus condition in negotiation?",
    optionsJa: [
      "We can reduce the fee, provided the contract term is extended.",
      "We reduce fee. You choose.",
      "No discount unless maybe later.",
    ],
    optionsEn: [
      "We can reduce the fee, provided the contract term is extended.",
      "We reduce fee. You choose.",
      "No discount unless maybe later.",
    ],
    correctIndex: 0,
  },
  "C1/grammar/001": {
    id: "pb-C1-grammar-001",
    weight: 5,
    section: "grammar",
    cefrBand: "C1",
    promptJa: "最も自然な文を選んでください。",
    promptEn: "Choose the most natural sentence.",
    optionsJa: [
      "Not only the manager apologized, but also offered a refund.",
      "Not only did the manager apologize, but he also offered a refund.",
      "Not only the manager did apologize, but he offered also a refund.",
    ],
    optionsEn: [
      "Not only the manager apologized, but also offered a refund.",
      "Not only did the manager apologize, but he also offered a refund.",
      "Not only the manager did apologize, but he offered also a refund.",
    ],
    correctIndex: 1,
  },
  "C1/vocabulary/001": {
    id: "pb-C1-vocabulary-001",
    weight: 5,
    section: "vocabulary",
    cefrBand: "C1",
    promptJa:
      "最も適切な語を選んでください: \"The CEO's statement was deliberately ___ to avoid legal risk.\"",
    promptEn: 'Choose the best option: "The CEO\'s statement was deliberately ___ to avoid legal risk."',
    optionsJa: ["unequivocal", "ambiguous", "redundant"],
    optionsEn: ["unequivocal", "ambiguous", "redundant"],
    correctIndex: 1,
  },
  "C1/reading/001": {
    id: "pb-C1-reading-001",
    weight: 5,
    section: "reading",
    cefrBand: "C1",
    promptJa:
      "文章: \"While the initiative was praised publicly, internal reports suggested implementation had been uneven across regions.\" どの推論が妥当ですか？",
    promptEn:
      'Text: "While the initiative was praised publicly, internal reports suggested implementation had been uneven across regions." Which inference is best?',
    optionsJa: [
      "実施は全地域で同程度に成功した",
      "公的評価と内部評価にギャップがある",
      "この施策はすでに終了している",
    ],
    optionsEn: [
      "Implementation succeeded equally in all regions",
      "There is a gap between public praise and internal findings",
      "The initiative has already ended",
    ],
    correctIndex: 1,
  },
  "C1/functional/001": {
    id: "pb-C1-functional-001",
    weight: 5,
    section: "functional",
    cefrBand: "C1",
    promptJa:
      "次の苦情（直近の請求書の誤請求）に対する返信として最も適切な文を選んでください。",
    promptEn:
      "Choose the most appropriate response to a customer complaint about a billing error on the last invoice.",
    optionsJa: [
      "That's not our fault.",
      "I understand your frustration. Let me look into this immediately and update you by 3 p.m.",
      "Please calm down first.",
    ],
    optionsEn: [
      "That's not our fault.",
      "I understand your frustration. Let me look into this immediately and update you by 3 p.m.",
      "Please calm down first.",
    ],
    correctIndex: 1,
  },
};

function curatedToBankFile(row: CuratedLegacyRow): PlacementBankFile {
  const { promptEn, promptJa, ...rest } = row;
  return { ...rest, ...splitLegacyPromptsToPresentation(rest.section, promptEn, promptJa) };
}

const CURATED: Record<string, PlacementBankFile> = Object.fromEntries(
  Object.entries(CURATED_LEGACY).map(([k, v]) => [k, curatedToBankFile(v)]),
);

function main() {
  const force = process.argv.includes("--force");
  if (!force && fs.existsSync(DATA_ROOT)) {
    console.error(`Refusing to overwrite ${DATA_ROOT} without --force`);
    process.exit(1);
  }
  if (force && fs.existsSync(DATA_ROOT)) {
    fs.rmSync(DATA_ROOT, { recursive: true });
  }
  fs.mkdirSync(DATA_ROOT, { recursive: true });

  let files = 0;
  for (const band of PLACEMENT_BANK_BANDS) {
    const questions: PlacementBankFile[] = [];
    for (const section of PLACEMENT_BANK_SECTIONS) {
      for (let i = 1; i <= PLACEMENT_QUESTIONS_PER_BAND_SECTION; i++) {
        const key = `${band}/${section}/${String(i).padStart(3, "0")}`;
        const curated = CURATED[key];
        questions.push(curated ?? generateDefaultPlacementQuestion(band, section, i));
      }
    }
    const levelPath = path.join(DATA_ROOT, `${band}.json`);
    fs.writeFileSync(
      levelPath,
      `${JSON.stringify({ cefrBand: band, questions }, null, 2)}\n`,
      "utf8",
    );
    files += 1;
  }
  console.log(`Wrote ${files} placement level files under ${DATA_ROOT}`);
}

main();
