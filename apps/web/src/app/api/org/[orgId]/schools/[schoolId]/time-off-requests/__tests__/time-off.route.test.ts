import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock, notifyAdminsMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    organizationMembership: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    timeOffRequest: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    school: {
      findUnique: vi.fn(),
    },
  },
  notifyAdminsMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/school-admin-notify", () => ({
  notifySchoolAdmins: notifyAdminsMock,
}));

import { GET, POST } from "@/app/api/org/[orgId]/schools/[schoolId]/time-off-requests/route";

const orgId = "org-1";
const schoolId = "school-1";
const routeCtx = { params: Promise.resolve({ orgId, schoolId }) };

const DAY_MS = 86_400_000;
const futureStartIso = new Date(Date.now() + 7 * DAY_MS).toISOString();
const futureEndIso = new Date(Date.now() + 9 * DAY_MS).toISOString();

function postReq(body: unknown) {
  return new Request(
    `http://localhost/api/org/${orgId}/schools/${schoolId}/time-off-requests`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

function getReq(params?: string) {
  return new Request(
    `http://localhost/api/org/${orgId}/schools/${schoolId}/time-off-requests${params ? `?${params}` : ""}`,
  );
}

describe("POST /api/org/[orgId]/schools/[schoolId]/time-off-requests", () => {
  beforeEach(() => vi.clearAllMocks());

  test("401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const res = await POST(
      postReq({
        startDate: futureStartIso,
        endDate: futureEndIso,
      }),
      routeCtx,
    );
    expect(res.status).toBe(401);
  });

  test("403 when user is not a TEACHER", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "STUDENT" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1",
      orgRole: "STUDENT",
      status: "ACTIVE",
      schoolId,
      organizationId: orgId,
      userId: "u1",
    });
    const res = await POST(
      postReq({
        startDate: futureStartIso,
        endDate: futureEndIso,
      }),
      routeCtx,
    );
    expect(res.status).toBe(403);
  });

  test("201 creates time-off request for TEACHER", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "STUDENT" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1",
      orgRole: "TEACHER",
      status: "ACTIVE",
      schoolId,
      organizationId: orgId,
      userId: "u1",
    });
    const created = {
      id: "req-1",
      status: "PENDING",
      startDate: new Date(futureStartIso),
      endDate: new Date(futureEndIso),
    };
    prismaMock.timeOffRequest.create.mockResolvedValue(created);
    prismaMock.school.findUnique.mockResolvedValue({ name: "Shibuya" });

    const res = await POST(
      postReq({
        startDate: futureStartIso,
        endDate: futureEndIso,
        reason: "Family trip",
      }),
      routeCtx,
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.request.status).toBe("PENDING");
    expect(notifyAdminsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: orgId,
        schoolId,
        excludeUserId: "u1",
      }),
    );
  });
});

describe("GET /api/org/[orgId]/schools/[schoolId]/time-off-requests", () => {
  beforeEach(() => vi.clearAllMocks());

  test("200 returns requests for SCHOOL_ADMIN", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "STUDENT" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1",
      orgRole: "SCHOOL_ADMIN",
      status: "ACTIVE",
      schoolId,
      organizationId: orgId,
      userId: "u1",
    });
    prismaMock.timeOffRequest.findMany.mockResolvedValue([
      {
        id: "req-1",
        status: "PENDING",
        teacherMembership: { user: { name: "Teacher" } },
      },
    ]);

    const res = await GET(getReq(), routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.requests).toHaveLength(1);
  });

  test("200 returns own requests for TEACHER", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "STUDENT" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1",
      orgRole: "TEACHER",
      status: "ACTIVE",
      schoolId,
      organizationId: orgId,
      userId: "u1",
    });
    prismaMock.timeOffRequest.findMany.mockResolvedValue([]);

    const res = await GET(getReq(), routeCtx);
    expect(res.status).toBe(200);
  });
});
