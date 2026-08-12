import { beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, findManyMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  findManyMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: { refund: { findMany: findManyMock } },
}));

import { GET } from "@/app/api/admin/payments/refunds/route";

const refundRow = {
  id: "refund-1",
  status: "PENDING_RECOVERY",
  amountYen: 5000,
  actor: "STUDENT",
  reason: "CANCELLATION_POLICY",
  recoveryNote: "Application fee refund failed and must be issued manually: no balance",
  providerRefundId: null,
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
  booking: {
    id: "booking-1",
    startsAt: new Date("2026-08-05T00:00:00.000Z"),
    student: { id: "student-1", name: "Aki", email: "aki@example.com" },
    teacher: { user: { id: "teacher-1", name: "Sam", email: "sam@example.com" } },
  },
};

describe("GET /api/admin/payments/refunds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findManyMock.mockResolvedValue([refundRow]);
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "SUPER_ADMIN" } });
  });

  test("rejects anonymous callers", async () => {
    authMock.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/admin/payments/refunds"));
    expect(res.status).toBe(401);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  test("rejects non-admin callers", async () => {
    authMock.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
    const res = await GET(new Request("http://localhost/api/admin/payments/refunds"));
    expect(res.status).toBe(403);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  test("returns only refunds that still need a human, newest first", async () => {
    const res = await GET(new Request("http://localhost/api/admin/payments/refunds"));

    expect(res.status).toBe(200);
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: { in: ["PENDING_RECOVERY", "FAILED", "PENDING"] } },
        orderBy: { createdAt: "desc" },
      }),
    );
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      id: "refund-1",
      status: "PENDING_RECOVERY",
      amountYen: 5000,
      recoveryNote: expect.stringContaining("must be issued manually"),
      student: { name: "Aki" },
      teacher: { name: "Sam" },
    });
  });

  test("can be narrowed to a single status", async () => {
    await GET(new Request("http://localhost/api/admin/payments/refunds?status=FAILED"));

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: { in: ["FAILED"] } } }),
    );
  });

  test("ignores a status outside the recovery set", async () => {
    await GET(new Request("http://localhost/api/admin/payments/refunds?status=SUCCEEDED"));

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: { in: ["PENDING_RECOVERY", "FAILED", "PENDING"] } },
      }),
    );
  });
});
