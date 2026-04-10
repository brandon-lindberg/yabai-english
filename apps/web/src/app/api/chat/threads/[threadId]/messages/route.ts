import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canSendChatMessage } from "@/lib/chat-permissions";
import { createUserNotification } from "@/lib/notifications";
import { emitChatUpdate } from "@/lib/realtime-server";

const postSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

type Props = {
  params: Promise<{ threadId: string }>;
};

export async function GET(_req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId } = await params;
  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
  });
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isParticipant =
    thread.studentId === session.user.id || thread.teacherId === session.user.id;
  if (!isParticipant && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const markRead = await prisma.chatMessage.updateMany({
    where: {
      threadId,
      recipientId: session.user.id,
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  if (markRead.count > 0) {
    const otherUserId =
      session.user.id === thread.studentId ? thread.teacherId : thread.studentId;
    await Promise.all([
      emitChatUpdate(session.user.id, threadId),
      emitChatUpdate(otherUserId, threadId),
    ]);
  }

  const messages = await prisma.chatMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return NextResponse.json(messages);
}

export async function POST(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { threadId } = await params;
  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
  });
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const teacherProfile = await prisma.teacherProfile.findFirst({
    where: { userId: thread.teacherId },
    select: { id: true },
  });
  const hasScheduledLessonWithTeacher = Boolean(
    teacherProfile &&
      (await prisma.booking.findFirst({
        where: {
          studentId: thread.studentId,
          teacherId: teacherProfile.id,
        },
        select: { id: true },
      })),
  );

  if (
    !canSendChatMessage({
      role: session.user.role,
      threadTwoWayEnabled: thread.twoWayEnabled,
      hasScheduledLessonWithTeacher,
    })
  ) {
    return NextResponse.json({ error: "Chat is read-only." }, { status: 403 });
  }

  const recipientId =
    session.user.id === thread.studentId ? thread.teacherId : thread.studentId;

  const message = await prisma.chatMessage.create({
    data: {
      threadId,
      senderId: session.user.id,
      recipientId,
      body: parsed.data.body,
    },
  });

  await createUserNotification({
    userId: recipientId,
    titleJa: "新しいメッセージ",
    titleEn: "New message",
    bodyJa: "チャットに新しいメッセージがあります。",
    bodyEn: "You have a new chat message.",
  });
  await Promise.all([
    emitChatUpdate(session.user.id, threadId),
    emitChatUpdate(recipientId, threadId),
  ]);

  return NextResponse.json(message);
}
