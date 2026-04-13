import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { StudyLevelCode } from "@prisma/client";
import {
  beginner2LevelFileSchema,
  beginner3LevelFileSchema,
  beginnerLevelFileSchema,
  intermediate1LevelFileSchema,
  studyAssessmentItemsJsonSchema,
} from "../study/schemas";

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

function buildBeginnerL2Fixture() {
  const decks = Array.from({ length: 15 }, (_, di) => ({
    id: `study-b2-deck-${di}`,
    titleJa: `デッキ${di + 1}`,
    titleEn: `Deck ${di + 1}`,
    sortOrder: di,
    cards: Array.from({ length: 12 }, (_, ci) => ({
      id: `study-b2-d${di}-c${ci}`,
      frontJa: `例B2-${di + 1}-${ci + 1}`,
      backEn: `Example B2 EN ${di + 1}-${ci + 1}`,
      sortOrder: ci,
    })),
  }));

  const items = Array.from({ length: 8 }, (_, i) => ({
    id: `study-b2-a${i}`,
    promptJa: `質問B2-${i + 1}`,
    promptEn: `Question B2-${i + 1}`,
    options: ["A", "B", "C", "D"],
    correctIndex: i % 4,
  }));

  return {
    version: 1 as const,
    levelCode: StudyLevelCode.BEGINNER_2,
    decks,
    assessment: { passingScore: 68, items },
  };
}

function buildBeginnerL3Fixture() {
  const decks = Array.from({ length: 20 }, (_, di) => ({
    id: `study-b3-deck-${di}`,
    titleJa: `デッキB3-${di + 1}`,
    titleEn: `B3 Deck ${di + 1}`,
    sortOrder: di,
    cards: Array.from({ length: 13 }, (_, ci) => ({
      id: `study-b3-d${di}-c${ci}`,
      frontJa: `例B3-${di + 1}-${ci + 1}`,
      backEn: `Example B3 EN ${di + 1}-${ci + 1}`,
      sortOrder: ci,
    })),
  }));

  const items = Array.from({ length: 8 }, (_, i) => ({
    id: `study-b3-a${i}`,
    promptJa: `質問B3-${i + 1}`,
    promptEn: `Question B3-${i + 1}`,
    options: ["A", "B", "C", "D"],
    correctIndex: i % 4,
  }));

  return {
    version: 1 as const,
    levelCode: StudyLevelCode.BEGINNER_3,
    decks,
    assessment: { passingScore: 70, items },
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

describe("beginner2LevelFileSchema", () => {
  it("accepts 15 decks × 12 cards (180 total) + 8 assessment items", () => {
    const parsed = beginner2LevelFileSchema.safeParse(buildBeginnerL2Fixture());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.decks.length).toBe(15);
      expect(parsed.data.decks.reduce((s, d) => s + d.cards.length, 0)).toBe(180);
      expect(parsed.data.assessment.items.length).toBe(8);
    }
  });

  it("parses committed data/study/beginner-2.json when present", () => {
    const fp = path.join(__dirname, "../../../data/study/beginner-2.json");
    if (!fs.existsSync(fp)) {
      return;
    }
    const raw = JSON.parse(fs.readFileSync(fp, "utf8")) as unknown;
    const parsed = beginner2LevelFileSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
  });
});

function buildIntermediate1Fixture() {
  const decks = Array.from({ length: 12 }, (_, di) => ({
    id: `study-i1-deck-${di}`,
    titleJa: `中級デッキ${di + 1}`,
    titleEn: `Int1 deck ${di + 1}`,
    sortOrder: di,
    cards: Array.from({ length: 21 }, (_, ci) => ({
      id: `study-i1-d${di}-c${ci}`,
      frontJa: `Prompt ${di + 1}-${ci + 1}`,
      backEn: `Answer EN ${di + 1}-${ci + 1}`,
      sortOrder: ci,
    })),
  }));

  const items = Array.from({ length: 10 }, (_, i) => ({
    id: `study-i1-a${i}`,
    promptJa: `質問I1-${i + 1}`,
    promptEn: `Question I1-${i + 1}`,
    options: ["A", "B", "C", "D"],
    correctIndex: i % 4,
  }));

  return {
    version: 1 as const,
    levelCode: StudyLevelCode.INTERMEDIATE_1,
    decks,
    assessment: { passingScore: 72, items },
  };
}

describe("intermediate1LevelFileSchema", () => {
  it("accepts 12 decks × 21 cards (252 total) + 10 assessment items", () => {
    const parsed = intermediate1LevelFileSchema.safeParse(buildIntermediate1Fixture());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.decks.length).toBe(12);
      expect(parsed.data.decks.reduce((s, d) => s + d.cards.length, 0)).toBe(252);
      expect(parsed.data.assessment.items.length).toBe(10);
    }
  });

  it("parses committed data/study/intermediate-1.json when present", () => {
    const fp = path.join(__dirname, "../../../data/study/intermediate-1.json");
    if (!fs.existsSync(fp)) {
      return;
    }
    const raw = JSON.parse(fs.readFileSync(fp, "utf8")) as unknown;
    const parsed = intermediate1LevelFileSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
  });
});

describe("beginner3LevelFileSchema", () => {
  it("accepts 20 decks × 13 cards (260 total) + 8 assessment items", () => {
    const parsed = beginner3LevelFileSchema.safeParse(buildBeginnerL3Fixture());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.decks.length).toBe(20);
      expect(parsed.data.decks.reduce((s, d) => s + d.cards.length, 0)).toBe(260);
      expect(parsed.data.assessment.items.length).toBe(8);
    }
  });

  it("parses committed data/study/beginner-3.json when present", () => {
    const fp = path.join(__dirname, "../../../data/study/beginner-3.json");
    if (!fs.existsSync(fp)) {
      return;
    }
    const raw = JSON.parse(fs.readFileSync(fp, "utf8")) as unknown;
    const parsed = beginner3LevelFileSchema.safeParse(raw);
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
