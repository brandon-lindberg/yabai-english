import { z } from "zod";
import {
  PLACEMENT_BANK_SECTIONS,
  PLACEMENT_QUESTIONS_PER_BAND_SECTION,
} from "@/lib/placement-bank/constants";

export const placementBankBandSchema = z.enum(["A1", "A2", "B1", "B2", "C1"]);
export const placementBankSectionSchema = z.enum(["grammar", "vocabulary", "reading", "functional"]);

const QUESTIONS_PER_LEVEL_FILE =
  PLACEMENT_BANK_SECTIONS.length * PLACEMENT_QUESTIONS_PER_BAND_SECTION;

/** One question object inside a level file (`data/placement-bank/{band}.json`). */
export const placementBankFileSchema = z.object({
  id: z.string().min(1),
  /** Stable key for “same stem” rules; defaults to id when omitted in loader. */
  stemId: z.string().min(1).optional(),
  weight: z.number().int().min(1).max(5),
  cefrBand: placementBankBandSchema,
  section: placementBankSectionSchema,
  instructionEn: z.string().min(1),
  instructionJa: z.string().min(1),
  questionEn: z.string().min(1),
  questionJa: z.string().min(1),
  optionsEn: z.array(z.string()).length(3),
  optionsJa: z.array(z.string()).length(3),
  correctIndex: z.number().int().min(0).max(2),
});

export type PlacementBankFile = z.infer<typeof placementBankFileSchema>;

/** One file per CEFR band: all sections × 100 questions (400 items). */
export const placementBankLevelFileSchema = z.object({
  cefrBand: placementBankBandSchema,
  questions: z.array(placementBankFileSchema).length(QUESTIONS_PER_LEVEL_FILE),
});

export type PlacementBankLevelFile = z.infer<typeof placementBankLevelFileSchema>;
