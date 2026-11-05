import { z } from "zod";
import { QUICK_REVIEW_DAILY_MAX } from "./quick-review-day";
import { JAPANESE_REFERENCE_BANDS, japaneseLocalizedText } from "../japanese-placement/public";

export const JAPANESE_STUDY_TASKS = ["vocabulary_meaning", "vocabulary_reading", "kanji_on", "kanji_kun"] as const;
export type JapaneseStudyTask = typeof JAPANESE_STUDY_TASKS[number];
const text = z.string().min(1);
export const japaneseStudyQuestionSchema = z.object({
  id: text, unitId: text, memberId: text, task: z.enum(JAPANESE_STUDY_TASKS),
  instruction: japaneseLocalizedText,
  level: z.object({ introduction: z.enum(JAPANESE_REFERENCE_BANDS), source: z.enum(JAPANESE_REFERENCE_BANDS), form: z.enum(JAPANESE_REFERENCE_BANDS) }).strict(),
  stimulus: z.object({ written: text, reading: text.optional(), meanings: z.array(text).min(1).optional() }).strict(),
  usage: z.array(text),
  choices: z.array(z.object({ id: text, text }).strict()).min(2).max(4),
}).strict().superRefine((question, ctx) => {
  if (new Set(question.choices.map(choice => choice.id)).size !== question.choices.length || new Set(question.choices.map(choice => choice.text)).size !== question.choices.length) ctx.addIssue({ code: "custom", message: "Duplicate study choice" });
  if ((question.task === "vocabulary_meaning") === (question.stimulus.meanings !== undefined)) ctx.addIssue({ code: "custom", message: "Meaning key exposed or reading context missing" });
  if (question.task === "vocabulary_meaning" && !question.stimulus.reading) ctx.addIssue({ code: "custom", message: "Word meaning requires its specific reading context" });
  if (question.task !== "vocabulary_meaning" && question.stimulus.reading !== undefined) ctx.addIssue({ code: "custom", message: "Reading key exposed" });
});
export type JapaneseStudyQuestion = z.infer<typeof japaneseStudyQuestionSchema>;
export const japaneseStudyResponseSchema = z.object({ promptId: text, choiceId: text }).strict();

/** Full translatable instructions; UI locale never changes the learning task. */
export const japaneseStudyInstructions: Record<JapaneseStudyTask, { en: string; ja: string }> = {
  vocabulary_meaning: { en: "Choose a meaning of this word.", ja: "この言葉の意味を選んでください。" },
  vocabulary_reading: { en: "Choose the reading for this word.", ja: "この言葉の読み方を選んでください。" },
  kanji_on: { en: "Choose an on-reading of this kanji.", ja: "この漢字の音読みを選んでください。" },
  kanji_kun: { en: "Choose a kun-reading of this kanji.", ja: "この漢字の訓読みを選んでください。" },
};

export const japaneseStudyFeedbackSchema = z.object({
  written: text, reading: text.optional(), meanings: z.array(text),
  onyomi: z.array(text).optional(), kunyomi: z.array(text).optional(), nanori: z.array(text).optional(),
}).strict();
export type JapaneseStudyFeedback = z.infer<typeof japaneseStudyFeedbackSchema>;
export type JapaneseQuickReviewCard = { id: string; feedback: JapaneseStudyFeedback };

export const japaneseStudyResultSchema = z.object({
  promptId: z.string(), correct: z.boolean(), feedback: japaneseStudyFeedbackSchema,
  xpGained: z.number().int(), levelXp: z.number().int(), totalStudyXp: z.number().int(), masteryScore: z.number().int(),
  correctCount: z.number().int(), wrongCount: z.number().int(), streakCorrect: z.number().int(),
  accuracyPercent: z.number().nullable(), averageAnswerMs: z.number().nullable(),
  practiceBand: z.enum(["new", "learning", "weak", "mastered"]),
  unlocked: z.array(z.enum(JAPANESE_REFERENCE_BANDS)), completed: z.array(z.enum(JAPANESE_REFERENCE_BANDS)),
}).strict();
export type JapaneseStudyResult = z.infer<typeof japaneseStudyResultSchema>;
const issuedQuestionSchema = z.object({ question: japaneseStudyQuestionSchema, expiresAt: z.string().datetime() }).strict();
const uniqueQuestions = (cards: { question: JapaneseStudyQuestion }[], ctx: z.RefinementCtx) => {
  if (new Set(cards.map(card => card.question.id)).size !== cards.length || new Set(cards.map(card => card.question.unitId)).size !== cards.length) ctx.addIssue({ code: "custom", message: "Duplicate queue question" });
};
export const japaneseStudyQueueSchema = z.object({
  levelCode: z.enum(JAPANESE_REFERENCE_BANDS), cards: z.array(issuedQuestionSchema).max(50),
}).strict().superRefine((queue, ctx) => uniqueQuestions(queue.cards, ctx));
export type JapaneseStudyQueue = z.infer<typeof japaneseStudyQueueSchema>;
const dailyFields = {
  dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  total: z.number().int().min(0).max(QUICK_REVIEW_DAILY_MAX), answered: z.number().int().min(0).max(QUICK_REVIEW_DAILY_MAX),
  correct: z.number().int().min(0), wrong: z.number().int().min(0), xp: z.number().int().min(0),
};
const validDailyCounts = (value: { answered: number; correct: number; wrong: number; total: number }, ctx: z.RefinementCtx) => {
  if (value.answered > value.total || value.correct + value.wrong !== value.answered) ctx.addIssue({ code: "custom", message: "Invalid daily counts" });
};
export const japaneseQuickReviewStatusSchema = z.object(dailyFields).strict().superRefine(validDailyCounts);
export type JapaneseQuickReviewStatus = z.infer<typeof japaneseQuickReviewStatusSchema>;
export type JapaneseQuickReviewRecap = JapaneseQuickReviewStatus & { reviewedCards: JapaneseQuickReviewCard[] };
export const japaneseQuickReviewQueueSchema = z.object({ ...dailyFields, cards: z.array(issuedQuestionSchema).max(QUICK_REVIEW_DAILY_MAX) }).strict().superRefine((value, ctx) => {
  validDailyCounts(value, ctx); uniqueQuestions(value.cards, ctx);
  if (value.cards.length + value.answered !== value.total) ctx.addIssue({ code: "custom", message: "Invalid daily queue size" });
});
export type JapaneseQuickReviewQueue = z.infer<typeof japaneseQuickReviewQueueSchema>;
