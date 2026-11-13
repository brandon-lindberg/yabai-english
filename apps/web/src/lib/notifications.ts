import { prisma } from "@/lib/prisma";
import { emitNotificationsUpdate } from "@/lib/realtime-server";
import { createHash } from "node:crypto";

export async function createUserNotification(input: {
  userId: string;
  titleJa: string;
  titleEn: string;
  bodyJa?: string;
  bodyEn?: string;
  /** App-relative path this notification is about, if it has one. */
  href?: string;
  /** Stable lifecycle event identity, shared across retries and provider callbacks. */
  deduplicationKey?: string;
}) {
  const data = {
      userId: input.userId,
      titleJa: input.titleJa,
      titleEn: input.titleEn,
      bodyJa: input.bodyJa ?? null,
      bodyEn: input.bodyEn ?? null,
      href: input.href ?? null,
    };
  if (input.deduplicationKey) {
    const id = `event_${createHash("sha256").update(`${input.userId}:${input.deduplicationKey}`).digest("hex")}`;
    const created = await prisma.notification.createMany({ data: [{ ...data, id }], skipDuplicates: true });
    if (!created.count) return;
  } else {
    await prisma.notification.create({ data });
  }
  await emitNotificationsUpdate(input.userId);
}
