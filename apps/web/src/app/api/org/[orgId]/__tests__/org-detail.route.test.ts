import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    organizationMembership: { findFirst: vi.fn() },
    organization: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET, PATCH } from "@/app/api/org/[orgId]/route";

const orgId = "org-1";
const routeCtx = { params: Promise.resolve({ orgId }) };

function patchReq(body: unknown) {
  return new Request(`http://localhost/api/org/${orgId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function getReq() {
  return new Request(`http://localhost/api/org/${orgId}`);
}

describe("GET /api/org/[orgId]", () => {
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

  test("404 when org not found", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1", orgRole: "OWNER", status: "ACTIVE",
      schoolId: null, organizationId: orgId, userId: "u1",
    });
    prismaMock.organization.findUnique.mockResolvedValue(null);
    const res = await GET(getReq(), routeCtx);
    expect(res.status).toBe(404);
  });

  test("200 returns org with all schools for org-wide admin", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1", orgRole: "OWNER", status: "ACTIVE",
      schoolId: null, organizationId: orgId, userId: "u1",
    });
    prismaMock.organization.findUnique.mockResolvedValue({
      id: orgId, name: "Test Org",
      schools: [
        { id: "s1", name: "School 1" },
        { id: "s2", name: "School 2" },
      ],
    });
    const res = await GET(getReq(), routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.organization.schools).toHaveLength(2);
    expect(body.callerRole).toBe("OWNER");
  });

  test("200 filters schools for school-scoped member", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1", orgRole: "TEACHER", status: "ACTIVE",
      schoolId: "s1", organizationId: orgId, userId: "u1",
    });
    prismaMock.organization.findUnique.mockResolvedValue({
      id: orgId, name: "Test Org",
      schools: [
        { id: "s1", name: "School 1" },
        { id: "s2", name: "School 2" },
      ],
    });
    const res = await GET(getReq(), routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.organization.schools).toHaveLength(1);
    expect(body.organization.schools[0].id).toBe("s1");
  });
});

describe("PATCH /api/org/[orgId]", () => {
  beforeEach(() => vi.clearAllMocks());

  test("403 when not org-wide admin", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1", orgRole: "SCHOOL_ADMIN", status: "ACTIVE",
      schoolId: "s1", organizationId: orgId, userId: "u1",
    });
    const res = await PATCH(patchReq({ name: "New Name" }), routeCtx);
    expect(res.status).toBe(403);
  });

  test("400 on validation failure", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1", orgRole: "OWNER", status: "ACTIVE",
      schoolId: null, organizationId: orgId, userId: "u1",
    });
    const res = await PATCH(patchReq({ name: "" }), routeCtx);
    expect(res.status).toBe(400);
  });

  test("200 updates org for OWNER", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1", orgRole: "OWNER", status: "ACTIVE",
      schoolId: null, organizationId: orgId, userId: "u1",
    });
    prismaMock.organization.update.mockResolvedValue({
      id: orgId, name: "Updated Org",
    });
    const res = await PATCH(patchReq({ name: "Updated Org" }), routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.organization.name).toBe("Updated Org");
  });

  test("OWNER cannot change billingTarget (platform-controlled)", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1", orgRole: "OWNER", status: "ACTIVE",
      schoolId: null, organizationId: orgId, userId: "u1",
    });
    prismaMock.organization.update.mockResolvedValue({ id: orgId });
    await PATCH(
      patchReq({ name: "Updated Org", billingTarget: "STUDENT" }),
      routeCtx,
    );
    const updateCall = prismaMock.organization.update.mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty("billingTarget");
  });

  test("OWNER cannot toggle marketplace (no longer supported)", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1", orgRole: "OWNER", status: "ACTIVE",
      schoolId: null, organizationId: orgId, userId: "u1",
    });
    prismaMock.organization.update.mockResolvedValue({ id: orgId });
    await PATCH(
      patchReq({ name: "Updated Org", allowTeacherMarketplace: false }),
      routeCtx,
    );
    const updateCall = prismaMock.organization.update.mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty("allowTeacherMarketplace");
  });
});
