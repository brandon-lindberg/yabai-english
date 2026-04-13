import { z } from "zod";
import { studyCardExerciseSchema } from "./card-exercise";

/** Matches Prisma `StudyLevelCode` (`schema.prisma`); defined here so Zod schemas do not depend on generated client order. */
const STUDY_LEVEL_CODES = [
  "BEGINNER_1",
  "BEGINNER_2",
  "BEGINNER_3",
  "INTERMEDIATE_1",
  "INTERMEDIATE_2",
  "INTERMEDIATE_3",
  "ADVANCED_1",
  "ADVANCED_2",
  "ADVANCED_3",
] as const;

export const studyLevelCodeSchema = z.enum(STUDY_LEVEL_CODES);

const studyCardFileSchema = z
  .object({
    id: z.string().min(1),
    /** Question side; Japanese-dominant at low levels, English-dominant at high levels (see `prompt-locale-policy.ts`). */
    frontJa: z.string().min(1),
    backEn: z.string().min(1),
    sortOrder: z.number().int().min(0),
    /** Structured exercise (reorder / multi-step). Omitted = classic MCQ. */
    exercise: studyCardExerciseSchema.optional(),
  })
  .superRefine((card, ctx) => {
    if (!card.exercise || card.exercise.kind !== "reorder") return;
    const ex = card.exercise;
    const idSet = new Set(ex.tokens.map((t) => t.id));
    if (idSet.size !== ex.tokens.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Card ${card.id}: reorder token ids must be unique`,
      });
    }
    if (ex.correctTokenIds.length !== ex.tokens.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Card ${card.id}: reorder correctTokenIds length must match tokens`,
      });
    }
    for (const id of ex.correctTokenIds) {
      if (!idSet.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Card ${card.id}: unknown reorder token id ${id}`,
        });
      }
    }
    if (new Set(ex.correctTokenIds).size !== ex.tokens.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Card ${card.id}: correctTokenIds must be a permutation of token ids`,
      });
    }
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

type DecksRefinable = { decks: Array<{ cards: ReadonlyArray<unknown> }> };

