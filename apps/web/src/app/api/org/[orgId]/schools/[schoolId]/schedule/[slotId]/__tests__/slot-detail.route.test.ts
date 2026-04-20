import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    organizationMembership: { findFirst: vi.fn() },
    schoolScheduleSlot: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { PATCH, DELETE } from "@/app/api/org/[orgId]/schools/[schoolId]/schedule/[slotId]/route";

const orgId = "org-1";
const schoolId = "school-1";
const slotId = "slot-1";
const routeCtx = { params: Promise.resolve({ orgId, schoolId, slotId }) };

function patchReq(body: unknown) {
  return new Request(
    `http://localhost/api/org/${orgId}/schools/${schoolId}/schedule/${slotId}`,
    { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
  );
}

function deleteReq() {
  return new Request(
    `http://localhost/api/org/${orgId}/schools/${schoolId}/schedule/${slotId}`,
    { method: "DELETE" },
  );
}

const adminCaller = {
  id: "mem-1", orgRole: "SCHOOL_ADMIN", status: "ACTIVE",
  schoolId, organizationId: orgId, userId: "u1",
};

describe("PATCH /api/org/.../schedule/[slotId]", () => {
  beforeEach(() => vi.clearAllMocks());

  test("403 when TEACHER tries to update", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      ...adminCaller, orgRole: "TEACHER",
    });
    const res = await PATCH(patchReq({ capacity: 5 }), routeCtx);
    expect(res.status).toBe(403);
  });

  test("404 when slot not found", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue(adminCaller);
    prismaMock.schoolScheduleSlot.findUnique.mockResolvedValue(null);
    const res = await PATCH(patchReq({ capacity: 5 }), routeCtx);
    expect(res.status).toBe(404);
  });

  test("200 updates slot", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue(adminCaller);
    prismaMock.schoolScheduleSlot.findUnique.mockResolvedValue({
      id: slotId, schoolId, capacity: 1,
    });
    prismaMock.schoolScheduleSlot.update.mockResolvedValue({
      id: slotId, capacity: 5,
    });
    const res = await PATCH(patchReq({ capacity: 5 }), routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slot.capacity).toBe(5);
  });
});

describe("DELETE /api/org/.../schedule/[slotId]", () => {
  beforeEach(() => vi.clearAllMocks());

  test("200 soft-deletes slot", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue(adminCaller);
    prismaMock.schoolScheduleSlot.findUnique.mockResolvedValue({
      id: slotId, schoolId,
    });
    prismaMock.schoolScheduleSlot.update.mockResolvedValue({
      id: slotId, active: false,
    });
    const res = await DELETE(deleteReq(), routeCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
