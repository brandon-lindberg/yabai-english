import { beforeEach, expect, test, vi } from "vitest";
import { JapaneseStudyFailure } from "@/lib/study/japanese-service";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(), actor: vi.fn(), jp: vi.fn(), english: vi.fn(), track: vi.fn(), level: vi.fn(), access: vi.fn(), rpg: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: mocks.actor }, studyTrack: { findUnique: mocks.track }, studyLevel: { findUnique: mocks.level } } }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "en", getTranslations: async () => (key: string) => key }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/i18n/navigation", () => ({ Link: () => null, redirect: ({ href }: { href: string }) => { throw new Error(`REDIRECT:${href}`); } }));
vi.mock("@/lib/study/japanese-service", async original => ({ ...await original<typeof import("@/lib/study/japanese-service")>(), getJapaneseStudyOverview: mocks.jp }));
vi.mock("@/lib/study/get-overview", () => ({ getStudyTrackOverview: mocks.english, getStudyRpgSnapshot: mocks.rpg }));
vi.mock("@/lib/study/access", () => ({ isStudyLevelUnlocked: mocks.access }));
import Hub from "@/app/[locale]/learn/study/page";
import Practice from "@/app/[locale]/learn/study/[levelCode]/practice/page";
import Assessment from "@/app/[locale]/learn/study/[levelCode]/assessment/page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "student", learningLanguage: "ENGLISH" } });
  mocks.actor.mockResolvedValue({ id: "student", role: "STUDENT", accountStatus: "ACTIVE", learningLanguage: "JAPANESE" });
  mocks.jp.mockResolvedValue({ available: true, unlocked: ["N5"], completed: [], levels: [{ id: "jp-n5", code: "N5", unlocked: true, mastery: { mastered: 0, total: 9 }, practice: { newCount: 9, weakCount: 0, masteredCount: 0 }, xp: 0 }] });
});
const props = (levelCode: string, searchParams = {}) => ({ params: Promise.resolve({ levelCode }), searchParams: Promise.resolve(searchParams) });

test("the shared hub uses fresh Japanese intent and never reads English progress", async () => {
  const page = await Hub({ searchParams: Promise.resolve({}) });
  expect(mocks.jp).toHaveBeenCalledWith(expect.anything(), "student");
  expect(mocks.english).not.toHaveBeenCalled();
  expect(JSON.stringify(page)).toContain("jp-n5");
});

test("draft Japanese hub and practice render a recoverable preparation state", async () => {
  mocks.jp.mockRejectedValue(new JapaneseStudyFailure(503, "STUDY_UNAVAILABLE"));
  expect(JSON.stringify(await Hub({ searchParams: Promise.resolve({}) }))).toContain("unavailableIntro");
  expect(JSON.stringify(await Practice(props("N5")))).toContain("unavailable");
  expect(mocks.track).not.toHaveBeenCalled();
});

test("Japanese practice accepts only Japanese level and filter values and guards locked access", async () => {
  const page = await Practice(props("N5", { focus: "weak", kind: "kanji" }));
  expect(JSON.stringify(page)).toContain('"kind":"kanji"');
  expect(JSON.stringify(page)).toContain('"queueFocus":"weak"');
  await expect(Practice(props("BEGINNER_1"))).rejects.toThrow("NOT_FOUND");
  await expect(Practice(props("N3"))).rejects.toThrow("REDIRECT:/learn/study");
  await expect(Assessment(props("N5"))).rejects.toThrow("REDIRECT:/learn/study");
  expect(mocks.track).not.toHaveBeenCalled();
});

test("English learners retain English practice, hub data and exit assessments", async () => {
  mocks.actor.mockResolvedValue({ id: "student", role: "STUDENT", accountStatus: "ACTIVE", learningLanguage: "ENGLISH" });
  mocks.english.mockResolvedValue({ rpg: { rank: 1, xpIntoRank: 0, xpForNextRank: 280, progressPercent: 0 }, levels: [] });
  mocks.track.mockResolvedValue({ id: "english" }); mocks.access.mockResolvedValue(true);
  mocks.level.mockResolvedValue({ titleEn: "Beginner 1", titleJa: "初級1", assessments: [{ id: "english-exit" }] });
  mocks.rpg.mockResolvedValue({ rank: 1, xpIntoRank: 0, xpForNextRank: 280, progressPercent: 0 });
  await Hub({ searchParams: Promise.resolve({}) });
  await Practice(props("BEGINNER_1"));
  expect(JSON.stringify(await Assessment(props("BEGINNER_1")))).toContain("english-exit");
  await expect(Practice(props("N5"))).rejects.toThrow("NOT_FOUND");
  expect(mocks.jp).not.toHaveBeenCalled();
  expect(mocks.english).toHaveBeenCalledWith(expect.anything(), "student", "english-flashcards");
});

test("missing and inactive accounts cannot render either subject", async () => {
  mocks.actor.mockResolvedValue(null);
  await expect(Hub({ searchParams: Promise.resolve({}) })).rejects.toThrow("NOT_FOUND");
  mocks.actor.mockResolvedValue({ id: "student", role: "STUDENT", accountStatus: "HIDDEN", learningLanguage: "JAPANESE" });
  await expect(Practice(props("N5"))).rejects.toThrow("NOT_FOUND");
  expect(mocks.jp).not.toHaveBeenCalled();
  expect(mocks.english).not.toHaveBeenCalled();
});