function refineBeginnerL1Decks(data: DecksRefinable, ctx: z.RefinementCtx): void {
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

const beginnerLevelFileBaseSchema = z.object({
  version: z.literal(1),
  levelCode: z.literal("BEGINNER_1"),
  decks: z.array(studyDeckFileSchema).min(BEGINNER_L1_DECK_MIN).max(BEGINNER_L1_DECK_MAX),
  assessment: z.object({
    passingScore: z.number().int().min(0).max(100),
    items: z.array(studyAssessmentItemSchema).min(8).max(16),
  }),
});

export const beginnerLevelFileSchema = beginnerLevelFileBaseSchema.superRefine(refineBeginnerL1Decks);

/** Beginner L2: 15–20 decks, 10–12 cards each, ~180–220 total (functional daily English). */
const BEGINNER_L2_DECK_MIN = 15;
const BEGINNER_L2_DECK_MAX = 20;
const BEGINNER_L2_CARDS_PER_DECK_MIN = 10;
const BEGINNER_L2_CARDS_PER_DECK_MAX = 12;
const BEGINNER_L2_TOTAL_CARDS_MIN = 180;
const BEGINNER_L2_TOTAL_CARDS_MAX = 220;

function refineBeginnerL2Decks(data: DecksRefinable, ctx: z.RefinementCtx): void {
  const { decks } = data;
  if (decks.length < BEGINNER_L2_DECK_MIN || decks.length > BEGINNER_L2_DECK_MAX) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Expected ${BEGINNER_L2_DECK_MIN}–${BEGINNER_L2_DECK_MAX} decks, got ${decks.length}`,
    });
  }
  let total = 0;
  for (let i = 0; i < decks.length; i++) {
    const n = decks[i]!.cards.length;
    if (n < BEGINNER_L2_CARDS_PER_DECK_MIN || n > BEGINNER_L2_CARDS_PER_DECK_MAX) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Deck ${i}: expected ${BEGINNER_L2_CARDS_PER_DECK_MIN}–${BEGINNER_L2_CARDS_PER_DECK_MAX} cards, got ${n}`,
      });
    }
    total += n;
  }
  if (total < BEGINNER_L2_TOTAL_CARDS_MIN || total > BEGINNER_L2_TOTAL_CARDS_MAX) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Expected ${BEGINNER_L2_TOTAL_CARDS_MIN}–${BEGINNER_L2_TOTAL_CARDS_MAX} total cards, got ${total}`,
    });
  }
}

const beginner2LevelFileBaseSchema = z.object({
  version: z.literal(1),
  levelCode: z.literal("BEGINNER_2"),
  decks: z.array(studyDeckFileSchema).min(BEGINNER_L2_DECK_MIN).max(BEGINNER_L2_DECK_MAX),
  assessment: z.object({
    passingScore: z.number().int().min(0).max(100),
    items: z.array(studyAssessmentItemSchema).min(8).max(16),
  }),
});

export const beginner2LevelFileSchema = beginner2LevelFileBaseSchema.superRefine(refineBeginnerL2Decks);

/** Beginner L3: 20–25 decks, 12–14 cards each, ~250–300 total (simple independence). */
const BEGINNER_L3_DECK_MIN = 20;
const BEGINNER_L3_DECK_MAX = 25;
const BEGINNER_L3_CARDS_PER_DECK_MIN = 12;
const BEGINNER_L3_CARDS_PER_DECK_MAX = 14;
const BEGINNER_L3_TOTAL_CARDS_MIN = 250;
const BEGINNER_L3_TOTAL_CARDS_MAX = 300;

function refineBeginnerL3Decks(data: DecksRefinable, ctx: z.RefinementCtx): void {
  const { decks } = data;
  if (decks.length < BEGINNER_L3_DECK_MIN || decks.length > BEGINNER_L3_DECK_MAX) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Expected ${BEGINNER_L3_DECK_MIN}–${BEGINNER_L3_DECK_MAX} decks, got ${decks.length}`,
    });
  }
  let total = 0;
  for (let i = 0; i < decks.length; i++) {
    const n = decks[i]!.cards.length;
    if (n < BEGINNER_L3_CARDS_PER_DECK_MIN || n > BEGINNER_L3_CARDS_PER_DECK_MAX) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Deck ${i}: expected ${BEGINNER_L3_CARDS_PER_DECK_MIN}–${BEGINNER_L3_CARDS_PER_DECK_MAX} cards, got ${n}`,
      });
    }
    total += n;
  }
  if (total < BEGINNER_L3_TOTAL_CARDS_MIN || total > BEGINNER_L3_TOTAL_CARDS_MAX) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Expected ${BEGINNER_L3_TOTAL_CARDS_MIN}–${BEGINNER_L3_TOTAL_CARDS_MAX} total cards, got ${total}`,
    });
  }
}

const beginner3LevelFileBaseSchema = z.object({
  version: z.literal(1),
  levelCode: z.literal("BEGINNER_3"),
  decks: z.array(studyDeckFileSchema).min(BEGINNER_L3_DECK_MIN).max(BEGINNER_L3_DECK_MAX),
  assessment: z.object({
    passingScore: z.number().int().min(0).max(100),
    items: z.array(studyAssessmentItemSchema).min(8).max(16),
  }),
});

export const beginner3LevelFileSchema = beginner3LevelFileBaseSchema.superRefine(refineBeginnerL3Decks);

