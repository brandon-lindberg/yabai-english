import type { PrismaClient } from "@/generated/prisma/client";

/**
 * Whether this person has any refunded lesson at all.
 *
 * Decides if the Refunded tab appears. A refund is an exception and most
 * accounts never have one, so a permanent tab leading to "No refunded lessons."
 * promises content that is not coming — and it sat between the two tabs people
 * actually use.
 *
 * A count, not a load: the schedule layout runs on every page beneath it and
 * only needs to know whether there are any.
 *
 * Any refund counts, not only settled ones. A refund in flight is exactly when
 * both parties want to look — the money has been promised and has not arrived —
 * and waiting for it to settle would hide the tab during the only period
 * anybody needs to check on it. The documents are a later, separate fact: a
 * credit note exists once the money has actually gone back.
 */
export async function hasRefundedLessons(
  prisma: PrismaClient,
  {
    studentUserId,
    teacherProfileId,
  }: { studentUserId?: string | null; teacherProfileId?: string | null },
): Promise<boolean> {
  const booking = studentUserId
    ? { studentId: studentUserId }
    : teacherProfileId
      ? { teacherId: teacherProfileId }
      : null;
  // Nobody to ask about: a signed-out visitor, or a teacher with no profile yet.
  if (!booking) return false;

  const count = await prisma.refund.count({ where: { booking } });
  return count > 0;
}
