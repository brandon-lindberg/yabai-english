import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    organizationMembership: {
      findFirst: vi.fn(),
    },
    schoolScheduleSlot: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    schoolClassEnrollment: {
      findMany: vi.fn(),
    },
    schoolClassLevel: {
      findUnique: vi.fn(),
    },
    schoolClassType: {
      findUnique: vi.fn(),
    },
    school: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET, POST } from "@/app/api/org/[orgId]/schools/[schoolId]/schedule/route";

const orgId = "org-1";
const schoolId = "school-1";
const routeCtx = { params: Promise.resolve({ orgId, schoolId }) };

function getReq() {
  return new Request(
    `http://localhost/api/org/${orgId}/schools/${schoolId}/schedule`,
  );
}

function postReq(body: unknown) {
  return new Request(
    `http://localhost/api/org/${orgId}/schools/${schoolId}/schedule`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe("GET /api/org/[orgId]/schools/[schoolId]/schedule", () => {
  beforeEach(() => vi.clearAllMocks());

  test("401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const res = await GET(getReq(), routeCtx);
    expect(res.status).toBe(401);
  });

  test("403 when user has no membership", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "STUDENT" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue(null);
    const res = await GET(getReq(), routeCtx);
    expect(res.status).toBe(403);
  });

  test("200 returns schedule slots for any member", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "STUDENT" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1",
      orgRole: "STUDENT",
      status: "ACTIVE",
      schoolId,
      organizationId: orgId,
      userId: "u1",
    });
    const slots = [
      {
        id: "slot-1",
        dayOfWeek: 1,
        startMin: 540,
        endMin: 600,
        lessonLevel: "beginner",
        lessonType: "conversation",
        capacity: 5,
        active: true,
        _count: { enrollments: 3 },
      },
    ];
    prismaMock.schoolScheduleSlot.findMany.mockResolvedValue(slots);
    prismaMock.schoolClassEnrollment.findMany.mockResolvedValue([
      { scheduleSlotId: "slot-1" },
    ]);
    const res = await GET(getReq(), routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slots).toHaveLength(1);
    expect(body.viewerEnrolledSlotIds).toEqual(["slot-1"]);
  });
});