/** Intermediate L1: 10–12 decks, 20–25 cards each, ~220–260 total (controlled conversation). */
const INTERMEDIATE_1_DECK_MIN = 10;
const INTERMEDIATE_1_DECK_MAX = 12;
const INTERMEDIATE_1_CARDS_PER_DECK_MIN = 20;
const INTERMEDIATE_1_CARDS_PER_DECK_MAX = 25;
const INTERMEDIATE_1_TOTAL_CARDS_MIN = 220;
const INTERMEDIATE_1_TOTAL_CARDS_MAX = 260;

function refineIntermediate1Decks(data: DecksRefinable, ctx: z.RefinementCtx): void {
  const { decks } = data;
  if (decks.length < INTERMEDIATE_1_DECK_MIN || decks.length > INTERMEDIATE_1_DECK_MAX) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Expected ${INTERMEDIATE_1_DECK_MIN}–${INTERMEDIATE_1_DECK_MAX} decks, got ${decks.length}`,
    });
  }
  let total = 0;
  for (let i = 0; i < decks.length; i++) {
    const n = decks[i]!.cards.length;
    if (n < INTERMEDIATE_1_CARDS_PER_DECK_MIN || n > INTERMEDIATE_1_CARDS_PER_DECK_MAX) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Deck ${i}: expected ${INTERMEDIATE_1_CARDS_PER_DECK_MIN}–${INTERMEDIATE_1_CARDS_PER_DECK_MAX} cards, got ${n}`,
      });
    }
    total += n;
  }
  if (total < INTERMEDIATE_1_TOTAL_CARDS_MIN || total > INTERMEDIATE_1_TOTAL_CARDS_MAX) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Expected ${INTERMEDIATE_1_TOTAL_CARDS_MIN}–${INTERMEDIATE_1_TOTAL_CARDS_MAX} total cards, got ${total}`,
    });
  }
}

const intermediate1LevelFileBaseSchema = z.object({
  version: z.literal(1),
  levelCode: z.literal("INTERMEDIATE_1"),
  decks: z.array(studyDeckFileSchema).min(INTERMEDIATE_1_DECK_MIN).max(INTERMEDIATE_1_DECK_MAX),
  assessment: z.object({
    passingScore: z.number().int().min(0).max(100),
    items: z.array(studyAssessmentItemSchema).min(8).max(16),
  }),
});

export const intermediate1LevelFileSchema =
  intermediate1LevelFileBaseSchema.superRefine(refineIntermediate1Decks);

/** Intermediate L2: 25–30 decks, 12–14 cards each, ~300–360 total (real-world interaction). */
const INTERMEDIATE_2_DECK_MIN = 25;
const INTERMEDIATE_2_DECK_MAX = 30;
const INTERMEDIATE_2_CARDS_PER_DECK_MIN = 12;
const INTERMEDIATE_2_CARDS_PER_DECK_MAX = 14;
const INTERMEDIATE_2_TOTAL_CARDS_MIN = 300;
const INTERMEDIATE_2_TOTAL_CARDS_MAX = 360;

function refineIntermediate2Decks(data: DecksRefinable, ctx: z.RefinementCtx): void {
  const { decks } = data;
  if (decks.length < INTERMEDIATE_2_DECK_MIN || decks.length > INTERMEDIATE_2_DECK_MAX) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Expected ${INTERMEDIATE_2_DECK_MIN}–${INTERMEDIATE_2_DECK_MAX} decks, got ${decks.length}`,
    });
  }
  let total = 0;
  for (let i = 0; i < decks.length; i++) {
    const n = decks[i]!.cards.length;
    if (n < INTERMEDIATE_2_CARDS_PER_DECK_MIN || n > INTERMEDIATE_2_CARDS_PER_DECK_MAX) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Deck ${i}: expected ${INTERMEDIATE_2_CARDS_PER_DECK_MIN}–${INTERMEDIATE_2_CARDS_PER_DECK_MAX} cards, got ${n}`,
      });
    }
    total += n;
  }
  if (total < INTERMEDIATE_2_TOTAL_CARDS_MIN || total > INTERMEDIATE_2_TOTAL_CARDS_MAX) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Expected ${INTERMEDIATE_2_TOTAL_CARDS_MIN}–${INTERMEDIATE_2_TOTAL_CARDS_MAX} total cards, got ${total}`,
    });
  }
}

