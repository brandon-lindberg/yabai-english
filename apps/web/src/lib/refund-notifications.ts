import { prisma } from "@/lib/prisma";
import { emitNotificationsUpdate } from "@/lib/realtime-server";
import { createUserNotification } from "./notifications";

/** The queue a stuck refund is waiting in. */
export const ADMIN_REFUNDS_HREF = "/admin/payments";

function formatYenForNotification(amountYen: number): string {
  return `¥${amountYen.toLocaleString("en-US")}`;
}

/**
 * Tells every super admin that a refund did not reach the student.
 *
 * A stuck refund is money owed to a real person, and nothing else surfaces it —
 * without this, it sits in the queue until someone thinks to look or the student
 * complains.
 */
export async function notifySuperAdminsOfStuckRefund(input: {
  amountYen: number;
  studentName?: string | null;
  note?: string | null;
  recoveryKey?: string;
}): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { role: "SUPER_ADMIN" },
    select: { id: true },
  });
  if (admins.length === 0) return;

  const amount = formatYenForNotification(input.amountYen);
  const who = input.studentName?.trim() || null;
  const reason = input.note?.trim() ? ` (${input.note.trim()})` : "";

  if (input.recoveryKey) {
    await Promise.all(admins.map(admin => createUserNotification({ userId: admin.id,
      titleEn: "A payment recovery needs attention", titleJa: "支払いの復旧対応が必要です",
      bodyEn: `${amount}${who ? ` for ${who}` : ""} needs reconciliation${reason}.`,
      bodyJa: `${who ? `${who} さんの ` : ""}${amount} の照合・復旧が必要です${reason}。`,
      href: ADMIN_REFUNDS_HREF, deduplicationKey: input.recoveryKey,
    })));
    return;
  }

  const bodyEn = who
    ? `${amount} for ${who} could not be refunded automatically${reason}.`
    : `${amount} could not be refunded automatically${reason}.`;
  const bodyJa = who
    ? `${who} さんへの ${amount} の返金を自動処理できませんでした${reason}。`
    : `${amount} の返金を自動処理できませんでした${reason}。`;

  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      titleEn: "A refund needs attention",
      titleJa: "返金の対応が必要です",
      bodyEn,
      bodyJa,
      href: ADMIN_REFUNDS_HREF,
    })),
  });

  await Promise.all(admins.map((admin) => emitNotificationsUpdate(admin.id)));
}
