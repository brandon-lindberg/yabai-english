import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const where =
    session.user.role === "STUDENT"
      ? { studentId: session.user.id }
      : session.user.role === "TEACHER"
        ? { teacherId: session.user.id }
        : {};

  const threads = await prisma.chatThread.findMany({
    where,
    include: {
      student: true,
      teacher: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  const withUnread = await Promise.all(
    threads.map(async (thread) => {
      const unreadCount = await prisma.chatMessage.count({
        where: {
          threadId: thread.id,
          recipientId: session.user.id,
          readAt: null,
        },
      });
      return {
        id: thread.id,
        studentId: thread.studentId,
        teacherId: thread.teacherId,
        twoWayEnabled: thread.twoWayEnabled,
        counterpartName:
          session.user.id === thread.studentId
            ? thread.teacher.name ?? thread.teacher.email
            : thread.student.name ?? thread.student.email,
        latestMessage: thread.messages[0]?.body ?? null,
        latestMessageAt: thread.messages[0]?.createdAt ?? null,
        unreadCount,
      };
    }),
  );

  return NextResponse.json(withUnread);
}