const intermediate2LevelFileBaseSchema = z.object({
  version: z.literal(1),
  levelCode: z.literal("INTERMEDIATE_2"),
  decks: z.array(studyDeckFileSchema).min(INTERMEDIATE_2_DECK_MIN).max(INTERMEDIATE_2_DECK_MAX),
  assessment: z.object({
    passingScore: z.number().int().min(0).max(100),
    items: z.array(studyAssessmentItemSchema).min(8).max(16),
  }),
});

export const intermediate2LevelFileSchema =
  intermediate2LevelFileBaseSchema.superRefine(refineIntermediate2Decks);

/** Intermediate L3: 30–35 decks, 14–16 cards each, ~400–500 total (clear expression). */
const INTERMEDIATE_3_DECK_MIN = 30;
const INTERMEDIATE_3_DECK_MAX = 35;
const INTERMEDIATE_3_CARDS_PER_DECK_MIN = 14;
const INTERMEDIATE_3_CARDS_PER_DECK_MAX = 16;
const INTERMEDIATE_3_TOTAL_CARDS_MIN = 400;
const INTERMEDIATE_3_TOTAL_CARDS_MAX = 500;

function refineIntermediate3Decks(data: DecksRefinable, ctx: z.RefinementCtx): void {
  const { decks } = data;
  if (decks.length < INTERMEDIATE_3_DECK_MIN || decks.length > INTERMEDIATE_3_DECK_MAX) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Expected ${INTERMEDIATE_3_DECK_MIN}–${INTERMEDIATE_3_DECK_MAX} decks, got ${decks.length}`,
    });
  }
  let total = 0;
  for (let i = 0; i < decks.length; i++) {
    const n = decks[i]!.cards.length;
    if (n < INTERMEDIATE_3_CARDS_PER_DECK_MIN || n > INTERMEDIATE_3_CARDS_PER_DECK_MAX) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Deck ${i}: expected ${INTERMEDIATE_3_CARDS_PER_DECK_MIN}–${INTERMEDIATE_3_CARDS_PER_DECK_MAX} cards, got ${n}`,
      });
    }
    total += n;
  }
  if (total < INTERMEDIATE_3_TOTAL_CARDS_MIN || total > INTERMEDIATE_3_TOTAL_CARDS_MAX) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Expected ${INTERMEDIATE_3_TOTAL_CARDS_MIN}–${INTERMEDIATE_3_TOTAL_CARDS_MAX} total cards, got ${total}`,
    });
  }
}

const intermediate3LevelFileBaseSchema = z.object({
  version: z.literal(1),
  levelCode: z.literal("INTERMEDIATE_3"),
  decks: z.array(studyDeckFileSchema).min(INTERMEDIATE_3_DECK_MIN).max(INTERMEDIATE_3_DECK_MAX),
  assessment: z.object({
    passingScore: z.number().int().min(0).max(100),
    items: z.array(studyAssessmentItemSchema).min(8).max(16),
  }),
});

export const intermediate3LevelFileSchema =
  intermediate3LevelFileBaseSchema.superRefine(refineIntermediate3Decks);

export type BeginnerLevelFile = z.infer<typeof beginnerLevelFileSchema>;
export type Beginner2LevelFile = z.infer<typeof beginner2LevelFileSchema>;
export type Beginner3LevelFile = z.infer<typeof beginner3LevelFileSchema>;
export type Intermediate1LevelFile = z.infer<typeof intermediate1LevelFileSchema>;
export type Intermediate2LevelFile = z.infer<typeof intermediate2LevelFileSchema>;
export type Intermediate3LevelFile = z.infer<typeof intermediate3LevelFileSchema>;
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
