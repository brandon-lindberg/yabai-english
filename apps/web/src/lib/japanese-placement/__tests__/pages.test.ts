import { beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), onboard: vi.fn(), result: vi.fn() }));
vi.mock("@/lib/onboarding-gate", () => ({ requireAuth: mocks.user, requireStudentOnboardingComplete: mocks.onboard }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "en", getTranslations: async () => (key: string) => key }));
vi.mock("@/i18n/navigation", () => ({ redirect: ({ href }: { href: string }) => { throw new Error(`REDIRECT:${href}`); } }));
vi.mock("../service", async (original) => ({ ...await original<typeof import("../service")>(), getTeacherJapaneseResult: mocks.result }));
import JapaneseLayout from "@/app/[locale]/japanese-placement/layout";
import { TeacherJapanesePlacement } from "@/components/japanese-placement/teacher-result";
import { JapanesePlacementFailure } from "../service";

beforeEach(() => { vi.clearAllMocks(); mocks.user.mockResolvedValue({ id: "student", role: "STUDENT", learningLanguage: "JAPANESE" }); });
test("Japanese assessment requires the Japanese student journey and completed onboarding", async () => {
  expect(await JapaneseLayout({ children: "Japanese questions" })).toBe("Japanese questions");
  expect(mocks.onboard).toHaveBeenCalledWith("en", expect.objectContaining({ id: "student" }));
});
test.each([{ role: "STUDENT", learningLanguage: "ENGLISH" }, { role: "TEACHER", learningLanguage: "JAPANESE" }])("redirects wrong subject/role %j before serving the Japanese surface", async (user) => {
  mocks.user.mockResolvedValue({ id: "other", ...user });
  await expect(JapaneseLayout({ children: "Japanese questions" })).rejects.toThrow("REDIRECT:/dashboard");
  expect(mocks.onboard).not.toHaveBeenCalled();
});
test("teacher presentation delegates access and hides results from ineligible relationships", async () => {
  mocks.result.mockRejectedValue(new JapanesePlacementFailure(404, "RESULT_NOT_FOUND"));
  expect(await TeacherJapanesePlacement({ teacherUserId: "teacher", studentId: "student" })).toBeNull();
  expect(mocks.result).toHaveBeenCalledWith({}, "teacher", "student");
});
test("an eligible teacher sees an honest no-completed-assessment state", async () => {
  mocks.result.mockResolvedValue({ result: null });
  expect(JSON.stringify(await TeacherJapanesePlacement({ teacherUserId: "teacher", studentId: "student" }))).toContain("teacherEmpty");
});
