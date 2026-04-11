import { z } from "zod";
import { StudyLevelCode } from "@prisma/client";

export const studyLevelCodeSchema = z.nativeEnum(StudyLevelCode);

const studyCardFileSchema = z.object({
  id: z.string().min(1),
  /** Question side; Japanese-dominant at low levels, English-dominant at high levels (see `prompt-locale-policy.ts`). */
  frontJa: z.string().min(1),
  backEn: z.string().min(1),
  sortOrder: z.number().int().min(0),
});

const studyDeckFileSchema = z.object({
  id: z.string().min(1),
  titleJa: z.string().min(1),
  titleEn: z.string().min(1),
  sortOrder: z.number().int().min(0),
  cards: z.array(studyCardFileSchema).min(1),
});

/** Beginner L1 curriculum file: 8–10 decks, 10–15 cards each, ~100–120 cards total. */
const BEGINNER_L1_DECK_MIN = 8;
const BEGINNER_L1_DECK_MAX = 10;
const BEGINNER_L1_CARDS_PER_DECK_MIN = 10;
const BEGINNER_L1_CARDS_PER_DECK_MAX = 15;
const BEGINNER_L1_TOTAL_CARDS_MIN = 100;
const BEGINNER_L1_TOTAL_CARDS_MAX = 125;

function refineBeginnerL1Decks<T extends { decks: { cards: unknown[] }[] }>(data: T, ctx: z.RefinementCtx) {
  const { decks } = data;
  if (decks.length < BEGINNER_L1_DECK_MIN || decks.length > BEGINNER_L1_DECK_MAX) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Expected ${BEGINNER_L1_DECK_MIN}–${BEGINNER_L1_DECK_MAX} decks, got ${decks.length}`,
    });
  }
  let total = 0;
  for (let i = 0; i < decks.length; i++) {
    const n = decks[i]!.cards.length;
    if (n < BEGINNER_L1_CARDS_PER_DECK_MIN || n > BEGINNER_L1_CARDS_PER_DECK_MAX) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Deck ${i}: expected ${BEGINNER_L1_CARDS_PER_DECK_MIN}–${BEGINNER_L1_CARDS_PER_DECK_MAX} cards, got ${n}`,
      });
    }
    total += n;
  }
  if (total < BEGINNER_L1_TOTAL_CARDS_MIN || total > BEGINNER_L1_TOTAL_CARDS_MAX) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Expected ${BEGINNER_L1_TOTAL_CARDS_MIN}–${BEGINNER_L1_TOTAL_CARDS_MAX} total cards, got ${total}`,
    });
  }
}

export const studyAssessmentItemSchema = z.object({
  id: z.string().min(1),
  /** Japanese stem; keep shorter at higher levels (see `prompt-locale-policy.ts`). */
  promptJa: z.string().min(1),
  /** English stem; becomes the primary task wording at higher levels. */
  promptEn: z.string().min(1),
  options: z.array(z.string()).min(2).max(6),
  correctIndex: z.number().int().min(0),
});

export const studyAssessmentItemsJsonSchema = z.object({
  items: z.array(studyAssessmentItemSchema).min(1),
});

export const beginnerLevelFileSchema = z
  .object({
    version: z.literal(1),
    levelCode: z.literal(StudyLevelCode.BEGINNER_1),
    decks: z.array(studyDeckFileSchema).min(BEGINNER_L1_DECK_MIN).max(BEGINNER_L1_DECK_MAX),
    assessment: z.object({
      passingScore: z.number().int().min(0).max(100),
      items: z.array(studyAssessmentItemSchema).min(8).max(16),
    }),
  })
  .superRefine(refineBeginnerL1Decks);

export type BeginnerLevelFile = z.infer<typeof beginnerLevelFileSchema>;
export type StudyAssessmentItem = z.infer<typeof studyAssessmentItemSchema>;

const llmAssessmentItemSchema = studyAssessmentItemSchema.extend({
  id: z.string().optional(),
});

const llmDeckShape = z.object({
  titleJa: z.string(),
  titleEn: z.string(),
  sortOrder: z.number().int(),
  cards: z.array(
    z.object({
      frontJa: z.string(),
      backEn: z.string(),
      sortOrder: z.number().int(),
    }),
  ),
});

/** LLM output shape (ids on cards/decks assigned after parse). */
export const llmBeginnerLevelResponseSchema = z
  .object({
    decks: z.array(llmDeckShape).min(BEGINNER_L1_DECK_MIN).max(BEGINNER_L1_DECK_MAX),
    assessment: z.object({
      passingScore: z.number().int(),
      items: z.array(llmAssessmentItemSchema).min(8).max(16),
    }),
  })
  .superRefine(refineBeginnerL1Decks);
