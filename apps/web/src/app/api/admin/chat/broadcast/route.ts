import { NextResponse } from "next/server";
import { AccountStatus, Role } from "@/generated/prisma/client";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
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
  if (session.user.role !== "ADMIN") {
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
  if (session.user.role !== "ADMIN") {
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

  const threadAssignments = await Promise.all(
    recipients.map(async (recipient) => {
      // Admin <-> teacher threads are two-way by design so teachers can reply
      // to admin messages. Admin <-> student threads stay read-only until the
      // admin explicitly opens two-way on that thread.
      const twoWayEnabled = recipient.role === Role.TEACHER;
      const twoWayEnabledByRole = twoWayEnabled ? Role.ADMIN : null;
      const thread = await prisma.chatThread.upsert({
        where: {
          studentId_teacherId:
            recipient.role === Role.TEACHER
              ? { studentId: session.user.id, teacherId: recipient.recipientId }
              : { studentId: recipient.recipientId, teacherId: session.user.id },
        },
        update: {
          twoWayEnabled,
          twoWayEnabledByRole,
        },
        create:
          recipient.role === Role.TEACHER
            ? {
                studentId: session.user.id,
                teacherId: recipient.recipientId,
                twoWayEnabled,
                twoWayEnabledByRole,
              }
            : {
                studentId: recipient.recipientId,
                teacherId: session.user.id,
                twoWayEnabled,
                twoWayEnabledByRole,
              },
        select: { id: true },
      });
      return { recipientId: recipient.recipientId, threadId: thread.id };
    }),
  );

  await prisma.chatMessage.createMany({
    data: threadAssignments.map((entry) => ({
      threadId: entry.threadId,
      senderId: session.user.id,
      recipientId: entry.recipientId,
      body: parsed.data.body,
    })),
  });

  await Promise.all(
    threadAssignments.flatMap((entry) => [
      emitChatUpdate(entry.recipientId, entry.threadId),
      emitChatUpdate(session.user.id, entry.threadId),
    ]),
  );
  await Promise.all(
    threadAssignments.map((entry) =>
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
      targetedRecipients: threadAssignments.length,
      sentMessages: threadAssignments.length,
    },
  });

  return NextResponse.json({
    ok: true,
    broadcastId: log.id,
    targetedRecipients: threadAssignments.length,
    sentMessages: threadAssignments.length,
  });
}
