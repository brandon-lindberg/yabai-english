import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isViewerBlockedByCounterpart } from "@/lib/chat-blocking";

function studentThreadLabel(student: { name: string | null; email: string | null }) {
  return student.name ?? student.email ?? "—";
}

function teacherThreadLabel(
  teacher: {
    name: string | null;
    email: string | null;
    teacherProfile: { displayName: string | null } | null;
  },
) {
  return (
    teacher.teacherProfile?.displayName ?? teacher.name ?? teacher.email ?? "—"
  );
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const adminQueue = url.searchParams.get("queue");
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";

  const roleScopedWhere =
    session.user.role === "STUDENT"
      ? { studentId: session.user.id }
      : session.user.role === "TEACHER"
        ? { teacherId: session.user.id }
        : {};

  const where = { ...roleScopedWhere } as Record<string, unknown>;

  const threads = await prisma.chatThread.findMany({
    where,
    include: {
      student: true,
      teacher: {
        include: {
          teacherProfile: { select: { displayName: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  const visibleThreads = threads.filter(
    (thread) => {
      if (isViewerBlockedByCounterpart(thread, session.user.id)) return false;
      const latestMessageAt = thread.messages[0]?.createdAt ?? null;
      if (
        thread.studentId === session.user.id &&
        thread.studentArchivedAt &&
        (!latestMessageAt || thread.studentArchivedAt >= latestMessageAt)
      ) {
        return false;
      }
      if (
        thread.teacherId === session.user.id &&
        thread.teacherArchivedAt &&
        (!latestMessageAt || thread.teacherArchivedAt >= latestMessageAt)
      ) {
        return false;
      }
      return true;
    },
  );

  const queue = session.user.role === Role.ADMIN ? adminQueue ?? "all" : "all";
  const withUnread = await Promise.all(
    visibleThreads.map(async (thread) => {
      const unreadCount = await prisma.chatMessage.count({
        where: {
          threadId: thread.id,
          ...(session.user.role === Role.ADMIN
            ? {}
            : { recipientId: session.user.id }),
          readAt: null,
        },
      });
      return {
        id: thread.id,
        studentId: thread.studentId,
        teacherId: thread.teacherId,
        twoWayEnabled: thread.twoWayEnabled,
        studentBlockedAt: thread.studentBlockedAt,
        teacherBlockedAt: thread.teacherBlockedAt,
        studentReportedAt: thread.studentReportedAt,
        teacherReportedAt: thread.teacherReportedAt,
        studentReportReason: thread.studentReportReason,
        teacherReportReason: thread.teacherReportReason,
        studentArchivedAt: thread.studentArchivedAt,
        teacherArchivedAt: thread.teacherArchivedAt,
        studentName: studentThreadLabel(thread.student),
        studentEmail: thread.student.email,
        teacherName: teacherThreadLabel(thread.teacher),
        teacherEmail: thread.teacher.email,
        counterpartName:
          session.user.role === Role.ADMIN
            ? `${studentThreadLabel(thread.student)} · ${teacherThreadLabel(thread.teacher)}`
            : session.user.id === thread.studentId
              ? teacherThreadLabel(thread.teacher)
              : studentThreadLabel(thread.student),
        latestMessage: thread.messages[0]?.body ?? null,
        latestMessageAt: thread.messages[0]?.createdAt ?? null,
        unreadCount,
      };
    }),
  );

  const filteredByQueue =
    queue === "reported"
      ? withUnread.filter((t) => t.studentReportedAt || t.teacherReportedAt)
      : queue === "blocked"
        ? withUnread.filter((t) => t.studentBlockedAt || t.teacherBlockedAt)
        : queue === "unread"
          ? withUnread.filter((t) => t.unreadCount > 0)
          : withUnread;

  const filtered =
    q.length > 0
      ? filteredByQueue.filter((t) =>
          `${t.studentName} ${t.studentEmail ?? ""} ${t.teacherName} ${t.teacherEmail ?? ""} ${t.counterpartName}`
            .toLowerCase()
            .includes(q),
        )
      : filteredByQueue;

  return NextResponse.json(filtered);
}
