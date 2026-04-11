import fs from "node:fs";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { StudyLevelCode } from "@prisma/client";
import { beginnerLevelFileSchema } from "../src/lib/study/schemas";

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

/** New level banks: taper Japanese on `frontJa` / assessment stems — `src/lib/study/prompt-locale-policy.ts`. */
function readBeginner1Json() {
  const fp = path.join(__dirname, "../data/study/beginner-1.json");
  const raw = fs.readFileSync(fp, "utf8");
  const json = JSON.parse(raw) as unknown;
  return beginnerLevelFileSchema.parse(json);
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
  const data = readBeginner1Json();

  for (const deck of data.decks) {
    await prisma.studyDeck.upsert({
      where: { id: deck.id },
      update: {
        levelId: b1LevelId,
        titleJa: deck.titleJa,
        titleEn: deck.titleEn,
        sortOrder: deck.sortOrder,
        visibility: "SYSTEM",
        ownerUserId: null,
      },
      create: {
        id: deck.id,
        levelId: b1LevelId,
        titleJa: deck.titleJa,
        titleEn: deck.titleEn,
        sortOrder: deck.sortOrder,
        visibility: "SYSTEM",
      },
    });

    for (const card of deck.cards) {
      await prisma.studyCard.upsert({
        where: { id: card.id },
        update: {
          deckId: deck.id,
          frontJa: card.frontJa,
          backEn: card.backEn,
          sortOrder: card.sortOrder,
        },
        create: {
          id: card.id,
          deckId: deck.id,
          frontJa: card.frontJa,
          backEn: card.backEn,
          sortOrder: card.sortOrder,
        },
      });
    }
  }

  const assessmentId = "study-b1-assessment-exit";
  await prisma.studyAssessment.upsert({
    where: { id: assessmentId },
    update: {
      levelId: b1LevelId,
      kind: "LEVEL_EXIT",
      itemsJson: { items: data.assessment.items },
      passingScore: data.assessment.passingScore,
      sortOrder: 0,
    },
    create: {
      id: assessmentId,
      levelId: b1LevelId,
      kind: "LEVEL_EXIT",
      itemsJson: { items: data.assessment.items },
      passingScore: data.assessment.passingScore,
      sortOrder: 0,
    },
  });
}
