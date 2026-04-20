import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    organizationMembership: { findFirst: vi.fn() },
    organization: { findUnique: vi.fn() },
    school: { findMany: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET, POST } from "@/app/api/org/[orgId]/schools/route";

const orgId = "org-1";
const routeCtx = { params: Promise.resolve({ orgId }) };

function postReq(body: unknown) {
  return new Request(`http://localhost/api/org/${orgId}/schools`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function getReq() {
  return new Request(`http://localhost/api/org/${orgId}/schools`);
}

describe("GET /api/org/[orgId]/schools", () => {
  beforeEach(() => vi.clearAllMocks());

  test("401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const res = await GET(getReq(), routeCtx);
    expect(res.status).toBe(401);
  });

  test("403 when not a member", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue(null);
    const res = await GET(getReq(), routeCtx);
    expect(res.status).toBe(403);
  });

  test("200 returns all schools for org-wide admin", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1", orgRole: "ORG_ADMIN", status: "ACTIVE",
      schoolId: null, organizationId: orgId, userId: "u1",
    });
    prismaMock.school.findMany.mockResolvedValue([
      { id: "s1", name: "School 1" },
      { id: "s2", name: "School 2" },
    ]);
    const res = await GET(getReq(), routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.schools).toHaveLength(2);
  });

  test("200 returns only caller's school for school-scoped member", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1", orgRole: "TEACHER", status: "ACTIVE",
      schoolId: "s1", organizationId: orgId, userId: "u1",
    });
    prismaMock.school.findMany.mockResolvedValue([
      { id: "s1", name: "School 1" },
    ]);
    const res = await GET(getReq(), routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.schools).toHaveLength(1);
  });
});

describe("POST /api/org/[orgId]/schools", () => {
  beforeEach(() => vi.clearAllMocks());

  test("403 when not org-wide admin", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1", orgRole: "SCHOOL_ADMIN", status: "ACTIVE",
      schoolId: "s1", organizationId: orgId, userId: "u1",
    });
    const res = await POST(postReq({ name: "New School", slug: "new-school" }), routeCtx);
    expect(res.status).toBe(403);
  });

  test("400 on invalid slug", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1", orgRole: "OWNER", status: "ACTIVE",
      schoolId: null, organizationId: orgId, userId: "u1",
    });
    const res = await POST(postReq({ name: "New School", slug: "INVALID SLUG!" }), routeCtx);
    expect(res.status).toBe(400);
  });

  test("201 creates school for OWNER", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1", orgRole: "OWNER", status: "ACTIVE",
      schoolId: null, organizationId: orgId, userId: "u1",
    });
    prismaMock.school.create.mockResolvedValue({
      id: "s-new", name: "New School", slug: "new-school", organizationId: orgId,
    });
    const res = await POST(
      postReq({ name: "New School", slug: "new-school" }),
      routeCtx,
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.school.slug).toBe("new-school");
  });
});
