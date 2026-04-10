import { prisma } from "@/lib/prisma";
import { emitNotificationsUpdate } from "@/lib/realtime-server";

export async function createUserNotification(input: {
  userId: string;
  titleJa: string;
  titleEn: string;
  bodyJa?: string;
  bodyEn?: string;
}) {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      titleJa: input.titleJa,
      titleEn: input.titleEn,
      bodyJa: input.bodyJa ?? null,
      bodyEn: input.bodyEn ?? null,
    },
  });
  await emitNotificationsUpdate(input.userId);
}
