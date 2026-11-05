import { beforeEach, expect, test, vi } from "vitest";
import { japanesePlacementResultFixture } from "../../../../test/japanese-placement-result-fixture";
const mocks = vi.hoisted(() => ({ quick: vi.fn(), overview: vi.fn(), resume: vi.fn(), japanese: vi.fn(), user: vi.fn(), profile: vi.fn(), studied: vi.fn(), award: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  studentProfile: { findUnique: mocks.profile }, user: { findUnique: mocks.user },
  googleIntegrationSettings: { findUnique: async () => null },
  booking: { count: async () => 0 }, chatThread: { count: async () => 0 },
  userStudyLevelProgress: { findFirst: mocks.studied },
  studyTrack: { findUnique: async () => null }, japanesePlacementAttempt: { findFirst: mocks.award },
} }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "en", getTranslations: async () => (key: string) => key }));
vi.mock("@/lib/dashboard/student-bookings", () => ({ getStudentBookingsForDashboard: async () => ({ upcoming: [], completed: [] }) }));
vi.mock("@/lib/study/quick-review", () => ({ getOrCreateQuickReviewCards: mocks.quick }));
vi.mock("@/lib/study/get-overview", () => ({ getStudyTrackOverview: mocks.overview }));
vi.mock("@/lib/dashboard/study-resume", () => ({ getStudyResumeInfo: mocks.resume }));
vi.mock("@/lib/dashboard/japanese-study", () => ({ getJapaneseDashboardStudy: mocks.japanese }));
import { StudentDashboard } from "../student-dashboard";
const props = { userId: "student", learningLanguage: "JAPANESE" as const, onboardingHref: null, onboardingStep: null };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ name: "Student", learningLanguage: "JAPANESE", role: "STUDENT", accountStatus: "ACTIVE" });
  mocks.profile.mockResolvedValue({ placedLevel: "ADVANCED", placedSubLevel: 3, skippedOnboardingSteps: [] });
  mocks.quick.mockResolvedValue({ cards: [], dayKey: "today", learnedToday: 0, notYetToday: 0 });
  mocks.overview.mockResolvedValue(null); mocks.resume.mockResolvedValue(null); mocks.studied.mockResolvedValue(null);
  mocks.japanese.mockResolvedValue({ available: false });
  mocks.award.mockResolvedValue(null);
});

test("Japanese dashboard shows the saved award and its completion date independently of the English profile", async () => {
  const result = japanesePlacementResultFixture();
  mocks.award.mockResolvedValue({ id: result.attemptId, finishedAt: new Date(result.completedAt), result });
  const serialized = JSON.stringify((await StudentDashboard(props))?.props);
  expect(serialized).toContain("savedLevel");
  expect(serialized).toContain("N5");
  expect(serialized).toContain(result.completedAt);
  expect(serialized).not.toContain("ADVANCED");
});

test("Japanese draft dashboard uses current persisted intent and shows no English proficiency or invented study progress", async () => {
  const page = await StudentDashboard({ ...props, learningLanguage: "ENGLISH" });
  expect(mocks.quick).not.toHaveBeenCalled(); expect(mocks.overview).not.toHaveBeenCalled(); expect(mocks.resume).not.toHaveBeenCalled();
  expect(mocks.studied.mock.calls[0][0].where.level.track).toEqual({ learningLanguage: "JAPANESE", publicationStatus: "PUBLISHED" });
  expect(mocks.japanese).toHaveBeenCalledWith(expect.anything(), "student");
  expect(page?.props.title).toBe("japanese.dashboard");
  expect(JSON.stringify(page?.props)).not.toContain("ADVANCED");
  expect(JSON.stringify(page?.props)).toContain('"/learn/study"');
  expect(JSON.stringify(page?.props)).toContain("unavailableTitle");
  expect(page?.props.stats).toHaveLength(2);
});

test("Japanese published dashboard renders its own summary, rank, analytics and daily review", async () => {
  mocks.japanese.mockResolvedValue({ available: true,
    overview: { rpg: { rank: 2 }, levels: [{ levelCode: "N5", titleEn: "N5", titleJa: "N5", cardsTouched: 1, cardsTotal: 9, locked: false }] },
    resume: { levelCode: "N5", lastStudiedAt: new Date() }, trackPractice: { totalAttempts: 7 },
    quickReview: { dayKey: "2026-10-24", total: 5, answered: 1, correct: 1, wrong: 0, xp: 12 },
  });
  const page = await StudentDashboard(props);
  expect(page?.props.stats).toContainEqual({ label: "statRank", value: 2 });
  const serialized = JSON.stringify(page?.props);
  expect(serialized).toContain('"levelCode":"N5"');
  expect(serialized).toContain('"initialStatus"');
  expect(serialized).not.toContain("ADVANCED");
  expect(mocks.quick).not.toHaveBeenCalled();
});

test("persisted English intent retains English helpers and scopes onboarding study history", async () => {
  mocks.user.mockResolvedValue({ name: "Student", learningLanguage: "ENGLISH", role: "STUDENT", accountStatus: "ACTIVE" });
  const page = await StudentDashboard(props);
  expect(page?.props.title).toBe("english.dashboard");
  expect(mocks.japanese).not.toHaveBeenCalled();
  expect(mocks.quick).toHaveBeenCalledWith(expect.anything(), "student");
  expect(mocks.overview).toHaveBeenCalledWith(expect.anything(), "student", "english-flashcards");
  expect(mocks.studied.mock.calls[0][0].where.level.track).toEqual({ learningLanguage: "ENGLISH", publicationStatus: "PUBLISHED" });
});

test("inactive or removed accounts do not fetch either study system", async () => {
  for (const user of [null, { role: "STUDENT", accountStatus: "HIDDEN", learningLanguage: "JAPANESE" }]) {
    mocks.user.mockResolvedValue(user);
    expect(await StudentDashboard(props)).toBeNull();
  }
  expect(mocks.japanese).not.toHaveBeenCalled(); expect(mocks.quick).not.toHaveBeenCalled();
});
