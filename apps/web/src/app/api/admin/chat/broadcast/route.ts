import { NextResponse } from "next/server";
import { AccountStatus, Role } from "@/generated/prisma/client";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  chatMessageData,
  ensureAdminUserThread,
  touchChatThread,
} from "@/lib/chat-threads";
import { emitChatUpdate } from "@/lib/realtime-server";
import { createUserNotification } from "@/lib/notifications";

const bodySchema = z.object({
  body: z.string().trim().min(1).max(2000),
  target: z.enum(["all", "teachers", "students"]),
});

function toBroadcastTarget(target: z.infer<typeof bodySchema>["target"]): "ALL" | "TEACHERS" | "STUDENTS" {
  if (target === "teachers") return "TEACHERS";
  if (target === "students") return "STUDENTS";
  return "ALL";
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const items = await prisma.adminBroadcast.findMany({
    where: { senderId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const users = await prisma.user.findMany({
    where: {
      accountStatus: AccountStatus.ACTIVE,
      id: { not: session.user.id },
      role:
        parsed.data.target === "all"
          ? { in: [Role.TEACHER, Role.STUDENT] }
          : parsed.data.target === "teachers"
            ? Role.TEACHER
            : Role.STUDENT,
    },
    select: { id: true, role: true },
    take: 100000,
  });

  const recipients = users.map((user) => ({
    recipientId: user.id,
    role: user.role,
  }));
  if (recipients.length === 0) {
    const log = await prisma.adminBroadcast.create({
      data: {
        senderId: session.user.id,
        target: toBroadcastTarget(parsed.data.target),
        body: parsed.data.body,
        targetedRecipients: 0,
        sentMessages: 0,
      },
    });
    return NextResponse.json({
      ok: true,
      broadcastId: log.id,
      targetedRecipients: 0,
      sentMessages: 0,
    });
  }

  // Each delivery carries the thread it belongs to and the recipient derived
  // from that same thread, so a broadcast cannot cross-pair the two lists and
  // send one user's copy to another.
  const deliveries = await Promise.all(
    recipients.map(async (recipient) => {
      const thread = await ensureAdminUserThread(session.user.id, {
        id: recipient.recipientId,
        role: recipient.role,
      });
      return chatMessageData(thread, session.user.id, parsed.data.body);
    }),
  );

  await prisma.chatMessage.createMany({ data: deliveries });

  await Promise.all(
    deliveries.map((entry) => touchChatThread(entry.threadId)),
  );

  await Promise.all(
    deliveries.flatMap((entry) => [
      emitChatUpdate(entry.recipientId, entry.threadId),
      emitChatUpdate(session.user.id, entry.threadId),
    ]),
  );
  await Promise.all(
    deliveries.map((entry) =>
      createUserNotification({
        userId: entry.recipientId,
        titleJa: "管理者から新しいメッセージがあります",
        titleEn: "You have a new message from admin",
        bodyJa: parsed.data.body,
        bodyEn: parsed.data.body,
      }),
    ),
  );

  const log = await prisma.adminBroadcast.create({
    data: {
      senderId: session.user.id,
      target: toBroadcastTarget(parsed.data.target),
      body: parsed.data.body,
      targetedRecipients: deliveries.length,
      sentMessages: deliveries.length,
    },
  });

  return NextResponse.json({
    ok: true,
    broadcastId: log.id,
    targetedRecipients: deliveries.length,
    sentMessages: deliveries.length,
  });
}
