import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, studentUpdateMock, teacherUpdateMock, studentFindMock, teacherFindMock } =
  vi.hoisted(() => ({
    authMock: vi.fn(),
    studentUpdateMock: vi.fn(),
    teacherUpdateMock: vi.fn(),
    studentFindMock: vi.fn(),
    teacherFindMock: vi.fn(),
  }));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    studentProfile: {
      update: studentUpdateMock,
      findUnique: studentFindMock,
    },
    teacherProfile: {
      update: teacherUpdateMock,
      findUnique: teacherFindMock,
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
    studentFindMock.mockResolvedValue({ skippedOnboardingSteps: [] });
    studentUpdateMock.mockResolvedValue({ id: "sp-1" });

    const res = await POST(makeReq({ step: "integrations" }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(studentUpdateMock).toHaveBeenCalledWith({
      where: { userId: "s1" },
      data: {
        skippedOnboardingSteps: { set: ["integrations"] },
      },
    });
    expect(teacherUpdateMock).not.toHaveBeenCalled();
  });

  test("teacher skip appends step to TeacherProfile.skippedOnboardingSteps", async () => {
    authMock.mockResolvedValue({ user: { id: "t1", role: "TEACHER" } });
    teacherFindMock.mockResolvedValue({ skippedOnboardingSteps: [] });
    teacherUpdateMock.mockResolvedValue({ id: "tp-1" });

    const res = await POST(makeReq({ step: "materials" }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(teacherUpdateMock).toHaveBeenCalledWith({
      where: { userId: "t1" },
      data: {
        skippedOnboardingSteps: { set: ["materials"] },
      },
    });
    expect(studentUpdateMock).not.toHaveBeenCalled();
  });

  test("admin-only roles get 403", async () => {
    authMock.mockResolvedValue({ user: { id: "a1", role: "SUPER_ADMIN" } });
    const res = await POST(makeReq({ step: "integrations" }));
    expect(res.status).toBe(403);
    expect(studentUpdateMock).not.toHaveBeenCalled();
    expect(teacherUpdateMock).not.toHaveBeenCalled();
  });
});

describe("recording a step the teacher ticked themselves", () => {
  /*
    Teacher onboarding is self-reported: the checkbox is the record. Skipping a
    step was written to the profile, but ticking one was only ever component
    state — so a language switch, or opening a step and coming back, silently
    reset the boxes. The two halves of the same gesture have to persist alike.
  */
  beforeEach(() => {
    authMock.mockReset();
    teacherUpdateMock.mockReset();
    teacherFindMock.mockReset();
    authMock.mockResolvedValue({ user: { id: "t-1", role: "TEACHER" } });
    teacherFindMock.mockResolvedValue({ skippedOnboardingSteps: [] });
  });

  test("a ticked step is written to the profile", async () => {
    const res = await POST(makeReq({ step: "profile", done: true }));

    expect(res.status).toBe(200);
    expect(teacherUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { skippedOnboardingSteps: { set: ["profile"] } },
      }),
    );
  });

  test("unticking removes it again", async () => {
    // The checkbox is a toggle, so the record has to come off as well as on.
    teacherFindMock.mockResolvedValue({ skippedOnboardingSteps: ["profile", "chat"] });

    await POST(makeReq({ step: "profile", done: false }));

    expect(teacherUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { skippedOnboardingSteps: { set: ["chat"] } },
      }),
    );
  });

  test("ticking twice does not record it twice", async () => {
    // The old `push` would grow the array on every toggle cycle.
    teacherFindMock.mockResolvedValue({ skippedOnboardingSteps: ["profile"] });

    await POST(makeReq({ step: "profile", done: true }));

    expect(teacherUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { skippedOnboardingSteps: { set: ["profile"] } },
      }),
    );
  });
});

