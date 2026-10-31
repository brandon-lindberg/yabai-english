import { beforeEach, expect, test, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { readStudentOnboardingState } from "../student-onboarding-state";
import { JAPANESE_PLACEMENT_DOMAINS } from "../japanese-placement/public";

const db = {
  studentProfile: { findUnique: vi.fn() }, user: { findUnique: vi.fn() },
  googleIntegrationSettings: { findUnique: vi.fn() }, booking: { count: vi.fn() }, chatThread: { count: vi.fn() },
  userStudyLevelProgress: { findFirst: vi.fn() }, studyTrack: { findUnique: vi.fn() },
  japanesePlacementAttempt: { findFirst: vi.fn() },
};
const client = db as unknown as PrismaClient;
const result = (status: "estimated" | "insufficient_evidence") => ({
  attemptId: "jp-attempt", completedAt: "2026-10-31T00:00:00.000Z",
  levelEstimate: status === "estimated"
    ? { status, scope: "reading_writing", band: "N4", provisional: true, basis: "jlpt_aligned_rules" }
    : { status, scope: "reading_writing", reason: "minimum_answers" },
  domains: JAPANESE_PLACEMENT_DOMAINS.map(domain => ({ domain, planned: 4, answered: 4, correct: 3, incorrect: 1, notSure: 0, observation: "observed" })),
});

beforeEach(() => {
  vi.clearAllMocks();
  db.studentProfile.findUnique.mockResolvedValue({ onboardingCompletedAt: new Date(), placedLevel: "ADVANCED", placementCompletedAt: new Date(), skippedOnboardingSteps: [] });
  db.user.findUnique.mockResolvedValue({ name: "Learner", image: null });
  db.googleIntegrationSettings.findUnique.mockResolvedValue({ calendarConnected: true, driveConnected: false });
  db.booking.count.mockResolvedValue(0); db.chatThread.count.mockResolvedValue(0);
  db.userStudyLevelProgress.findFirst.mockResolvedValue(null);
  db.studyTrack.findUnique.mockResolvedValue(null);
  db.japanesePlacementAttempt.findFirst.mockResolvedValue(null);
});

test("Japanese onboarding never treats English placement as Japanese completion or cooldown", async () => {
  const state = await readStudentOnboardingState(client, "learner", "JAPANESE");
  expect(state.completion).toMatchObject({ profile: true, integrations: true, bookLesson: false, placement: false, materials: false });
  expect(state.canStartPlacement).toBe(true);
  expect(state.materialsAvailable).toBe(false);
  expect(db.booking.count).toHaveBeenCalledWith({ where: { studentId: "learner", learningLanguage: "JAPANESE" } });
  expect(db.userStudyLevelProgress.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: {
    userId: "learner", lastStudiedAt: { not: null }, level: { track: { learningLanguage: "JAPANESE", publicationStatus: "PUBLISHED" } },
  } }));
  expect(db.studyTrack.findUnique).toHaveBeenCalledWith({ where: { slug: "japanese-flashcards", learningLanguage: "JAPANESE", publicationStatus: "PUBLISHED" }, select: { id: true } });
});

test("published Japanese study and a valid Japanese estimate complete their own steps", async () => {
  db.studyTrack.findUnique.mockResolvedValue({ id: "jp-track" });
  db.userStudyLevelProgress.findFirst.mockResolvedValue({ id: "jp-progress" });
  db.japanesePlacementAttempt.findFirst.mockResolvedValue({ id: "jp-attempt", finishedAt: new Date(), result: result("estimated") });
  const state = await readStudentOnboardingState(client, "learner", "JAPANESE");
  expect(state.completion).toMatchObject({ placement: true, materials: true });
  expect(state.canStartPlacement).toBe(false);
  expect(state.materialsAvailable).toBe(true);
  expect(db.japanesePlacementAttempt.findFirst).toHaveBeenCalledWith({ where: { learnerId: "learner", status: "COMPLETED", result: { path: ["levelEstimate", "status"], equals: "estimated" } }, orderBy: [{ finishedAt: "desc" }, { id: "desc" }], select: { id: true, finishedAt: true, result: true } });
});

test.each([result("insufficient_evidence"), { ...result("estimated"), attemptId: "another-attempt" }, {}])("inconclusive or invalid Japanese receipts do not complete placement", async receipt => {
  db.japanesePlacementAttempt.findFirst.mockResolvedValue({ id: "jp-attempt", result: receipt });
  expect((await readStudentOnboardingState(client, "learner", "JAPANESE")).completion.placement).toBe(false);
});

test("English keeps its own completion and retake policy without reading Japanese data", async () => {
  const state = await readStudentOnboardingState(client, "learner", "ENGLISH");
  expect(state.completion.placement).toBe(true);
  expect(state.canStartPlacement).toBe(false);
  expect(state.materialsAvailable).toBe(true);
  expect(db.japanesePlacementAttempt.findFirst).not.toHaveBeenCalled();
  expect(db.studyTrack.findUnique).not.toHaveBeenCalled();
  expect(db.booking.count).toHaveBeenCalledWith({ where: { studentId: "learner", learningLanguage: "ENGLISH" } });
});
