export type PracticeMetric = "attempts" | "accuracy" | "streakCorrect" | "correctCount" | "wrongCount";
export type PracticeCondition = { all: readonly PracticeCondition[] } | { any: readonly PracticeCondition[] }
  | { left: PracticeMetric; op: "eq" | "gte" | "lte" | "gt"; right: number | PracticeMetric };

/** One rule definition, evaluated in JavaScript and compiled for database summaries. */
export const STUDY_PRACTICE_RULES: readonly { band: "new" | "mastered" | "weak"; when: PracticeCondition }[] = [
  { band: "new", when: { left: "attempts", op: "eq", right: 0 } },
  { band: "mastered", when: { all: [
    { left: "attempts", op: "gte", right: 8 }, { left: "accuracy", op: "gte", right: 88 },
    { left: "streakCorrect", op: "gte", right: 5 },
  ] } },
  { band: "weak", when: { all: [{ left: "attempts", op: "gte", right: 2 }, { any: [
    { left: "accuracy", op: "lte", right: 65 }, { left: "wrongCount", op: "gt", right: "correctCount" },
  ] }] } },
];
export const STUDY_PRACTICE_FALLBACK = "learning";

export function matchesPracticeCondition(condition: PracticeCondition, metrics: Record<PracticeMetric, number>): boolean {
  if ("all" in condition) return condition.all.every(rule => matchesPracticeCondition(rule, metrics));
  if ("any" in condition) return condition.any.some(rule => matchesPracticeCondition(rule, metrics));
  const left = metrics[condition.left], right = typeof condition.right === "number" ? condition.right : metrics[condition.right];
  switch (condition.op) { case "eq": return left === right; case "gte": return left >= right; case "lte": return left <= right; case "gt": return left > right; }
}
