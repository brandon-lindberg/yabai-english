import { expect, test, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { readJapanesePlacementRetake } from "../retake";
import { JAPANESE_PLACEMENT_DOMAINS } from "../public";

const receipt = { attemptId: "awarded", completedAt: "2026-01-31T10:00:00.000Z",
  levelEstimate: { status: "estimated", scope: "reading_writing", band: "N5", provisional: true, basis: "jlpt_aligned_rules" },
  domains: JAPANESE_PLACEMENT_DOMAINS.map(domain => ({ domain, planned: 4, answered: 4, correct: 3, incorrect: 1, notSure: 0, observation: "observed" })),
};
const completedAt = new Date(receipt.completedAt);
const stored = { id: "awarded", finishedAt: completedAt, result: receipt };
function database(row: unknown) {
  const findFirst = vi.fn().mockResolvedValue(row);
  return { db: { japanesePlacementAttempt: { findFirst } } as unknown as PrismaClient, findFirst };
}

test.each([
  ["2026-02-28T09:59:59.999Z", false], ["2026-02-28T10:00:00.000Z", true], ["2026-03-01T00:00:00.000Z", true],
])("Japanese retake uses the existing calendar-month boundary at %s", async (now, allowed) => {
  const { db, findFirst } = database(stored);
  expect(await readJapanesePlacementRetake(db, "learner", Date.parse(now))).toEqual({
    completedAt, canStartNewAttempt: allowed, retakeEligibleAt: "2026-02-28T10:00:00.000Z",
  });
  expect(findFirst).toHaveBeenCalledWith({ where: { learnerId: "learner", status: "COMPLETED", result: { path: ["levelEstimate", "status"], equals: "estimated" } },
    orderBy: [{ finishedAt: "desc" }, { id: "desc" }], select: { id: true, finishedAt: true, result: true } });
});

test("no Japanese award means immediate eligibility, independent of English placement", async () => {
  expect(await readJapanesePlacementRetake(database(null).db, "learner", Date.now())).toEqual({ completedAt: null, canStartNewAttempt: true, retakeEligibleAt: null });
});

test.each([{ ...stored, result: {} }, { ...stored, result: { ...receipt, attemptId: "other" } }, { ...stored, result: { ...receipt, levelEstimate: { status: "insufficient_evidence", scope: "reading_writing", reason: "too_few_answers" } } }])("invalid or non-awarded receipts cannot establish a cooldown", async row => {
  expect((await readJapanesePlacementRetake(database(row).db, "learner", Date.now())).completedAt).toBeNull();
});
