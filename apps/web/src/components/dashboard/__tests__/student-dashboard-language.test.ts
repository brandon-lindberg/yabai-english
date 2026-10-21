import { expect, test, vi } from "vitest";
const { quick, overview, resume } = vi.hoisted(() => ({ quick: vi.fn(async () => ({ cards: [], dayKey: "today", learnedToday: 0, notYetToday: 0 })), overview: vi.fn(async () => null), resume: vi.fn(async () => null) }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  studentProfile: { findUnique: async () => ({ placedLevel: "ADVANCED", placedSubLevel: 3, skippedOnboardingSteps: [] }) },
  user: { findUnique: async () => ({ name: "Student" }) },
  googleIntegrationSettings: { findUnique: async () => null },
  booking: { count: async () => 0 }, chatThread: { count: async () => 0 },
  userStudyLevelProgress: { findFirst: async () => null },
} }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("@/lib/dashboard/student-bookings", () => ({ getStudentBookingsForDashboard: async () => ({ upcoming: [], completed: [] }) }));
vi.mock("@/lib/study/quick-review", () => ({ getOrCreateQuickReviewCards: quick }));
vi.mock("@/lib/study/get-overview", () => ({ getStudyTrackOverview: overview }));
vi.mock("@/lib/dashboard/study-resume", () => ({ getStudyResumeInfo: resume }));
import { StudentDashboard } from "../student-dashboard";

test("Japanese dashboard does not read or create English practice or show its proficiency", async () => {
  const page = await StudentDashboard({ userId: "student", learningLanguage: "JAPANESE", onboardingHref: null, onboardingStep: null });
  expect(quick).not.toHaveBeenCalled();
  expect(overview).not.toHaveBeenCalled();
  expect(resume).not.toHaveBeenCalled();
  expect(page.props.title).toBe("japanese.dashboard");
  expect(JSON.stringify(page.props)).not.toContain("ADVANCED");
});
