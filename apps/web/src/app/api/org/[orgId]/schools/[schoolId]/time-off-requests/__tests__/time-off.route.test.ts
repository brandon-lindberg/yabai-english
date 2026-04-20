import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    organizationMembership: {
      findFirst: vi.fn(),
    },
    timeOffRequest: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET, POST } from "@/app/api/org/[orgId]/schools/[schoolId]/time-off-requests/route";

const orgId = "org-1";
const schoolId = "school-1";
const routeCtx = { params: Promise.resolve({ orgId, schoolId }) };

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
        startDate: "2026-04-25T00:00:00Z",
        endDate: "2026-04-27T23:59:59Z",
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
        startDate: "2026-04-25T00:00:00Z",
        endDate: "2026-04-27T23:59:59Z",
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
      startDate: new Date("2026-04-25"),
      endDate: new Date("2026-04-27"),
    };
    prismaMock.timeOffRequest.create.mockResolvedValue(created);

    const res = await POST(
      postReq({
        startDate: "2026-04-25T00:00:00Z",
        endDate: "2026-04-27T23:59:59Z",
        reason: "Family trip",
      }),
      routeCtx,
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.request.status).toBe("PENDING");
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
