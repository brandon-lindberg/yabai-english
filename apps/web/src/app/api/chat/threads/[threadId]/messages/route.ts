import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canSendChatMessage } from "@/lib/chat-permissions";
import { isConversationBlocked, isViewerBlockedByCounterpart } from "@/lib/chat-blocking";
import {
  chatMessageData,
  chatMessagePartyWhere,
  resolveChatRecipientId,
  touchChatThread,
} from "@/lib/chat-threads";
import { emitChatUpdate } from "@/lib/realtime-server";
import { createUserNotification } from "@/lib/notifications";

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
  if (!isParticipant && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (isViewerBlockedByCounterpart(thread, session.user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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

  // Belonging to a thread is not the same as being party to every message in
  // it. Participants only ever read what they sent or were sent; a non-
  // participant admin reads the whole thread, which is what moderation is for.
  const messages = await prisma.chatMessage.findMany({
    where: {
      threadId,
      ...(isParticipant ? chatMessagePartyWhere(session.user.id) : {}),
    },
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

  // Admins can read any thread for moderation, but they may only write into
  // threads they are actually part of. Otherwise an admin message would land
  // inside a student/teacher conversation and be delivered to whichever
  // participant happened to occupy the other slot.
  const recipientId = resolveChatRecipientId(thread, session.user.id);
  if (!recipientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (isViewerBlockedByCounterpart(thread, session.user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (isConversationBlocked(thread)) {
    return NextResponse.json(
      { error: "Messaging is blocked for this conversation." },
      { status: 403 },
    );
  }

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

  const counterpart = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { role: true },
  });

  if (
    !canSendChatMessage({
      role: session.user.role,
      threadTwoWayEnabled: thread.twoWayEnabled,
      hasScheduledLessonWithTeacher,
      counterpartRole: counterpart?.role,
    })
  ) {
    return NextResponse.json({ error: "Chat is read-only." }, { status: 403 });
  }

  const message = await prisma.chatMessage.create({
    data: chatMessageData(thread, session.user.id, parsed.data.body),
  });

  await touchChatThread(threadId);

  await Promise.all([
    emitChatUpdate(session.user.id, threadId),
    emitChatUpdate(recipientId, threadId),
  ]);

  // Only admin messages reach the notification bell. Everything else is already
  // announced by the unread badge on the Messages button, and a bell entry
  // would duplicate the body and leave the reader a second thing to dismiss.
  if (session.user.role === "SUPER_ADMIN") {
    await createUserNotification({
      userId: recipientId,
      titleJa: "管理者から新しいメッセージがあります",
      titleEn: "You have a new message from admin",
      bodyJa: parsed.data.body,
      bodyEn: parsed.data.body,
    });
  }

  return NextResponse.json(message);
}
