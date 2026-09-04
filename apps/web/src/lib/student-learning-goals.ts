/**
 * What a student says they are studying for.
 *
 * Collected during onboarding and read by teachers when they plan a lesson, so
 * it is one of the few things a student writes that somebody else acts on. It
 * used to be write-once — the wizard asked, and the profile form only ever
 * edited a name and a bio — which left a teacher working from whatever was
 * picked on day one, however long ago that was.
 *
 * The list lived as a private constant inside the wizard. Two screens offer it
 * now, so it lives here.
 */

/** Matches `StudentProfile.learningGoalsNote`'s column width. */
export const LEARNING_GOALS_NOTE_MAX_CHARS = 200;

export const LEARNING_GOALS = [
  { id: "conversation", labelKey: "goalConversation" },
  { id: "business", labelKey: "goalBusiness" },
  { id: "exam", labelKey: "goalExam" },
  { id: "travel", labelKey: "goalTravel" },
] as const;

export type LearningGoalId = (typeof LEARNING_GOALS)[number]["id"];

/**
 * The goals worth storing, out of whatever arrived.
 *
 * Ordered by the list rather than by what the client sent, so a profile does
 * not reshuffle itself between saves; deduplicated; and anything unrecognised
 * dropped, because this reaches the server from a browser and lands in a column
 * teachers read.
 */
export function normalizeLearningGoals(input: readonly string[]): LearningGoalId[] {
  const chosen = new Set(input);
  return LEARNING_GOALS.filter((goal) => chosen.has(goal.id)).map((goal) => goal.id);
}
