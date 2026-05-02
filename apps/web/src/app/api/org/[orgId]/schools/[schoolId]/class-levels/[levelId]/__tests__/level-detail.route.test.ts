import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    organizationMembership: { findFirst: vi.fn() },
    schoolClassLevel: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import {
  PATCH,
  DELETE,
} from "@/app/api/org/[orgId]/schools/[schoolId]/class-levels/[levelId]/route";

const orgId = "org-1";
const schoolId = "school-1";
const levelId = "lvl-1";
const routeCtx = { params: Promise.resolve({ orgId, schoolId, levelId }) };

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
    `http://localhost/api/org/${orgId}/schools/${schoolId}/class-levels/${levelId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

function deleteReq() {
  return new Request(
    `http://localhost/api/org/${orgId}/schools/${schoolId}/class-levels/${levelId}`,
    { method: "DELETE" },
  );
}

describe("PATCH /api/org/.../class-levels/[levelId]", () => {
  beforeEach(() => vi.clearAllMocks());

  test("403 when TEACHER tries to update", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      ...adminCaller,
      orgRole: "TEACHER",
    });
    const res = await PATCH(patchReq({ label: "x" }), routeCtx);
    expect(res.status).toBe(403);
  });

  test("404 when level not found", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue(adminCaller);
    prismaMock.schoolClassLevel.findUnique.mockResolvedValue(null);
    const res = await PATCH(patchReq({ label: "x" }), routeCtx);
    expect(res.status).toBe(404);
  });

  test("404 when level belongs to a different school", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue(adminCaller);
    prismaMock.schoolClassLevel.findUnique.mockResolvedValue({
      id: levelId,
      schoolId: "school-other",
    });
    const res = await PATCH(patchReq({ label: "x" }), routeCtx);
    expect(res.status).toBe(404);
  });

  test("200 updates level", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue(adminCaller);
    prismaMock.schoolClassLevel.findUnique.mockResolvedValue({
      id: levelId,
      schoolId,
    });
    prismaMock.schoolClassLevel.update.mockResolvedValue({
      id: levelId,
      label: "Year 8",
    });
    const res = await PATCH(patchReq({ label: "Year 8" }), routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.classLevel.label).toBe("Year 8");
  });
});

describe("DELETE /api/org/.../class-levels/[levelId]", () => {
  beforeEach(() => vi.clearAllMocks());

  test("200 soft-deletes by setting active=false", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue(adminCaller);
    prismaMock.schoolClassLevel.findUnique.mockResolvedValue({
      id: levelId,
      schoolId,
    });
    prismaMock.schoolClassLevel.update.mockResolvedValue({
      id: levelId,
      active: false,
    });
    const res = await DELETE(deleteReq(), routeCtx);
    expect(res.status).toBe(200);
    expect(prismaMock.schoolClassLevel.update).toHaveBeenCalledWith({
      where: { id: levelId },
      data: { active: false },
    });
  });

  test("403 when STUDENT tries to delete", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      ...adminCaller,
      orgRole: "STUDENT",
    });
    const res = await DELETE(deleteReq(), routeCtx);
    expect(res.status).toBe(403);
  });
});
