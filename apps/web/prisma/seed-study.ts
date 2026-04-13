import fs from "node:fs";
import path from "node:path";
import { Prisma, type PrismaClient, StudyLevelCode } from "@prisma/client";
import {
  beginner2LevelFileSchema,
  beginner3LevelFileSchema,
  beginnerLevelFileSchema,
  intermediate1LevelFileSchema,
  type StudyAssessmentItem,
} from "../src/lib/study/schemas";

const TRACK_SLUG = "english-flashcards";
const TRACK_ID = "seed-study-track-english-flashcards";

const LEVEL_META: {
  code: StudyLevelCode;
  sortOrder: number;
  titleJa: string;
  titleEn: string;
}[] = [
  { code: StudyLevelCode.BEGINNER_1, sortOrder: 0, titleJa: "初級 1", titleEn: "Beginner 1" },
  { code: StudyLevelCode.BEGINNER_2, sortOrder: 1, titleJa: "初級 2", titleEn: "Beginner 2" },
  { code: StudyLevelCode.BEGINNER_3, sortOrder: 2, titleJa: "初級 3", titleEn: "Beginner 3" },
  {
    code: StudyLevelCode.INTERMEDIATE_1,
    sortOrder: 3,
    titleJa: "中級 1",
    titleEn: "Intermediate 1",
  },
  {
    code: StudyLevelCode.INTERMEDIATE_2,
    sortOrder: 4,
    titleJa: "中級 2",
    titleEn: "Intermediate 2",
  },
  {
    code: StudyLevelCode.INTERMEDIATE_3,
    sortOrder: 5,
    titleJa: "中級 3",
    titleEn: "Intermediate 3",
  },
  { code: StudyLevelCode.ADVANCED_1, sortOrder: 6, titleJa: "上級 1", titleEn: "Advanced 1" },
  { code: StudyLevelCode.ADVANCED_2, sortOrder: 7, titleJa: "上級 2", titleEn: "Advanced 2" },
  { code: StudyLevelCode.ADVANCED_3, sortOrder: 8, titleJa: "上級 3", titleEn: "Advanced 3" },
];

type SeededStudyBank = {
  decks: Array<{
    id: string;
    titleJa: string;
    titleEn: string;
    sortOrder: number;
    cards: Array<{
      id: string;
      frontJa: string;
      backEn: string;
      sortOrder: number;
      exercise?: unknown;
    }>;
  }>;
  assessment: { passingScore: number; items: StudyAssessmentItem[] };
};

/** New level banks: taper Japanese on `frontJa` / assessment stems — `src/lib/study/prompt-locale-policy.ts`. */
function readBeginner1Json() {
  const fp = path.join(__dirname, "../data/study/beginner-1.json");
  const raw = fs.readFileSync(fp, "utf8");
  const json = JSON.parse(raw) as unknown;
  return beginnerLevelFileSchema.parse(json);
}

function readBeginner2Json() {
  const fp = path.join(__dirname, "../data/study/beginner-2.json");
  const raw = fs.readFileSync(fp, "utf8");
  const json = JSON.parse(raw) as unknown;
  return beginner2LevelFileSchema.parse(json);
}

function readBeginner3Json() {
  const fp = path.join(__dirname, "../data/study/beginner-3.json");
  const raw = fs.readFileSync(fp, "utf8");
  const json = JSON.parse(raw) as unknown;
  return beginner3LevelFileSchema.parse(json);
}

function readIntermediate1Json() {
  const fp = path.join(__dirname, "../data/study/intermediate-1.json");
  const raw = fs.readFileSync(fp, "utf8");
  const json = JSON.parse(raw) as unknown;
  return intermediate1LevelFileSchema.parse(json);
}

