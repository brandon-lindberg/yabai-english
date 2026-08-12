import { beforeEach, describe, expect, test, vi } from "vitest";

const { findManyMock, createManyMock, emitMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  createManyMock: vi.fn(),
  emitMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findMany: findManyMock },
    notification: { createMany: createManyMock },
  },
}));
vi.mock("@/lib/realtime-server", () => ({ emitNotificationsUpdate: emitMock }));

import {
  ADMIN_REFUNDS_HREF,
  notifySuperAdminsOfStuckRefund,
} from "@/lib/refund-notifications";

describe("notifySuperAdminsOfStuckRefund", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findManyMock.mockResolvedValue([{ id: "admin-1" }, { id: "admin-2" }]);
    createManyMock.mockResolvedValue({ count: 2 });
  });

  test("notifies every super admin, and links to the refunds queue", async () => {
    await notifySuperAdminsOfStuckRefund({
      amountYen: 5000,
      studentName: "Aki",
      note: "no balance",
    });

    expect(findManyMock).toHaveBeenCalledWith({
      where: { role: "SUPER_ADMIN" },
      select: { id: true },
    });
    expect(createManyMock).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ userId: "admin-1", href: ADMIN_REFUNDS_HREF }),
        expect.objectContaining({ userId: "admin-2", href: ADMIN_REFUNDS_HREF }),
      ],
    });
    expect(ADMIN_REFUNDS_HREF).toBe("/admin/payments");
  });

  test("names the student and the amount in both locales", async () => {
    await notifySuperAdminsOfStuckRefund({
      amountYen: 5000,
      studentName: "Aki",
      note: "no balance",
    });

    const [{ data }] = createManyMock.mock.calls[0];
    for (const row of data) {
      expect(row.titleEn).toBeTruthy();
      expect(row.titleJa).toBeTruthy();
      expect(`${row.bodyEn}`).toContain("Aki");
      expect(`${row.bodyEn}`).toContain("5,000");
      expect(`${row.bodyJa}`).toContain("Aki");
    }
  });

  test("still notifies when the student name is unknown", async () => {
    await notifySuperAdminsOfStuckRefund({ amountYen: 5000, studentName: null, note: null });

    expect(createManyMock).toHaveBeenCalled();
    const [{ data }] = createManyMock.mock.calls[0];
    expect(data[0].bodyEn).toContain("5,000");
  });

  test("wakes each admin's bell so it appears without a reload", async () => {
    await notifySuperAdminsOfStuckRefund({ amountYen: 5000, studentName: "Aki", note: null });

    expect(emitMock).toHaveBeenCalledWith("admin-1");
    expect(emitMock).toHaveBeenCalledWith("admin-2");
  });

  test("does nothing when there are no super admins", async () => {
    findManyMock.mockResolvedValue([]);

    await notifySuperAdminsOfStuckRefund({ amountYen: 5000, studentName: "Aki", note: null });

    expect(createManyMock).not.toHaveBeenCalled();
    expect(emitMock).not.toHaveBeenCalled();
  });
});
