import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { StudyLevelCode } from "@prisma/client";
import { beginnerLevelFileSchema, studyAssessmentItemsJsonSchema } from "../study/schemas";

function buildBeginnerL1Fixture() {
  const deckTitles = [
    { titleJa: "あいさつと丁寧さ", titleEn: "Greetings & Politeness" },
    { titleJa: "基本の代名詞", titleEn: "Basic Pronouns" },
    { titleJa: "be動詞", titleEn: "To Be (am / is / are)" },
    { titleJa: "数字 1〜20", titleEn: "Numbers 1–20" },
    { titleJa: "身の回りの名詞", titleEn: "Basic Nouns (Everyday Objects)" },
    { titleJa: "基本動詞", titleEn: "Basic Verbs" },
    { titleJa: "簡単な文", titleEn: "Simple Sentences" },
    { titleJa: "Yes / No の質問", titleEn: "Yes / No Questions" },
    { titleJa: "教室の英語", titleEn: "Classroom English" },
    { titleJa: "復習ミックス", titleEn: "Review mix" },
  ] as const;

  const decks = deckTitles.map((t, di) => ({
    id: `study-b1-deck-${di}`,
    titleJa: t.titleJa,
    titleEn: t.titleEn,
    sortOrder: di,
    cards: Array.from({ length: 10 }, (_, ci) => ({
      id: `study-b1-d${di}-c${ci}`,
      frontJa: `例${di + 1}-${ci + 1}`,
      backEn: `Example EN ${di + 1}-${ci + 1}`,
      sortOrder: ci,
    })),
  }));

  const items = Array.from({ length: 10 }, (_, i) => ({
    id: `study-b1-a${i}`,
    promptJa: `質問${i + 1}（日本語）`,
    promptEn: `Question ${i + 1} (English)`,
    options: ["Option A", "Option B", "Option C", "Option D"],
    correctIndex: i % 4,
  }));

  return {
    version: 1 as const,
    levelCode: StudyLevelCode.BEGINNER_1,
    decks,
    assessment: { passingScore: 65, items },
  };
}

describe("beginnerLevelFileSchema", () => {
  it("accepts 10 decks × 10 cards (100 total) + 10 assessment items", () => {
    const parsed = beginnerLevelFileSchema.safeParse(buildBeginnerL1Fixture());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.decks.length).toBe(10);
      expect(parsed.data.decks.reduce((s, d) => s + d.cards.length, 0)).toBe(100);
      expect(parsed.data.assessment.items.length).toBe(10);
    }
  });

  it("parses committed data/study/beginner-1.json when present", () => {
    const fp = path.join(__dirname, "../../../data/study/beginner-1.json");
    if (!fs.existsSync(fp)) {
      return;
    }
    const raw = JSON.parse(fs.readFileSync(fp, "utf8")) as unknown;
    const parsed = beginnerLevelFileSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
  });
});

describe("studyAssessmentItemsJsonSchema", () => {
  it("accepts items wrapper", () => {
    const parsed = studyAssessmentItemsJsonSchema.safeParse({
      items: [
        {
          id: "x",
          promptJa: "p",
          promptEn: "p",
          options: ["a", "b"],
          correctIndex: 0,
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });
});
