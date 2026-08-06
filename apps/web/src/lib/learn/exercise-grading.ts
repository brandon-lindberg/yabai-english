import { z } from "zod";
import type { ExerciseType } from "@/generated/prisma/enums";

/**
 * Server-side grading for lesson exercises.
 *
 * The client used to do this. `Exercise.content` was handed to the browser with
 * its `correctIndex` intact, `ExerciseRunner` compared the learner's choice to
 * it, and then POSTed the resulting `score` to /api/learn/attempts — which
 * validated that the number was a non-negative integer and wrote it straight to
 * `ExerciseAttempt.score`, to the lesson's `stars`, and to `UserCourseProgress.xp`.
 *
 * Two consequences: the answer key was readable in the page payload before you
 * answered, and any client could claim any score. Grading belongs on the server,
 * with the answer key never leaving it — the same shape /api/study/review and
 * the placement attempt flow already use.
 */

/** The learner's submitted work. Deliberately narrow: no score, no verdict. */
export const learnerResponseSchema = z.object({
  choiceIndex: z.number().int().min(0).optional(),
});

export type LearnerResponse = z.infer<typeof learnerResponseSchema>;

/** Stored content for a multiple-choice item, answer key included. */
const multipleChoiceContentSchema = z.object({
  options: z.array(z.string()).min(1),
  correctIndex: z.number().int().min(0),
  promptJa: z.string().optional(),
  promptEn: z.string().optional(),
});

/** What the browser is allowed to see: everything except which one is right. */
export type PublicExerciseContent = {
  options: string[];
  promptJa?: string;
  promptEn?: string;
};

export type GradeResult =
  | { ok: true; correct: boolean; score: number; correctIndex: number }
  | { ok: false; reason: "unsupported_type" | "malformed_content" | "malformed_response" };

/**
 * The set of types this grader can actually judge. `ExerciseType` has six
 * members but only multiple choice has a defined content shape and a runner;
 * the rest would otherwise fall through to "score whatever you were told".
 */
export function isGradableExerciseType(type: ExerciseType): boolean {
  return type === "MULTIPLE_CHOICE";
}

/**
 * Strip the answer key before an exercise is rendered.
 *
 * Returns `null` for anything this module cannot grade, so an ungradable type
 * can never be shipped with its raw content by accident.
 */
export function toPublicExerciseContent(
  type: ExerciseType,
  content: unknown,
): PublicExerciseContent | null {
  if (!isGradableExerciseType(type)) return null;
  const parsed = multipleChoiceContentSchema.safeParse(content);
  if (!parsed.success) return null;
  const { options, promptJa, promptEn } = parsed.data;
  return { options, promptJa, promptEn };
}

/**
 * Grade one attempt. `points` is the exercise's own value from the database —
 * never a number the client supplied.
 */
export function gradeExercise({
  type,
  content,
  points,
  response,
}: {
  type: ExerciseType;
  content: unknown;
  points: number;
  response: unknown;
}): GradeResult {
  if (!isGradableExerciseType(type)) {
    return { ok: false, reason: "unsupported_type" };
  }

  const parsedContent = multipleChoiceContentSchema.safeParse(content);
  if (!parsedContent.success) {
    return { ok: false, reason: "malformed_content" };
  }

  const parsedResponse = learnerResponseSchema.safeParse(response);
  if (!parsedResponse.success || parsedResponse.data.choiceIndex === undefined) {
    return { ok: false, reason: "malformed_response" };
  }

  const { options, correctIndex } = parsedContent.data;
  const { choiceIndex } = parsedResponse.data;

  // An out-of-range choice is a wrong answer, not an error: it scores zero
  // rather than letting a crafted index land on some other item's key.
  const correct = choiceIndex < options.length && choiceIndex === correctIndex;

  return {
    ok: true,
    correct,
    score: correct ? Math.max(0, points) : 0,
    correctIndex,
  };
}
