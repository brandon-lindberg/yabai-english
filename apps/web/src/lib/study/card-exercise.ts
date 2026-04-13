import { z } from "zod";
import { answersMatch } from "./quiz";

const reorderTokenSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

/** Stored on `StudyCard.exerciseJson` and optional in curriculum JSON. */
export const studyCardReorderExerciseSchema = z.object({
  kind: z.literal("reorder"),
  tokens: z.array(reorderTokenSchema).min(2),
  correctTokenIds: z.array(z.string().min(1)).min(2),
});

export const studyCardMultiStepExerciseSchema = z.object({
  kind: z.literal("multi_step"),
  steps: z
    .array(
      z.object({
        prompt: z.string().min(1),
        canonical: z.string().min(1),
      }),
    )
    .min(2)
    .max(4),
});

export const studyCardExerciseSchema = z.discriminatedUnion("kind", [
  studyCardReorderExerciseSchema,
  studyCardMultiStepExerciseSchema,
]);

export type StudyCardExercise = z.infer<typeof studyCardExerciseSchema>;
export type StudyCardReorderExercise = z.infer<typeof studyCardReorderExerciseSchema>;
export type StudyCardMultiStepExercise = z.infer<typeof studyCardMultiStepExerciseSchema>;

export function parseStudyCardExercise(raw: unknown | null | undefined): StudyCardExercise | null {
  if (raw == null) return null;
  const parsed = studyCardExerciseSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** Public payload for GET /api/study/queue (no canonical answers). */
export type StudyExerciseQueueReorder = {
  kind: "reorder";
  tokens: { id: string; text: string }[];
};

export type StudyExerciseQueueMultiStep = {
  kind: "multi_step";
  steps: { prompt: string }[];
};

export function queuePayloadFromExercise(ex: StudyCardExercise): StudyExerciseQueueReorder | StudyExerciseQueueMultiStep {
  if (ex.kind === "reorder") {
    return { kind: "reorder", tokens: ex.tokens.map((t) => ({ id: t.id, text: t.text })) };
  }
  return { kind: "multi_step", steps: ex.steps.map((s) => ({ prompt: s.prompt })) };
}

/** Deterministic shuffle for stable UX per card id (not cryptographically secure). */
export function shuffleTokensForQueue<T extends { id: string }>(tokens: T[], seed: string): T[] {
  const arr = [...tokens];
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  for (let i = arr.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) | 0;
    const j = Math.abs(h) % (i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

export type StudyReviewPayload =
  | { mode: "mcq"; chosenAnswer: string }
  | { mode: "reorder"; reorderTokenIds: string[] }
  | { mode: "multi_step"; multiStepAnswers: string[] };

export function gradeStudyCardReview(
  backEn: string,
  exercise: StudyCardExercise | null,
  payload: StudyReviewPayload,
): boolean {
  if (!exercise) {
    if (payload.mode !== "mcq") return false;
    return answersMatch(payload.chosenAnswer, backEn);
  }
  if (exercise.kind === "reorder") {
    if (payload.mode !== "reorder") return false;
    const ids = payload.reorderTokenIds;
    if (ids.length !== exercise.correctTokenIds.length) return false;
    return ids.every((id, i) => id === exercise.correctTokenIds[i]);
  }
  if (exercise.kind === "multi_step") {
    if (payload.mode !== "multi_step") return false;
    const parts = payload.multiStepAnswers;
    if (parts.length !== exercise.steps.length) return false;
    return exercise.steps.every((step, i) => answersMatch(parts[i] ?? "", step.canonical));
  }
  return false;
}

export function correctAnswerForDisplay(backEn: string, exercise: StudyCardExercise | null): string {
  if (exercise?.kind === "multi_step") {
    return exercise.steps.map((s) => s.canonical).join("\n→ ");
  }
  return backEn;
}

/** Split a sentence into comparable word tokens (punctuation stripped). */
export function wordsFromSentence(s: string): string[] {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/^["'([{]+|["'.,!?;:)\]}]+$/g, ""))
    .filter(Boolean);
}

function normWord(w: string): string {
  return w.trim().toLowerCase();
}

/**
 * Build a reorder exercise from a "Reorder: a / b / c" last line in `frontJa` and the canonical `backEn`.
 * Returns null if slash tokens cannot be aligned to back words (authoring must fix the card).
 */
export function inferReorderExerciseFromSlashLines(
  frontJa: string,
  backEn: string,
  idPrefix: string,
): StudyCardReorderExercise | null {
  const lines = frontJa.trim().split("\n");
  const slashLine = [...lines].reverse().find((l) => l.includes("/"));
  if (!slashLine) return null;
  const raw = slashLine.replace(/^Reorder[^:]*:\s*/i, "").trim();
  const textParts = raw.split("/").map((s) => s.trim()).filter(Boolean);
  if (textParts.length < 2) return null;
  const tokens = textParts.map((text, i) => ({ id: `${idPrefix}-w${i}`, text }));
  const words = wordsFromSentence(backEn);
  if (words.length !== tokens.length) return null;
  const used = new Set<number>();
  const correctTokenIds: string[] = [];
  for (const w of words) {
    const idx = tokens.findIndex((t, i) => !used.has(i) && normWord(t.text) === normWord(w));
    if (idx < 0) return null;
    used.add(idx);
    correctTokenIds.push(tokens[idx]!.id);
  }
  if (used.size !== tokens.length) return null;
  return { kind: "reorder", tokens, correctTokenIds };
}
