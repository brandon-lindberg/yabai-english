import { z } from "zod";

export const JAPANESE_PLACEMENT_DOMAINS = ["kana", "kanji_reading", "vocabulary", "grammar", "reading", "writing"] as const;
export type JapanesePlacementDomain = typeof JAPANESE_PLACEMENT_DOMAINS[number];
export const JAPANESE_STUDY_BANDS = ["BELOW_N5", "N5", "N4", "N3", "N2", "N1"] as const;
export const JAPANESE_REFERENCE_BANDS = ["N5", "N4", "N3", "N2", "N1"] as const;
const text = z.string().trim().min(1);
export const japaneseLocalizedText = z.object({ en: text, ja: text }).strict();
export const japaneseTextStimulus = z.object({ kind: z.literal("text"), text }).strict();
export const japaneseOption = z.object({ id: text.regex(/^[a-z][a-z0-9._-]*$/i), text }).strict();
export const answerInput = z.object({ kind: z.literal("answer"), itemId: text, choiceId: text }).strict();
export const sentenceInput = z.object({ kind: z.literal("sentence_assembly"), itemId: text, tileIds: z.array(text).min(2).max(30) }).strict();
export const skipInput = z.object({ kind: z.literal("skip"), itemId: text, reason: z.literal("not_sure") }).strict();
export const japaneseResponseInputSchema = z.discriminatedUnion("kind", [answerInput, sentenceInput, skipInput]);
export type JapaneseResponseInput = z.infer<typeof japaneseResponseInputSchema>;

export const japaneseQuestionSchema = z.object({
  id: text, domain: z.enum(JAPANESE_PLACEMENT_DOMAINS), prompt: japaneseLocalizedText, stimulus: japaneseTextStimulus,
  response: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("choice"), choices: z.array(japaneseOption).min(2).max(6) }).strict(),
    z.object({ kind: z.literal("sentence_assembly"), tiles: z.array(japaneseOption).min(2).max(30) }).strict(),
  ]),
}).strict();
export type JapaneseQuestion = z.infer<typeof japaneseQuestionSchema>;

// The presentation projection also accepts the earlier, immutable v2 evidence summary.
// It never carries answer keys, response samples, source content or model likelihoods.
const band = z.enum(JAPANESE_STUDY_BANDS);
const count = z.number().int().nonnegative();
export const japaneseResultSchema = z.object({
  attemptId: text, completedAt: z.string().datetime(), completionReason: z.enum(["time_limit", "question_limit"]).optional(),
  levelEstimate: z.discriminatedUnion("status", [
    z.object({ status: z.literal("estimated"), scope: z.literal("reading_writing"), band, provisional: z.literal(true),
      basis: z.literal("jlpt_aligned_rules").optional(), modelRange: z.object({ lower: band, upper: band }).optional() }),
    z.object({ status: z.literal("insufficient_evidence"), scope: z.literal("reading_writing"), reason: text }),
    z.object({ status: z.literal("unavailable"), scope: z.literal("reading_writing"), reason: text }),
  ]),
  domains: z.array(z.object({ domain: z.enum(JAPANESE_PLACEMENT_DOMAINS), planned: count, answered: count, correct: count,
    incorrect: count, notSure: count, unanswered: count.optional(), observation: z.enum(["observed", "limited", "not_assessed"]) })).length(6),
}).refine((result) => new Set(result.domains.map((row) => row.domain)).size === 6, "Duplicate result domain")
  .refine((result) => result.levelEstimate.status !== "estimated" || (result.levelEstimate.basis === "jlpt_aligned_rules"
    ? !result.levelEstimate.modelRange : !!result.levelEstimate.modelRange), "Estimate basis/range mismatch");
export type JapanesePlacementResult = z.infer<typeof japaneseResultSchema>;

export const japaneseAttemptViewSchema = z.object({
  attemptId: text, status: z.enum(["IN_PROGRESS", "COMPLETED", "ABANDONED"]), answered: count, total: count.positive(),
  expiresAt: z.string().datetime().nullable(), timeLimitSec: z.number().positive().nullable(), serverNow: z.string().datetime().optional(),
  question: japaneseQuestionSchema.nullable(), result: japaneseResultSchema.nullable(),
}).superRefine((view, ctx) => {
  if (view.answered > view.total || (view.status === "IN_PROGRESS" && (!view.question || !view.expiresAt || !view.serverNow || !view.timeLimitSec))
    || (view.status === "COMPLETED" && !view.result)) ctx.addIssue({ code: "custom", message: "Invalid Japanese attempt view" });
});
export type JapaneseAttemptView = z.infer<typeof japaneseAttemptViewSchema>;
