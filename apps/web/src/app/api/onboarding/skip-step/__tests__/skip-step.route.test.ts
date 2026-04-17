import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, studentUpdateMock, teacherUpdateMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  studentUpdateMock: vi.fn(),
  teacherUpdateMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    studentProfile: {
      update: studentUpdateMock,
    },
    teacherProfile: {
      update: teacherUpdateMock,
    },
  },
}));

import { POST } from "@/app/api/onboarding/skip-step/route";

function makeReq(body: unknown) {
  return new Request("http://localhost/api/onboarding/skip-step", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/onboarding/skip-step", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const res = await POST(makeReq({ step: "integrations" }));
    expect(res.status).toBe(401);
    expect(studentUpdateMock).not.toHaveBeenCalled();
    expect(teacherUpdateMock).not.toHaveBeenCalled();
  });

  test("returns 400 when step is missing or invalid", async () => {
    authMock.mockResolvedValue({ user: { id: "s1", role: "STUDENT" } });
    const resEmpty = await POST(makeReq({}));
    expect(resEmpty.status).toBe(400);

    const resEmptyStr = await POST(makeReq({ step: "" }));
    expect(resEmptyStr.status).toBe(400);

    expect(studentUpdateMock).not.toHaveBeenCalled();
  });

  test("student skip appends step to StudentProfile.skippedOnboardingSteps", async () => {
    authMock.mockResolvedValue({ user: { id: "s1", role: "STUDENT" } });
    studentUpdateMock.mockResolvedValue({ id: "sp-1" });

    const res = await POST(makeReq({ step: "integrations" }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(studentUpdateMock).toHaveBeenCalledWith({
      where: { userId: "s1" },
      data: {
        skippedOnboardingSteps: { push: "integrations" },
      },
    });
    expect(teacherUpdateMock).not.toHaveBeenCalled();
  });

  test("teacher skip appends step to TeacherProfile.skippedOnboardingSteps", async () => {
    authMock.mockResolvedValue({ user: { id: "t1", role: "TEACHER" } });
    teacherUpdateMock.mockResolvedValue({ id: "tp-1" });

    const res = await POST(makeReq({ step: "materials" }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(teacherUpdateMock).toHaveBeenCalledWith({
      where: { userId: "t1" },
      data: {
        skippedOnboardingSteps: { push: "materials" },
      },
    });
    expect(studentUpdateMock).not.toHaveBeenCalled();
  });

  test("admin-only roles get 403", async () => {
    authMock.mockResolvedValue({ user: { id: "a1", role: "ADMIN" } });
    const res = await POST(makeReq({ step: "integrations" }));
    expect(res.status).toBe(403);
    expect(studentUpdateMock).not.toHaveBeenCalled();
    expect(teacherUpdateMock).not.toHaveBeenCalled();
  });
});
