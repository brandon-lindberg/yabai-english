import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    organizationMembership: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { PATCH, DELETE } from "@/app/api/org/[orgId]/members/[memberId]/route";

const orgId = "org-1";
const memberId = "mem-target";
const routeCtx = { params: Promise.resolve({ orgId, memberId }) };

function patchReq(body: unknown) {
  return new Request(`http://localhost/api/org/${orgId}/members/${memberId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function deleteReq() {
  return new Request(`http://localhost/api/org/${orgId}/members/${memberId}`, {
    method: "DELETE",
  });
}

const ownerCaller = {
  id: "mem-owner", orgRole: "OWNER" as const, status: "ACTIVE",
  schoolId: null, organizationId: orgId, userId: "u-owner",
};

const targetMember = {
  id: memberId, orgRole: "TEACHER" as const, status: "ACTIVE",
  schoolId: "s1", organizationId: orgId, userId: "u-target",
};

describe("PATCH /api/org/[orgId]/members/[memberId]", () => {
  beforeEach(() => vi.clearAllMocks());

  test("401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const res = await PATCH(patchReq({ status: "INACTIVE" }), routeCtx);
    expect(res.status).toBe(401);
  });

  test("404 when target not found", async () => {
    authMock.mockResolvedValue({ user: { id: "u-owner" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue(ownerCaller);
    prismaMock.organizationMembership.findUnique.mockResolvedValue(null);
    const res = await PATCH(patchReq({ status: "INACTIVE" }), routeCtx);
    expect(res.status).toBe(404);
  });

  test("200 updates member role", async () => {
    authMock.mockResolvedValue({ user: { id: "u-owner" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue(ownerCaller);
    prismaMock.organizationMembership.findUnique.mockResolvedValue(targetMember);
    prismaMock.organizationMembership.update.mockResolvedValue({
      ...targetMember, orgRole: "SCHOOL_ADMIN",
    });
    const res = await PATCH(patchReq({ orgRole: "SCHOOL_ADMIN" }), routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.membership.orgRole).toBe("SCHOOL_ADMIN");
  });

  test("403 when SCHOOL_ADMIN tries to modify ORG_ADMIN", async () => {
    authMock.mockResolvedValue({ user: { id: "u-school-admin" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-sa", orgRole: "SCHOOL_ADMIN", status: "ACTIVE",
      schoolId: "s1", organizationId: orgId, userId: "u-school-admin",
    });
    prismaMock.organizationMembership.findUnique.mockResolvedValue({
      id: memberId, orgRole: "ORG_ADMIN", status: "ACTIVE",
      schoolId: null, organizationId: orgId, userId: "u-target",
    });
    const res = await PATCH(patchReq({ status: "INACTIVE" }), routeCtx);
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/org/[orgId]/members/[memberId]", () => {
  beforeEach(() => vi.clearAllMocks());

  test("403 when trying to remove OWNER", async () => {
    authMock.mockResolvedValue({ user: { id: "u-admin" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-admin", orgRole: "ORG_ADMIN", status: "ACTIVE",
      schoolId: null, organizationId: orgId, userId: "u-admin",
    });
    prismaMock.organizationMembership.findUnique.mockResolvedValue({
      id: memberId, orgRole: "OWNER", status: "ACTIVE",
      schoolId: null, organizationId: orgId, userId: "u-owner",
    });
    const res = await DELETE(deleteReq(), routeCtx);
    expect(res.status).toBe(403);
  });

  test("200 deletes member", async () => {
    authMock.mockResolvedValue({ user: { id: "u-owner" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue(ownerCaller);
    prismaMock.organizationMembership.findUnique.mockResolvedValue(targetMember);
    prismaMock.organizationMembership.delete.mockResolvedValue(targetMember);
    const res = await DELETE(deleteReq(), routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
