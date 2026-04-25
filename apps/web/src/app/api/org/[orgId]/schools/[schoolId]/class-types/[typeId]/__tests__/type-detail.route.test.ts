import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    organizationMembership: { findFirst: vi.fn() },
    schoolClassType: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import {
  PATCH,
  DELETE,
} from "@/app/api/org/[orgId]/schools/[schoolId]/class-types/[typeId]/route";

const orgId = "org-1";
const schoolId = "school-1";
const typeId = "type-1";
const routeCtx = { params: Promise.resolve({ orgId, schoolId, typeId }) };

const adminCaller = {
  id: "mem-1",
  orgRole: "SCHOOL_ADMIN",
  status: "ACTIVE",
  schoolId,
  organizationId: orgId,
  userId: "u1",
};

function patchReq(body: unknown) {
  return new Request(
    `http://localhost/api/org/${orgId}/schools/${schoolId}/class-types/${typeId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

function deleteReq() {
  return new Request(
    `http://localhost/api/org/${orgId}/schools/${schoolId}/class-types/${typeId}`,
    { method: "DELETE" },
  );
}

describe("PATCH /api/org/.../class-types/[typeId]", () => {
  beforeEach(() => vi.clearAllMocks());

  test("404 when type belongs to a different school", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue(adminCaller);
    prismaMock.schoolClassType.findUnique.mockResolvedValue({
      id: typeId,
      schoolId: "school-other",
    });
    const res = await PATCH(patchReq({ label: "x" }), routeCtx);
    expect(res.status).toBe(404);
  });

  test("200 updates type", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue(adminCaller);
    prismaMock.schoolClassType.findUnique.mockResolvedValue({
      id: typeId,
      schoolId,
    });
    prismaMock.schoolClassType.update.mockResolvedValue({
      id: typeId,
      label: "Pronunciation",
    });
    const res = await PATCH(patchReq({ label: "Pronunciation" }), routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.classType.label).toBe("Pronunciation");
  });
});

describe("DELETE /api/org/.../class-types/[typeId]", () => {
  beforeEach(() => vi.clearAllMocks());

  test("200 soft-deletes by setting active=false", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue(adminCaller);
    prismaMock.schoolClassType.findUnique.mockResolvedValue({
      id: typeId,
      schoolId,
    });
    prismaMock.schoolClassType.update.mockResolvedValue({
      id: typeId,
      active: false,
    });
    const res = await DELETE(deleteReq(), routeCtx);
    expect(res.status).toBe(200);
    expect(prismaMock.schoolClassType.update).toHaveBeenCalledWith({
      where: { id: typeId },
      data: { active: false },
    });
  });
});
