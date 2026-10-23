import { z } from "zod";
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
