import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    organizationMembership: { findFirst: vi.fn() },
    school: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET, PATCH } from "@/app/api/org/[orgId]/schools/[schoolId]/route";

const orgId = "org-1";
const schoolId = "school-1";
const routeCtx = { params: Promise.resolve({ orgId, schoolId }) };

function patchReq(body: unknown) {
  return new Request(
    `http://localhost/api/org/${orgId}/schools/${schoolId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

function getReq() {
  return new Request(`http://localhost/api/org/${orgId}/schools/${schoolId}`);
}

describe("GET /api/org/[orgId]/schools/[schoolId]", () => {
  beforeEach(() => vi.clearAllMocks());

  test("401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const res = await GET(getReq(), routeCtx);
    expect(res.status).toBe(401);
  });

  test("404 when school not found", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1", orgRole: "OWNER", status: "ACTIVE",
      schoolId: null, organizationId: orgId, userId: "u1",
    });
    prismaMock.school.findUnique.mockResolvedValue(null);
    const res = await GET(getReq(), routeCtx);
    expect(res.status).toBe(404);
  });

  test("200 returns school detail", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1", orgRole: "TEACHER", status: "ACTIVE",
      schoolId, organizationId: orgId, userId: "u1",
    });
    prismaMock.school.findUnique.mockResolvedValue({
      id: schoolId, name: "School 1", organizationId: orgId,
    });
    const res = await GET(getReq(), routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.school.name).toBe("School 1");
  });
});

describe("PATCH /api/org/[orgId]/schools/[schoolId]", () => {
  beforeEach(() => vi.clearAllMocks());

  test("403 when not admin", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1", orgRole: "TEACHER", status: "ACTIVE",
      schoolId, organizationId: orgId, userId: "u1",
    });
    const res = await PATCH(patchReq({ name: "New" }), routeCtx);
    expect(res.status).toBe(403);
  });

  test("200 updates school for SCHOOL_ADMIN", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1", orgRole: "SCHOOL_ADMIN", status: "ACTIVE",
      schoolId, organizationId: orgId, userId: "u1",
    });
    prismaMock.school.findUnique.mockResolvedValue({
      id: schoolId, organizationId: orgId,
    });
    prismaMock.school.update.mockResolvedValue({
      id: schoolId, name: "Updated School", organizationId: orgId,
    });
    const res = await PATCH(patchReq({ name: "Updated School" }), routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.school.name).toBe("Updated School");
  });
});
