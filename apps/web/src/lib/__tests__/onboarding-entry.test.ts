import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), student: vi.fn(), teacher: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: { studentProfile: { findUnique: mocks.student }, teacherProfile: { findUnique: mocks.teacher } } }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "en" }));
vi.mock("@/i18n/navigation", () => ({ redirect: ({ href }: { href: string }) => { throw new Error(`REDIRECT:${href}`); } }));
vi.mock("@/components/dashboard/dashboard-sub-nav", () => ({ DashboardSubNav: () => null }));
vi.mock("@/components/dashboard/teacher-dashboard", () => ({ TeacherDashboard: () => null }));
vi.mock("@/components/dashboard/student-dashboard", () => ({ StudentDashboard: () => null }));
import DashboardLayout from "@/app/[locale]/dashboard/layout";
import DashboardPage from "@/app/[locale]/dashboard/page";
import LearnLayout from "@/app/[locale]/learn/layout";
import { requireRoleOnboardingComplete } from "../onboarding-gate";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "teacher", role: "TEACHER", learningLanguage: "ENGLISH" } });
  mocks.teacher.mockResolvedValue({ onboardingCompletedAt: null });
  mocks.student.mockResolvedValue(null);
});

test("teacher setup destinations are accessible before finishing onboarding", async () => {
  const layout = await DashboardLayout({ children: "profile or settings or availability" });
  expect(layout.props.children).toContain("profile or settings or availability");
  expect(mocks.teacher).not.toHaveBeenCalled();
});

test("teachers can explore eligible materials without completing or skipping the whole checklist", async () => {
  await expect(LearnLayout({ children: "materials" })).resolves.not.toBeNull();
  expect(mocks.teacher).not.toHaveBeenCalled();
});

test("a fresh teacher still starts at onboarding from the regular dashboard", async () => {
  await expect(DashboardPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("REDIRECT:/onboarding/teacher");
});

test("teacher checklist can open the dashboard's student/chat steps and return", async () => {
  const page = await DashboardPage({ searchParams: Promise.resolve({ onboardingNext: "/onboarding/teacher?completed=chat", onboardingStep: "chat" }) });
  expect(page?.props.onboardingHref).toBe("/onboarding/teacher?completed=chat");
  expect(mocks.teacher).not.toHaveBeenCalled();
});

test("a different return path does not bypass initial teacher onboarding", async () => {
  await expect(DashboardPage({ searchParams: Promise.resolve({ onboardingNext: "/dashboard", onboardingStep: "chat" }) })).rejects.toThrow("REDIRECT:/onboarding/teacher");
});

test.each(["ENGLISH", "JAPANESE"])("fresh %s students still require the shared wizard", async learningLanguage => {
  mocks.auth.mockResolvedValue({ user: { id: "student", role: "STUDENT", learningLanguage } });
  await expect(DashboardLayout({ children: "dashboard" })).rejects.toThrow("REDIRECT:/onboarding");
});

test("completed teacher accounts keep dashboard access", async () => {
  mocks.teacher.mockResolvedValue({ onboardingCompletedAt: new Date() });
  await expect(requireRoleOnboardingComplete("en")).resolves.toMatchObject({ id: "teacher" });
  await expect(DashboardPage({ searchParams: Promise.resolve({}) })).resolves.not.toBeNull();
});
