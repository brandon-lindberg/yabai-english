import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { STUDY_PRACTICE_FALLBACK, STUDY_PRACTICE_RULES, type PracticeCondition, type PracticeMetric } from "./practice-band-policy";

const attempts = Prisma.sql`(s."correctCount"::bigint + s."wrongCount"::bigint)`;
const metrics: Record<PracticeMetric, Prisma.Sql> = {
  attempts, accuracy: Prisma.sql`LEAST(100, FLOOR(100.0 * s."correctCount" / NULLIF(${attempts}, 0) + 0.5))`,
  correctCount: Prisma.sql`s."correctCount"`, wrongCount: Prisma.sql`s."wrongCount"`, streakCorrect: Prisma.sql`s."streakCorrect"`,
};
function conditionSql(condition: PracticeCondition): Prisma.Sql {
  if ("all" in condition) return Prisma.sql`(${Prisma.join(condition.all.map(conditionSql), " AND ")})`;
  if ("any" in condition) return Prisma.sql`(${Prisma.join(condition.any.map(conditionSql), " OR ")})`;
  const operators = { eq: "=", gte: ">=", lte: "<=", gt: ">" };
  const right = typeof condition.right === "number" ? Prisma.sql`${condition.right}` : metrics[condition.right];
  return Prisma.sql`${metrics[condition.left]} ${Prisma.raw(operators[condition.op])} ${right}`;
}
export const practiceBandSql = Prisma.sql`CASE ${Prisma.join(STUDY_PRACTICE_RULES.map(rule => Prisma.sql`WHEN ${conditionSql(rule.when)} THEN ${rule.band}`), " ")} ELSE ${STUDY_PRACTICE_FALLBACK} END`;
