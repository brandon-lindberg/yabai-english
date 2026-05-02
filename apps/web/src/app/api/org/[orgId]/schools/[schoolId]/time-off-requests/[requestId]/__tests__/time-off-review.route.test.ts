import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, prismaMock, notifyMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    organizationMembership: { findFirst: vi.fn() },
    timeOffRequest: { findUnique: vi.fn(), update: vi.fn() },
  },
  notifyMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/notifications", () => ({ createUserNotification: notifyMock }));

import { PATCH } from "@/app/api/org/[orgId]/schools/[schoolId]/time-off-requests/[requestId]/route";

const orgId = "org-1";
const schoolId = "school-1";
const requestId = "req-1";
const routeCtx = { params: Promise.resolve({ orgId, schoolId, requestId }) };

function patchReq(body: unknown) {
  return new Request(
    `http://localhost/api/org/${orgId}/schools/${schoolId}/time-off-requests/${requestId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe("PATCH /api/org/.../time-off-requests/[requestId]", () => {
  beforeEach(() => vi.clearAllMocks());

  test("401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const res = await PATCH(patchReq({ status: "APPROVED" }), routeCtx);
    expect(res.status).toBe(401);
  });

  test("403 when TEACHER tries to review", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1", orgRole: "TEACHER", status: "ACTIVE",
      schoolId, organizationId: orgId, userId: "u1",
    });
    const res = await PATCH(patchReq({ status: "APPROVED" }), routeCtx);
    expect(res.status).toBe(403);
  });

  test("404 when request not found", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1", orgRole: "SCHOOL_ADMIN", status: "ACTIVE",
      schoolId, organizationId: orgId, userId: "u1",
    });
    prismaMock.timeOffRequest.findUnique.mockResolvedValue(null);
    const res = await PATCH(patchReq({ status: "APPROVED" }), routeCtx);
    expect(res.status).toBe(404);
  });

  test("400 when reviewing non-PENDING request", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1", orgRole: "SCHOOL_ADMIN", status: "ACTIVE",
      schoolId, organizationId: orgId, userId: "u1",
    });
    prismaMock.timeOffRequest.findUnique.mockResolvedValue({
      id: requestId, status: "APPROVED", schoolId,
    });
    const res = await PATCH(patchReq({ status: "DENIED" }), routeCtx);
    expect(res.status).toBe(400);
  });

  test("200 approves pending request", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1", orgRole: "SCHOOL_ADMIN", status: "ACTIVE",
      schoolId, organizationId: orgId, userId: "u1",
    });
    prismaMock.timeOffRequest.findUnique.mockResolvedValue({
      id: requestId, status: "PENDING", schoolId,
      teacherMembership: { userId: "teacher-1" },
      school: { name: "Shibuya" },
    });
    prismaMock.timeOffRequest.update.mockResolvedValue({
      id: requestId, status: "APPROVED",
    });
    const res = await PATCH(
      patchReq({ status: "APPROVED", reviewNote: "Enjoy!" }),
      routeCtx,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.request.status).toBe("APPROVED");
  });

  test("notifies teacher on approval", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    prismaMock.organizationMembership.findFirst.mockResolvedValue({
      id: "mem-1", orgRole: "SCHOOL_ADMIN", status: "ACTIVE",
      schoolId, organizationId: orgId, userId: "u1",
    });
    prismaMock.timeOffRequest.findUnique.mockResolvedValue({
      id: requestId, status: "PENDING", schoolId,
      teacherMembership: { userId: "teacher-1" },
      school: { name: "Shibuya" },
    });
    prismaMock.timeOffRequest.update.mockResolvedValue({
      id: requestId, status: "APPROVED",
    });
    await PATCH(patchReq({ status: "APPROVED" }), routeCtx);
    expect(notifyMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "teacher-1" }),
    );
  });
});
