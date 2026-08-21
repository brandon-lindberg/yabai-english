import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  authMock,
  teacherFindFirstMock,
  levelFindFirstMock,
  typeFindFirstMock,
  createMock,
  levelFindManyMock,
  typeFindManyMock,
  offeringFindManyMock,
} =
  vi.hoisted(() => ({
    authMock: vi.fn(),
    teacherFindFirstMock: vi.fn(),
    levelFindFirstMock: vi.fn(),
    typeFindFirstMock: vi.fn(),
    createMock: vi.fn(),
    levelFindManyMock: vi.fn(),
    typeFindManyMock: vi.fn(),
    offeringFindManyMock: vi.fn(),
  }));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    teacherProfile: { findFirst: teacherFindFirstMock },
    teacherClassLevel: { findFirst: levelFindFirstMock, findMany: levelFindManyMock },
    teacherClassType: { findFirst: typeFindFirstMock, findMany: typeFindManyMock },
    teacherLessonOffering: { create: createMock, findMany: offeringFindManyMock },
  },
}));

import { GET, POST } from "@/app/api/admin/teacher-offerings/route";

function request(body: Record<string, unknown>) {
  return new Request("http://localhost/api/admin/teacher-offerings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  teacherId: "tp-1",
  durationMin: 30,
  rateYen: 1500,
  classLevelId: "lv-1",
  classTypeId: "ty-1",
};

describe("POST /api/admin/teacher-offerings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "SUPER_ADMIN" } });
    teacherFindFirstMock.mockResolvedValue({ id: "tp-1" });
    levelFindFirstMock.mockResolvedValue({ id: "lv-1" });
    typeFindFirstMock.mockResolvedValue({ id: "ty-1" });
    createMock.mockResolvedValue({ id: "offer-1" });
  });

  test("grants a below-minimum class and records who allowed it", async () => {
    const res = await POST(request(validBody));

    expect(res.status).toBe(200);
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        teacherId: "tp-1",
        durationMin: 30,
        rateYen: 1500,
        classLevelId: "lv-1",
        classTypeId: "ty-1",
        isGroup: false,
        active: true,
        // The stamp is what exempts it from the minimum and marks it as one the
        // teacher may teach but not edit.
        adminRateOverrideByUserId: "admin-1",
      }),
    });
  });

  test.each([
    ["TEACHER", 403],
    ["STUDENT", 403],
  ])("refuses a %s", async (role, expected) => {
    authMock.mockResolvedValue({ user: { id: "u-1", role } });

    const res = await POST(request(validBody));

    expect(res.status).toBe(expected);
    expect(createMock).not.toHaveBeenCalled();
  });

  test("refuses an anonymous caller", async () => {
    authMock.mockResolvedValue(null);

    expect((await POST(request(validBody))).status).toBe(401);
    expect(createMock).not.toHaveBeenCalled();
  });

  test("refuses a taxonomy that is not this teacher's", async () => {
    levelFindFirstMock.mockResolvedValue(null);

    const res = await POST(request(validBody));

    expect(res.status).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });

  test("refuses an unknown teacher", async () => {
    teacherFindFirstMock.mockResolvedValue(null);

    expect((await POST(request(validBody))).status).toBe(404);
    expect(createMock).not.toHaveBeenCalled();
  });

  // The whole point is a rate below the minimum. At or above it, the teacher can
  // create the class themselves and should — no concession is needed.
  test("refuses a rate that needs no exemption", async () => {
    const res = await POST(request({ ...validBody, rateYen: 5000 }));

    expect(res.status).toBe(400);
    expect((await res.json()).reason).toBe("NO_EXEMPTION_NEEDED");
    expect(createMock).not.toHaveBeenCalled();
  });

  test("refuses a free rate, which is what the trial is for", async () => {
    const res = await POST(request({ ...validBody, rateYen: 0 }));

    expect(res.status).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/teacher-offerings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "SUPER_ADMIN" } });
    teacherFindFirstMock.mockResolvedValue({ id: "tp-1" });
    levelFindManyMock.mockResolvedValue([{ id: "lv-1", labelEn: "Beginner", labelJa: "初級" }]);
    typeFindManyMock.mockResolvedValue([{ id: "ty-1", labelEn: "Conversation", labelJa: "会話" }]);
    offeringFindManyMock.mockResolvedValue([
      { id: "offer-1", durationMin: 30, rateYen: 1500, adminRateOverrideByUserId: "admin-1" },
    ]);
  });

  function get(qs: string) {
    return GET(new Request(`http://localhost/api/admin/teacher-offerings${qs}`));
  }

  test("returns the teacher's own taxonomy to grant against", async () => {
    const res = await get("?teacherId=tp-1");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.classLevels).toEqual([
      { id: "lv-1", labelEn: "Beginner", labelJa: "初級" },
    ]);
    expect(body.classTypes[0].id).toBe("ty-1");
  });

  // Only grants, not the teacher's own priced classes — this screen is about
  // concessions, and listing everything would invite editing what is not ours.
  test("lists only classes granted by an admin", async () => {
    await get("?teacherId=tp-1");

    expect(offeringFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          teacherId: "tp-1",
          adminRateOverrideByUserId: { not: null },
        }),
      }),
    );
  });

  test("refuses a non-admin", async () => {
    authMock.mockResolvedValue({ user: { id: "t-1", role: "TEACHER" } });
    expect((await get("?teacherId=tp-1")).status).toBe(403);
  });

  test("requires a teacher to look at", async () => {
    expect((await get("")).status).toBe(400);
  });

  test("404s for an unknown teacher", async () => {
    teacherFindFirstMock.mockResolvedValue(null);
    expect((await get("?teacherId=nope")).status).toBe(404);
  });
});
