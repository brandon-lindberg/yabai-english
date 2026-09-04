import { describe, expect, test, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { hasRefundedLessons } from "@/lib/dashboard/has-refunded-lessons";

/*
  Whether to show the Refunded tab at all. Asked as a count rather than by
  loading the lessons: the layout only needs to know if there are any, and it
  runs on every page under /dashboard/schedule.
*/
function prisma(count: number) {
  const refundCount = vi.fn().mockResolvedValue(count);
  return { client: { refund: { count: refundCount } } as unknown as PrismaClient, refundCount };
}

describe("hasRefundedLessons", () => {
  test("a student with a refund has one", async () => {
    const { client } = prisma(1);

    expect(await hasRefundedLessons(client, { studentUserId: "s-1" })).toBe(true);
  });

  test("a student with none does not", async () => {
    const { client } = prisma(0);

    expect(await hasRefundedLessons(client, { studentUserId: "s-1" })).toBe(false);
  });

  test("counts a refund that is still moving", async () => {
    /*
      A refund in flight is exactly when both parties want to look: the money
      has been promised and has not arrived. Waiting for it to settle would
      hide the tab during the only period anybody needs to check on it.

      The documents are a later, separate fact — a credit note exists once the
      money has actually gone back, not before.
    */
    const { client, refundCount } = prisma(0);
    await hasRefundedLessons(client, { studentUserId: "s-1" });

    const where = refundCount.mock.calls[0][0].where as Record<string, unknown>;
    expect(where.status).toBeUndefined();
  });

  test("scopes a student to their own bookings", async () => {
    const { client, refundCount } = prisma(0);
    await hasRefundedLessons(client, { studentUserId: "s-1" });

    expect(refundCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ booking: { studentId: "s-1" } }),
      }),
    );
  });

  test("scopes a teacher to the lessons they taught", async () => {
    const { client, refundCount } = prisma(0);
    await hasRefundedLessons(client, { teacherProfileId: "tp-1" });

    expect(refundCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ booking: { teacherId: "tp-1" } }),
      }),
    );
  });

  test("asks nothing at all when there is nobody to ask about", async () => {
    // A signed-out visitor, or a teacher with no profile yet.
    const { client, refundCount } = prisma(3);

    expect(await hasRefundedLessons(client, {})).toBe(false);
    expect(refundCount).not.toHaveBeenCalled();
  });
});
