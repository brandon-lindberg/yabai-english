import { expect, test, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { adminLessonQuery, loadAdminLessons, loadAdminPersonSchedule } from "@/lib/admin/lesson-search";

test("searches names and IDs before paging and applies local-day, subject, and status filters together", async () => {
  const findMany = vi.fn().mockResolvedValue([{ id: "old-booking" }]);
  const count = vi.fn().mockResolvedValue(261);
  const tx = { booking: { count, findMany } };
  const db = { $transaction: (run: (db: typeof tx) => unknown) => run(tx) } as unknown as PrismaClient;
  const filters = adminLessonQuery.parse({
    q: "Aki", subject: "JAPANESE", status: "COMPLETED", page: "13",
    from: "2026-03-08", to: "2026-03-08", zone: "America/New_York", person: "student-1",
  });
  const result = await loadAdminLessons(db, filters, new Date("2026-11-06T00:00:00Z"));
  expect(result).toMatchObject({ total: 261, page: 13, totalPages: 14, bookings: [{ id: "old-booking" }] });
  const where = findMany.mock.calls[0][0].where;
  expect(count).toHaveBeenCalledWith({ where });
  expect(where.AND).toEqual(expect.arrayContaining([
    { learningLanguage: "JAPANESE" }, { status: "COMPLETED" },
    { startsAt: { gte: new Date("2026-03-08T05:00:00Z"), lt: new Date("2026-03-09T04:00:00Z") } },
    { OR: expect.arrayContaining([
      { id: "Aki" },
      { student: { name: { contains: "Aki", mode: "insensitive" } } },
      { teacher: { user: { email: { contains: "Aki", mode: "insensitive" } } } },
    ]) },
    { OR: [{ studentId: "student-1" }, { teacher: { userId: "student-1" } }] },
  ]));
  expect(findMany.mock.calls[0][0]).toMatchObject({ skip: 240, take: 20, orderBy: [{ startsAt: "desc" }, { id: "desc" }] });
});

test("rejects reversed dates and invalid zones", () => {
  expect(adminLessonQuery.safeParse({ from: "2026-11-02", to: "2026-11-01" }).success).toBe(false);
  expect(adminLessonQuery.safeParse({ zone: "Not/A_Zone" }).success).toBe(false);
});

test("loads every booking for one person's calendar period in either participant role", async () => {
  const findMany = vi.fn().mockResolvedValue([{ id: "cancelled-booking" }]);
  const db = { booking: { findMany } } as unknown as PrismaClient;
  await expect(loadAdminPersonSchedule(db, "person-1", { date: "2025-02-12", view: "day" }, new Date())).resolves.toEqual([{ id: "cancelled-booking" }]);
  expect(findMany).toHaveBeenCalledOnce();
  expect(findMany.mock.calls[0][0]).toMatchObject({ where: {
    OR: [{ studentId: "person-1" }, { teacher: { userId: "person-1" } }],
    // The viewer's local Feb 12 can include bookings from Feb 11 or Feb 13 UTC.
    startsAt: { gte: new Date("2025-02-11T00:00:00Z"), lt: new Date("2025-02-14T00:00:00Z") },
  }, orderBy: [{ startsAt: "asc" }, { id: "asc" }] });
  expect(findMany.mock.calls[0][0]).not.toHaveProperty("take");
  expect(findMany.mock.calls[0][0].where).not.toHaveProperty("status");
});
