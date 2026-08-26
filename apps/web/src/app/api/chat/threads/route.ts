import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isViewerBlockedByCounterpart } from "@/lib/chat-blocking";
import {
  chatMessagePartyWhere,
  chatThreadParticipantWhere,
} from "@/lib/chat-threads";

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

  const isAdminViewer = session.user.role === Role.SUPER_ADMIN;
  // Admins see every thread for moderation; everyone else sees the threads they
  // take part in, whichever slot they occupy.
  const where = (
    isAdminViewer ? {} : chatThreadParticipantWhere(session.user.id)
  ) as Record<string, unknown>;

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
        // The preview is a message body, so it obeys the same rule as reading
        // the thread: participants see only what they are party to.
        ...(isAdminViewer
          ? {}
          : { where: chatMessagePartyWhere(session.user.id) }),
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

  const queue = isAdminViewer ? adminQueue ?? "all" : "all";
  const withUnread = await Promise.all(
    visibleThreads.map(async (thread) => {
      // The viewer's own badge only ever counts messages addressed to them.
      // Admins additionally get a thread-level count for the moderation queue,
      // which is about what the participants have not read yet.
      const unreadCount = await prisma.chatMessage.count({
        where: {
          threadId: thread.id,
          recipientId: session.user.id,
          readAt: null,
        },
      });
      const participantUnreadCount = isAdminViewer
        ? await prisma.chatMessage.count({
            where: { threadId: thread.id, readAt: null },
          })
        : unreadCount;
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
        counterpartName: isAdminViewer
          ? `${studentThreadLabel(thread.student)} · ${teacherThreadLabel(thread.teacher)}`
          : session.user.id === thread.studentId
            ? teacherThreadLabel(thread.teacher)
            : studentThreadLabel(thread.student),
        latestMessage: thread.messages[0]?.body ?? null,
        latestMessageAt: thread.messages[0]?.createdAt ?? null,
        unreadCount,
        participantUnreadCount,
      };
    }),
  );

  const filteredByQueue =
    queue === "reported"
      ? withUnread.filter((t) => t.studentReportedAt || t.teacherReportedAt)
      : queue === "blocked"
        ? withUnread.filter((t) => t.studentBlockedAt || t.teacherBlockedAt)
        : queue === "unread"
          ? withUnread.filter((t) => t.participantUnreadCount > 0)
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
