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
    const res = await GET(getReq(), routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slots).toHaveLength(1);
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
