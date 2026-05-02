import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock, notifyMock } = vi.hoisted(() => ({
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
  notifyMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/notifications", () => ({ createUserNotification: notifyMock }));

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
    prismaMock.organizationMembership.findFirst.mockResolvedValue(null);
    const res = await GET(getReq(), routeContext);
    expect(res.status).toBe(403);
  });

  test("200 returns members for org admin", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "STUDENT" } });
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

describe("POST /api/org/[orgId]/members (email-match invite)", () => {
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

  test("201 creates INVITED membership with userId=null when target user does not exist", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "STUDENT" } });
    prismaMock.organizationMembership.findFirst
      .mockResolvedValueOnce({
        id: "mem-1",
        orgRole: "OWNER",
        status: "ACTIVE",
        schoolId: null,
        organizationId: orgId,
        userId: "u1",
      })
      .mockResolvedValueOnce(null); // no existing membership at this school for this email

    prismaMock.user.findUnique.mockResolvedValue(null); // user does not yet exist

    prismaMock.organizationMembership.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: "mem-new",
        ...data,
      }),
    );

    const res = await POST(
      postReq({ email: "New@Test.com", orgRole: "STUDENT", schoolId }),
      routeContext,
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.membership.orgRole).toBe("STUDENT");
    expect(body.membership.status).toBe("INVITED");
    expect(body.membership.userId).toBeNull();
    expect(body.membership.inviteEmail).toBe("new@test.com");
    expect(body.membership.inviteToken).toBeUndefined();
    expect(body.membership.inviteExpiresAt).toBeUndefined();
  });

  test("201 creates INVITED membership with userId set when target user already exists", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "STUDENT" } });
    prismaMock.organizationMembership.findFirst
      .mockResolvedValueOnce({
        id: "mem-1",
        orgRole: "OWNER",
        status: "ACTIVE",
        schoolId: null,
        organizationId: orgId,
        userId: "u1",
      })
      .mockResolvedValueOnce(null); // no existing membership at this school

    prismaMock.user.findUnique.mockResolvedValue({
      id: "u2",
      email: "new@test.com",
    });

    prismaMock.organizationMembership.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: "mem-new",
        ...data,
      }),
    );

    const res = await POST(
      postReq({ email: "new@test.com", orgRole: "STUDENT", schoolId }),
      routeContext,
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.membership.userId).toBe("u2");
    expect(body.membership.inviteEmail).toBe("new@test.com");
    expect(body.membership.status).toBe("INVITED");
  });

  test("409 when email already invited at this school (regardless of whether user exists)", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "STUDENT" } });
    prismaMock.organizationMembership.findFirst
      .mockResolvedValueOnce({
        id: "mem-1",
        orgRole: "OWNER",
        status: "ACTIVE",
        schoolId: null,
        organizationId: orgId,
        userId: "u1",
      })
      .mockResolvedValueOnce({
        id: "mem-existing",
        organizationId: orgId,
        schoolId,
        inviteEmail: "new@test.com",
        status: "INVITED",
      });

    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await POST(
      postReq({ email: "new@test.com", orgRole: "STUDENT", schoolId }),
      routeContext,
    );
    expect(res.status).toBe(409);
  });
});