async function seedStudyLevelBank(
  prisma: PrismaClient,
  levelId: string,
  data: SeededStudyBank,
  assessmentStableId: string,
) {
  for (const deck of data.decks) {
    await prisma.studyDeck.upsert({
      where: { id: deck.id },
      update: {
        levelId,
        titleJa: deck.titleJa,
        titleEn: deck.titleEn,
        sortOrder: deck.sortOrder,
        visibility: "SYSTEM",
        ownerUserId: null,
      },
      create: {
        id: deck.id,
        levelId,
        titleJa: deck.titleJa,
        titleEn: deck.titleEn,
        sortOrder: deck.sortOrder,
        visibility: "SYSTEM",
      },
    });

    for (const card of deck.cards) {
      const exerciseJson =
        card.exercise != null ? (card.exercise as Prisma.InputJsonValue) : Prisma.DbNull;
      await prisma.studyCard.upsert({
        where: { id: card.id },
        update: {
          deckId: deck.id,
          frontJa: card.frontJa,
          backEn: card.backEn,
          sortOrder: card.sortOrder,
          exerciseJson,
        },
        create: {
          id: card.id,
          deckId: deck.id,
          frontJa: card.frontJa,
          backEn: card.backEn,
          sortOrder: card.sortOrder,
          exerciseJson,
        },
      });
    }
  }

  await prisma.studyAssessment.upsert({
    where: { id: assessmentStableId },
    update: {
      levelId,
      kind: "LEVEL_EXIT",
      itemsJson: { items: data.assessment.items },
      passingScore: data.assessment.passingScore,
      sortOrder: 0,
    },
    create: {
      id: assessmentStableId,
      levelId,
      kind: "LEVEL_EXIT",
      itemsJson: { items: data.assessment.items },
      passingScore: data.assessment.passingScore,
      sortOrder: 0,
    },
  });
}

export async function seedStudyTrack(prisma: PrismaClient) {
  await prisma.studyTrack.upsert({
    where: { slug: TRACK_SLUG },
    update: {
      titleJa: "英語フラッシュカード",
      titleEn: "English flashcards",
      sortOrder: 0,
    },
    create: {
      id: TRACK_ID,
      slug: TRACK_SLUG,
      titleJa: "英語フラッシュカード",
      titleEn: "English flashcards",
      sortOrder: 0,
    },
  });

  const track = await prisma.studyTrack.findUniqueOrThrow({
    where: { slug: TRACK_SLUG },
  });

  const levelIdByCode = new Map<StudyLevelCode, string>();

  for (const meta of LEVEL_META) {
    const stableId = `seed-study-level-${meta.code}`;
    const level = await prisma.studyLevel.upsert({
      where: { trackId_levelCode: { trackId: track.id, levelCode: meta.code } },
      update: {
        titleJa: meta.titleJa,
        titleEn: meta.titleEn,
        sortOrder: meta.sortOrder,
      },
      create: {
        id: stableId,
        trackId: track.id,
        levelCode: meta.code,
        titleJa: meta.titleJa,
        titleEn: meta.titleEn,
        sortOrder: meta.sortOrder,
      },
    });
    levelIdByCode.set(meta.code, level.id);
  }

  const b1LevelId = levelIdByCode.get(StudyLevelCode.BEGINNER_1)!;
  await seedStudyLevelBank(prisma, b1LevelId, readBeginner1Json(), "study-b1-assessment-exit");

  const b2LevelId = levelIdByCode.get(StudyLevelCode.BEGINNER_2)!;
  await seedStudyLevelBank(prisma, b2LevelId, readBeginner2Json(), "study-b2-assessment-exit");

  const b3LevelId = levelIdByCode.get(StudyLevelCode.BEGINNER_3)!;
  await seedStudyLevelBank(prisma, b3LevelId, readBeginner3Json(), "study-b3-assessment-exit");

  const i1LevelId = levelIdByCode.get(StudyLevelCode.INTERMEDIATE_1)!;
  await seedStudyLevelBank(prisma, i1LevelId, readIntermediate1Json(), "study-i1-assessment-exit");
}
