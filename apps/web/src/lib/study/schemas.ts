import { z } from "zod";
import { StudyLevelCode } from "@prisma/client";

export const studyLevelCodeSchema = z.nativeEnum(StudyLevelCode);

const studyCardFileSchema = z.object({
  id: z.string().min(1),
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

export const studyAssessmentItemSchema = z.object({
  id: z.string().min(1),
  promptJa: z.string().min(1),
  promptEn: z.string().min(1),
  options: z.array(z.string()).min(2).max(6),
  correctIndex: z.number().int().min(0),
});

export const studyAssessmentItemsJsonSchema = z.object({
  items: z.array(studyAssessmentItemSchema).min(1),
});

export const beginnerLevelFileSchema = z.object({
  version: z.literal(1),
  levelCode: z.literal(StudyLevelCode.BEGINNER_1),
  decks: z.array(studyDeckFileSchema).min(1),
  assessment: z.object({
    passingScore: z.number().int().min(0).max(100),
    items: z.array(studyAssessmentItemSchema).min(1),
  }),
});

export type BeginnerLevelFile = z.infer<typeof beginnerLevelFileSchema>;
export type StudyAssessmentItem = z.infer<typeof studyAssessmentItemSchema>;

const llmAssessmentItemSchema = studyAssessmentItemSchema.extend({
  id: z.string().optional(),
});

/** LLM output shape (ids on cards/decks assigned after parse). */
export const llmBeginnerLevelResponseSchema = z.object({
  decks: z.array(
    z.object({
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
    }),
  ),
  assessment: z.object({
    passingScore: z.number().int(),
    items: z.array(llmAssessmentItemSchema),
  }),
});
