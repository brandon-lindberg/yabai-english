import { beforeEach, expect, test, vi } from "vitest";

const { authMock, readMock } = vi.hoisted(() => ({
  authMock: vi.fn(), readMock: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  studentProfile: { findUnique: readMock },
  studyAssessment: { findUnique: readMock },
} }));
vi.mock("@/lib/placement-bank/placement-bank-access", () => ({ getPlacementBankQuestions: readMock }));
vi.mock("@/lib/study/get-overview", () => ({ getStudyTrackOverview: readMock }));

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ user: { id: "student-1", role: "STUDENT", learningLanguage: "JAPANESE" } });
});

const routes = [
  ["placement", () => import("@/app/api/placement/route")],
  ["study/overview", () => import("@/app/api/study/overview/route")],
  ["study/queue", () => import("@/app/api/study/queue/route")],
  ["study/review", () => import("@/app/api/study/review/route")],
  ["study/assessment/[assessmentId]", () => import("@/app/api/study/assessment/[assessmentId]/route")],
  ["study/assessment/submit", () => import("@/app/api/study/assessment/submit/route")],
  ["study/quick-review/action", () => import("@/app/api/study/quick-review/action/route")],
] as const;

test.each(routes)("Japanese intent cannot read or write the English %s system", async (path, load) => {
  const handlers = await load();
  for (const [method, handler] of Object.entries(handlers)) {
    if ((method !== "GET" && method !== "POST") || typeof handler !== "function") continue;
    const response = await handler(
      new Request(`http://localhost/api/${path}`, { method, ...(method === "POST" ? { body: "{}", headers: { "Content-Type": "application/json" } } : {}) }),
      { params: Promise.resolve({ assessmentId: "english-assessment" }) },
    );
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: "LEARNING_LANGUAGE_MISMATCH" });
  }
  expect(readMock).not.toHaveBeenCalled();
});
