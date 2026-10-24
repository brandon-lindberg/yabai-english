import { beforeEach, expect, test, vi } from "vitest";

const { authMock, localeMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(), localeMock: vi.fn(),
  prismaMock: {
    teacherProfile: { findMany: vi.fn(), findUnique: vi.fn() },
    teacherRosterEntry: { findMany: vi.fn() },
    studentProfile: { findUnique: vi.fn() },
    booking: { findMany: vi.fn() },
  },
}));
vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-intl/server", () => ({ getLocale: localeMock, getTranslations: async () => (key: string) => key }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); }, useRouter: vi.fn(), usePathname: vi.fn(), useSearchParams: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({ Link: () => null, redirect: ({ href }: { href: string }) => { throw new Error(`REDIRECT:${href}`); } }));
vi.mock("@/lib/onboarding-gate", () => ({
  requireAuth: async () => (await authMock()).user,
  requireStudentOnboardingComplete: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  localeMock.mockResolvedValue("ja");
  authMock.mockResolvedValue({ user: { id: "s1", role: "STUDENT", learningLanguage: "JAPANESE" } });
  prismaMock.teacherProfile.findMany.mockResolvedValue([]);
  prismaMock.teacherProfile.findUnique.mockResolvedValue(null);
  prismaMock.teacherRosterEntry.findMany.mockResolvedValue([]);
  prismaMock.booking.findMany.mockResolvedValue([]);
  prismaMock.studentProfile.findUnique.mockResolvedValue({ timezone: "Asia/Tokyo", placementCompletedAt: null });
});

test.each(["ja", "en"])("directory keeps Japanese intent when UI locale is %s", async (locale) => {
  localeMock.mockResolvedValue(locale);
  const { default: BookPage } = await import("@/app/[locale]/book/page");
  await BookPage({ searchParams: Promise.resolve({}) });
  const query = prismaMock.teacherProfile.findMany.mock.calls[0][0];
  expect(query.where.AND).toContainEqual({ lessonOfferings: { some: { active: true, learningLanguage: "JAPANESE" } } });
  expect(query.select.availabilitySlots.where.AND).toEqual([
    { OR: [{ assignedStudentId: null }, { assignedStudentId: "s1" }] },
    { teacherLessonOffering: { is: { active: true, learningLanguage: "JAPANESE" } } },
  ]);
});

test("a direct teacher page also scopes subjects before returning any teacher data", async () => {
  const { default: TeacherPage } = await import("@/app/[locale]/book/teachers/[teacherId]/page");
  await expect(TeacherPage({ params: Promise.resolve({ teacherId: "english-only" }), searchParams: Promise.resolve({}) })).rejects.toThrow("NOT_FOUND");
  expect(prismaMock.teacherProfile.findUnique.mock.calls[0][0]).toMatchObject({
    where: { id: "english-only", AND: [{ lessonOfferings: { some: { active: true, learningLanguage: "JAPANESE" } } }] },
    select: { lessonOfferings: { where: { active: true, learningLanguage: "JAPANESE" } } },
  });
  expect(prismaMock.booking.findMany).not.toHaveBeenCalled();
});

test("Japanese intent cannot enter the English placement page", async () => {
  const { default: PlacementLayout } = await import("@/app/[locale]/placement/layout");
  await expect(PlacementLayout({ children: "English test" })).rejects.toThrow("REDIRECT:/book");
  expect(prismaMock.studentProfile.findUnique).not.toHaveBeenCalled();
});

test("the shared study layout allows Japanese intent; individual pages enforce subject access", async () => {
  const { default: StudyLayout } = await import("@/app/[locale]/learn/study/layout");
  expect(await StudyLayout({ children: "Subject-scoped study" })).toBe("Subject-scoped study");
});

test("English learners retain the English placement and study pages", async () => {
  authMock.mockResolvedValue({ user: { id: "s1", role: "STUDENT", learningLanguage: "ENGLISH" } });
  const { default: PlacementLayout } = await import("@/app/[locale]/placement/layout");
  const { default: StudyLayout } = await import("@/app/[locale]/learn/study/layout");
  expect(await PlacementLayout({ children: "English test" })).toBe("English test");
  expect(await StudyLayout({ children: "English cards" })).toBe("English cards");
});
