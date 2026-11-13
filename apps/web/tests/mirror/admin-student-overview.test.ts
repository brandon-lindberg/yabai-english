import { expect, test, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { loadAdminStudentOverview } from "@/lib/admin/student-overview";
import { JAPANESE_PLACEMENT_DOMAINS } from "@/lib/japanese-placement/public";

test("separates lesson subjects and retains the Japanese award after an inconclusive attempt", async () => {
  const completedAt = new Date("2026-01-31T14:00:00.000Z");
  const domains = JAPANESE_PLACEMENT_DOMAINS.map(domain => ({
    domain, planned: 4, answered: 4, correct: 3, incorrect: 1, notSure: 0, observation: "observed",
  }));
  const result = { attemptId: "award", completedAt: completedAt.toISOString(), levelEstimate: {
    status: "estimated", band: "N3", basis: "jlpt_aligned_rules", provisional: true, scope: "reading_writing",
  }, domains };
  const findBookings = vi.fn().mockResolvedValue([]);
  const db = {
    booking: {
      findMany: findBookings,
      groupBy: vi.fn().mockResolvedValue([{ learningLanguage: "JAPANESE", _count: { _all: 7 } }]),
    },
    japanesePlacementAttempt: {
      findFirst: vi.fn().mockResolvedValue({ id: "award", result, finishedAt: completedAt,
        learner: { studentProfile: { timezone: "Asia/Tokyo" } } }),
      findMany: vi.fn().mockResolvedValue([
        { id: "latest", finishedAt: new Date("2026-03-02T00:00:00Z"), result: { ...result, attemptId: "latest", levelEstimate: {
          status: "insufficient_evidence", scope: "reading_writing", reason: "Too few answers",
        } } },
        { id: "award", finishedAt: completedAt, result },
      ]),
    },
    englishPlacementAttempt: { findMany: vi.fn().mockResolvedValue([]) },
  } as unknown as PrismaClient;

  const overview = await loadAdminStudentOverview(db, "student-1", null);
  expect(findBookings.mock.calls.map(([args]) => args.where)).toEqual([
    { studentId: "student-1", learningLanguage: "ENGLISH" },
    { studentId: "student-1", learningLanguage: "JAPANESE" },
  ]);
  expect(overview.ENGLISH).toMatchObject({ currentLevel: null, attempts: [], lessonCount: 0 });
  expect(overview.JAPANESE).toMatchObject({
    currentLevel: "N3", retakeDate: "2026-02-28", lessonCount: 7,
    attempts: [{ status: "INCONCLUSIVE" }, { status: "AWARDED", level: "N3" }],
  });
  expect(JSON.stringify(overview)).not.toContain("Too few answers");
});