describe("POST /api/org/[orgId]/schools/[schoolId]/schedule", () => {
  beforeEach(() => vi.clearAllMocks());

  test("403 when user is TEACHER (not admin)", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "STUDENT" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1",
      orgRole: "TEACHER",
      status: "ACTIVE",
      schoolId,
      organizationId: orgId,
      userId: "u1",
    });
    const res = await POST(
      postReq({
        dayOfWeek: 1,
        startMin: 540,
        endMin: 600,
        durationMin: 60,
        lessonLevel: "beginner",
        lessonType: "conversation",
        capacity: 5,
      }),
      routeCtx,
    );
    expect(res.status).toBe(403);
  });

  test("201 creates slot for SCHOOL_ADMIN", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "STUDENT" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1",
      orgRole: "SCHOOL_ADMIN",
      status: "ACTIVE",
      schoolId,
      organizationId: orgId,
      userId: "u1",
    });
    prismaMock.school.findUnique.mockResolvedValue({
      id: schoolId,
      timezone: "Asia/Tokyo",
      organization: { timezone: "Asia/Tokyo" },
    });
    const created = {
      id: "slot-1",
      dayOfWeek: 1,
      startMin: 540,
      endMin: 600,
      durationMin: 60,
      lessonLevel: "beginner",
      lessonType: "conversation",
      capacity: 5,
    };
    prismaMock.schoolScheduleSlot.create.mockResolvedValue(created);

    const res = await POST(
      postReq({
        dayOfWeek: 1,
        startMin: 540,
        endMin: 600,
        durationMin: 60,
        lessonLevel: "beginner",
        lessonType: "conversation",
        capacity: 5,
      }),
      routeCtx,
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.slot.lessonLevel).toBe("beginner");
  });

  test("400 when classLevelId belongs to a different school", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "STUDENT" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1",
      orgRole: "SCHOOL_ADMIN",
      status: "ACTIVE",
      schoolId,
      organizationId: orgId,
      userId: "u1",
    });
    prismaMock.schoolClassLevel.findUnique.mockResolvedValue({
      id: "lvl-foreign",
      schoolId: "school-other",
    });
    const res = await POST(
      postReq({
        dayOfWeek: 1,
        startMin: 540,
        endMin: 600,
        durationMin: 60,
        lessonLevel: "beginner",
        lessonType: "conversation",
        capacity: 5,
        classLevelId: "lvl-foreign",
      }),
      routeCtx,
    );
    expect(res.status).toBe(400);
  });

  test("400 when classTypeId belongs to a different school", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "STUDENT" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1",
      orgRole: "SCHOOL_ADMIN",
      status: "ACTIVE",
      schoolId,
      organizationId: orgId,
      userId: "u1",
    });
    prismaMock.schoolClassType.findUnique.mockResolvedValue({
      id: "type-foreign",
      schoolId: "school-other",
    });
    const res = await POST(
      postReq({
        dayOfWeek: 1,
        startMin: 540,
        endMin: 600,
        durationMin: 60,
        lessonLevel: "beginner",
        lessonType: "conversation",
        capacity: 5,
        classTypeId: "type-foreign",
      }),
      routeCtx,
    );
    expect(res.status).toBe(400);
  });

  test("201 persists classLevelId/classTypeId when they belong to the school", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "STUDENT" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1",
      orgRole: "SCHOOL_ADMIN",
      status: "ACTIVE",
      schoolId,
      organizationId: orgId,
      userId: "u1",
    });
    prismaMock.school.findUnique.mockResolvedValue({
      id: schoolId,
      timezone: "Asia/Tokyo",
      organization: { timezone: "Asia/Tokyo" },
    });
    prismaMock.schoolClassLevel.findUnique.mockResolvedValue({
      id: "lvl-1",
      schoolId,
    });
    prismaMock.schoolClassType.findUnique.mockResolvedValue({
      id: "type-1",
      schoolId,
    });
    prismaMock.schoolScheduleSlot.create.mockResolvedValue({
      id: "slot-1",
      classLevelId: "lvl-1",
      classTypeId: "type-1",
    });

    const res = await POST(
      postReq({
        dayOfWeek: 1,
        startMin: 540,
        endMin: 600,
        durationMin: 60,
        lessonLevel: "beginner",
        lessonType: "conversation",
        capacity: 5,
        classLevelId: "lvl-1",
        classTypeId: "type-1",
      }),
      routeCtx,
    );
    expect(res.status).toBe(201);
    expect(prismaMock.schoolScheduleSlot.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        classLevelId: "lvl-1",
        classTypeId: "type-1",
      }),
    });
  });

  test("201 persists recurrence/daysOfWeek/startsOn/endsOn for WEEKLY multi-day", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1",
      orgRole: "SCHOOL_ADMIN",
      status: "ACTIVE",
      schoolId,
      organizationId: orgId,
      userId: "u1",
    });
    prismaMock.school.findUnique.mockResolvedValue({
      id: schoolId,
      timezone: "Asia/Tokyo",
      organization: { timezone: "Asia/Tokyo" },
    });
    prismaMock.schoolScheduleSlot.create.mockResolvedValue({ id: "slot-1" });

    const res = await POST(
      postReq({
        dayOfWeek: 1,
        startMin: 540,
        endMin: 600,
        durationMin: 60,
        lessonLevel: "beginner",
        lessonType: "conversation",
        capacity: 5,
        recurrence: "WEEKLY",
        daysOfWeek: [1, 3, 5],
        startsOn: "2026-04-27",
        endsOn: "2026-06-30",
      }),
      routeCtx,
    );
    expect(res.status).toBe(201);
    expect(prismaMock.schoolScheduleSlot.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        recurrence: "WEEKLY",
        daysOfWeek: [1, 3, 5],
        startsOn: expect.any(Date),
        endsOn: expect.any(Date),
      }),
    });
  });

  test("201 persists ONE_OFF with startsOn", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1",
      orgRole: "SCHOOL_ADMIN",
      status: "ACTIVE",
      schoolId,
      organizationId: orgId,
      userId: "u1",
    });
    prismaMock.school.findUnique.mockResolvedValue({
      id: schoolId,
      timezone: "Asia/Tokyo",
      organization: { timezone: "Asia/Tokyo" },
    });
    prismaMock.schoolScheduleSlot.create.mockResolvedValue({ id: "slot-1" });

    const res = await POST(
      postReq({
        dayOfWeek: 0,
        startMin: 540,
        endMin: 600,
        durationMin: 60,
        lessonLevel: "beginner",
        lessonType: "conversation",
        capacity: 1,
        recurrence: "ONE_OFF",
        startsOn: "2026-05-15",
      }),
      routeCtx,
    );
    expect(res.status).toBe(201);
    expect(prismaMock.schoolScheduleSlot.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        recurrence: "ONE_OFF",
        startsOn: expect.any(Date),
      }),
    });
  });

  test("400 when ONE_OFF without startsOn", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1",
      orgRole: "SCHOOL_ADMIN",
      status: "ACTIVE",
      schoolId,
      organizationId: orgId,
      userId: "u1",
    });
    const res = await POST(
      postReq({
        dayOfWeek: 0,
        startMin: 540,
        endMin: 600,
        durationMin: 60,
        lessonLevel: "beginner",
        lessonType: "conversation",
        capacity: 1,
        recurrence: "ONE_OFF",
      }),
      routeCtx,
    );
    expect(res.status).toBe(400);
  });

  test("400 with invalid slot times", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "STUDENT" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1",
      orgRole: "OWNER",
      status: "ACTIVE",
      schoolId: null,
      organizationId: orgId,
      userId: "u1",
    });
    const res = await POST(
      postReq({
        dayOfWeek: 8, // invalid
        startMin: 540,
        endMin: 600,
        durationMin: 60,
        lessonLevel: "beginner",
        lessonType: "conversation",
        capacity: 5,
      }),
      routeCtx,
    );
    expect(res.status).toBe(400);
  });
});
