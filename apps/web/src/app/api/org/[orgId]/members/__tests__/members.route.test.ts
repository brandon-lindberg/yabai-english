import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    organizationMembership: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET, POST } from "@/app/api/org/[orgId]/members/route";

const orgId = "org-1";
const schoolId = "school-1";

function getReq(params?: string) {
  return new Request(
    `http://localhost/api/org/${orgId}/members${params ? `?${params}` : ""}`,
  );
}

function postReq(body: unknown) {
  return new Request(`http://localhost/api/org/${orgId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const routeContext = { params: Promise.resolve({ orgId }) };

describe("GET /api/org/[orgId]/members", () => {
  beforeEach(() => vi.clearAllMocks());

  test("401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const res = await GET(getReq(), routeContext);
    expect(res.status).toBe(401);
  });

  test("403 when user is not an org admin", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "STUDENT" } });
    // User has no org-admin membership
    prismaMock.organizationMembership.findFirst.mockResolvedValue(null);
    const res = await GET(getReq(), routeContext);
    expect(res.status).toBe(403);
  });

  test("200 returns members for org admin", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "STUDENT" } });
    // User is OWNER
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1",
      orgRole: "OWNER",
      status: "ACTIVE",
      schoolId: null,
    });
    const members = [
      {
        id: "mem-2",
        userId: "u2",
        orgRole: "TEACHER",
        status: "ACTIVE",
        schoolId,
        user: { id: "u2", name: "Teacher", email: "t@test.com" },
      },
    ];
    prismaMock.organizationMembership.findMany.mockResolvedValue(members);
    prismaMock.organizationMembership.count.mockResolvedValue(1);

    const res = await GET(getReq(), routeContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.members).toHaveLength(1);
    expect(body.members[0].orgRole).toBe("TEACHER");
  });
});

describe("POST /api/org/[orgId]/members", () => {
  beforeEach(() => vi.clearAllMocks());

  test("401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const res = await POST(
      postReq({ email: "new@test.com", orgRole: "STUDENT", schoolId }),
      routeContext,
    );
    expect(res.status).toBe(401);
  });

  test("403 when user is not an admin", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "STUDENT" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1",
      orgRole: "TEACHER",
      status: "ACTIVE",
      schoolId,
    });
    const res = await POST(
      postReq({ email: "new@test.com", orgRole: "STUDENT", schoolId }),
      routeContext,
    );
    expect(res.status).toBe(403);
  });

  test("201 creates invited membership when adding by email", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "STUDENT" } });
    // User is OWNER
    prismaMock.organizationMembership.findFirst
      .mockResolvedValueOnce({
        id: "mem-1",
        orgRole: "OWNER",
        status: "ACTIVE",
        schoolId: null,
        organizationId: orgId,
        userId: "u1",
      })
      .mockResolvedValueOnce(null); // no existing membership for target user

    // Target user exists
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u2",
      email: "new@test.com",
    });

    const created = {
      id: "mem-new",
      userId: "u2",
      orgRole: "STUDENT",
      status: "INVITED",
      schoolId,
      inviteToken: "tok-123",
    };
    prismaMock.organizationMembership.create.mockResolvedValue(created);

    const res = await POST(
      postReq({ email: "new@test.com", orgRole: "STUDENT", schoolId }),
      routeContext,
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.membership.orgRole).toBe("STUDENT");
    expect(body.membership.status).toBe("INVITED");
  });
});
