import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isViewerBlockedByCounterpart } from "@/lib/chat-blocking";
import { canSendChatMessage } from "@/lib/chat-permissions";
import {
  chatMessagePartyWhere,
  chatThreadParticipantWhere,
} from "@/lib/chat-threads";

type ThreadParty = {
  name: string | null;
  email: string | null;
  role: Role;
};

/**
 * Admins act as the studio, not as themselves, so their personal name and email
 * never leave this endpoint. The client renders the localized "Admin" label off
 * the accompanying flag instead.
 */
function studentThreadLabel(student: ThreadParty) {
  if (student.role === Role.SUPER_ADMIN) return null;
  return student.name ?? student.email ?? "—";
}

function teacherThreadLabel(
  teacher: ThreadParty & {
    teacherProfile: { displayName: string | null } | null;
  },
) {
  if (teacher.role === Role.SUPER_ADMIN) return null;
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

  // Whether the viewer may write is decided by the same rule the send endpoint
  // applies, so the composer is never enabled for a message the server will
  // refuse. That rule consults a booked lesson only for student senders, so
  // resolve those in two queries rather than one pair per thread.
  const bookedTeacherUserIds = new Set<string>();
  if (session.user.role === Role.STUDENT && visibleThreads.length > 0) {
    const profiles = await prisma.teacherProfile.findMany({
      where: { userId: { in: visibleThreads.map((thread) => thread.teacherId) } },
      select: { id: true, userId: true },
    });
    if (profiles.length > 0) {
      const bookings = await prisma.booking.findMany({
        where: {
          studentId: session.user.id,
          teacherId: { in: profiles.map((profile) => profile.id) },
        },
        select: { teacherId: true },
      });
      const bookedProfileIds = new Set(bookings.map((booking) => booking.teacherId));
      for (const profile of profiles) {
        if (bookedProfileIds.has(profile.id)) bookedTeacherUserIds.add(profile.userId);
      }
    }
  }

  const queue = isAdminViewer ? adminQueue ?? "all" : "all";

  /*
    Unread counts, for every thread at once.

    These were two `count` calls inside the per-thread map — one round-trip per
    thread for a reader, two for an admin — so the query count grew with exactly
    the person who has the most threads. `groupBy` answers the same question in
    one query per kind, and a thread with nothing unread simply has no row,
    which is why the lookup below falls back to zero.
  */
  const threadIds = visibleThreads.map((thread) => thread.id);
  const countsByThread = (rows: { threadId: string; _count: { _all: number } }[]) =>
    new Map(rows.map((row) => [row.threadId, row._count._all]));

  const [viewerUnreadRows, participantUnreadRows] = await Promise.all([
    // The viewer's own badge only ever counts messages addressed to them.
    prisma.chatMessage.groupBy({
      by: ["threadId"],
      where: { threadId: { in: threadIds }, recipientId: session.user.id, readAt: null },
      _count: { _all: true },
    }),
    // Admins additionally get a thread-level count for the moderation queue,
    // which is about what the participants have not read yet.
    isAdminViewer
      ? prisma.chatMessage.groupBy({
          by: ["threadId"],
          where: { threadId: { in: threadIds }, readAt: null },
          _count: { _all: true },
        })
      : Promise.resolve([] as { threadId: string; _count: { _all: number } }[]),
  ]);

  const viewerUnread = countsByThread(viewerUnreadRows);
  const participantUnread = countsByThread(participantUnreadRows);

  const withUnread = await Promise.all(
    visibleThreads.map(async (thread) => {
      const unreadCount = viewerUnread.get(thread.id) ?? 0;
      const participantUnreadCount = isAdminViewer
        ? participantUnread.get(thread.id) ?? 0
        : unreadCount;
      const studentIsAdmin = thread.student.role === Role.SUPER_ADMIN;
      const teacherIsAdmin = thread.teacher.role === Role.SUPER_ADMIN;
      const viewerIsStudentParty = session.user.id === thread.studentId;
      const studentName = studentThreadLabel(thread.student);
      const teacherName = teacherThreadLabel(thread.teacher);
      const viewerCanSend = canSendChatMessage({
        role: session.user.role,
        threadTwoWayEnabled: thread.twoWayEnabled,
        hasScheduledLessonWithTeacher: bookedTeacherUserIds.has(thread.teacherId),
        counterpartRole: viewerIsStudentParty
          ? thread.teacher.role
          : thread.student.role,
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
        studentName,
        studentEmail: studentIsAdmin ? null : thread.student.email,
        studentIsAdmin,
        teacherName,
        teacherEmail: teacherIsAdmin ? null : thread.teacher.email,
        teacherIsAdmin,
        counterpartName: isAdminViewer
          ? [studentName, teacherName].filter(Boolean).join(" · ") || null
          : viewerIsStudentParty
            ? teacherName
            : studentName,
        counterpartIsAdmin: isAdminViewer
          ? false
          : viewerIsStudentParty
            ? teacherIsAdmin
            : studentIsAdmin,
        latestMessage: thread.messages[0]?.body ?? null,
        latestMessageAt: thread.messages[0]?.createdAt ?? null,
        unreadCount,
        participantUnreadCount,
        viewerCanSend,
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
          [
            t.studentName,
            t.studentEmail,
            t.teacherName,
            t.teacherEmail,
            t.counterpartName,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q),
        )
      : filteredByQueue;

  return NextResponse.json(filtered);
}
