import { prisma } from "@/lib/prisma";
import { emitNotificationsUpdate } from "@/lib/realtime-server";

export async function createUserNotification(input: {
  userId: string;
  titleJa: string;
  titleEn: string;
  bodyJa?: string;
  bodyEn?: string;
  /** App-relative path this notification is about, if it has one. */
  href?: string;
}) {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      titleJa: input.titleJa,
      titleEn: input.titleEn,
      bodyJa: input.bodyJa ?? null,
      bodyEn: input.bodyEn ?? null,
      href: input.href ?? null,
    },
  });
  await emitNotificationsUpdate(input.userId);
}
