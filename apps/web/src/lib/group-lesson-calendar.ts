import {
  addMeetLessonEventAttendee,
  createMeetLessonEvent,
  deleteMeetLessonEvent,
} from "@/lib/google-calendar";

/**
 * One Meet link for a group class, however many students book it.
 *
 * A private lesson gets an event per booking, which is the same thing as an
 * event per class when the class is one student. A group class is not: five
 * seats used to mean five separate meetings and five different links for
 * people who are supposed to be in the room together.
 *
 * The link is stored on the session and mirrored onto every booking, so the
 * dashboard, the ICS feed and the notes link keep reading one field on the
 * booking and never have to learn that a class was shared.
 *
 * Best-effort, like every other calendar call here: a class with no link is a
 * problem to fix, not a reason to refuse a seat somebody has paid for.
 */

export type GroupSessionMeetEvent = {
  meetUrl: string | null;
  googleEventId: string | null;
  googleCalendarId: string | null;
  meetCode: string | null;
};

const NO_EVENT: GroupSessionMeetEvent = {
  meetUrl: null,
  googleEventId: null,
  googleCalendarId: null,
  meetCode: null,
};

type SessionRow = {
  id: string;
  googleEventId?: string | null;
  meetUrl?: string | null;
  googleCalendarId?: string | null;
  meetCode?: string | null;
};

type CalendarPrisma = {
  groupLessonSession: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findUnique: (args: any) => Promise<SessionRow | null>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateMany: (args: any) => Promise<{ count: number }>;
  };
};

function meetCodeFrom(meetUrl: string | null | undefined): string | null {
  return meetUrl ? meetUrl.split("/").pop() ?? null : null;
}

function eventOf(session: SessionRow): GroupSessionMeetEvent {
  return {
    meetUrl: session.meetUrl ?? null,
    googleEventId: session.googleEventId ?? null,
    googleCalendarId: session.googleCalendarId ?? null,
    meetCode: session.meetCode ?? meetCodeFrom(session.meetUrl),
  };
}

export async function ensureGroupSessionMeetEvent(
  prisma: CalendarPrisma,
  {
    sessionId,
    teacher,
    summary,
    startsAt,
    endsAt,
    studentEmail,
    teacherEmail,
  }: {
    sessionId: string;
    teacher: {
      userId: string;
      googleCalendarRefreshToken: string | null;
      calendarId: string | null;
    };
    summary: string;
    startsAt: Date;
    endsAt: Date;
    studentEmail: string | null;
    teacherEmail: string | null;
  },
): Promise<GroupSessionMeetEvent> {
  const session = await prisma.groupLessonSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      googleEventId: true,
      meetUrl: true,
      googleCalendarId: true,
      meetCode: true,
    },
  });
  if (!session) return NO_EVENT;

  const addStudent = async (event: GroupSessionMeetEvent) => {
    if (event.googleEventId && studentEmail) {
      await addMeetLessonEventAttendee({
        organizerUserId: teacher.userId,
        refreshTokenEncrypted: teacher.googleCalendarRefreshToken,
        calendarId: event.googleCalendarId ?? teacher.calendarId,
        eventId: event.googleEventId,
        attendeeEmail: studentEmail,
      });
    }
    return event;
  };

  // The class already meets somewhere; this student joins it.
  if (session.googleEventId) {
    return addStudent(eventOf(session));
  }

  const created = await createMeetLessonEvent({
    organizerUserId: teacher.userId,
    refreshTokenEncrypted: teacher.googleCalendarRefreshToken,
    calendarId: teacher.calendarId,
    summary,
    start: startsAt,
    end: endsAt,
    attendeeEmails: [teacherEmail, studentEmail].filter(Boolean) as string[],
  });
  if (!created.googleEventId && !created.meetUrl) {
    return NO_EVENT;
  }

  const googleCalendarId = teacher.calendarId ?? "primary";
  const claimed = await prisma.groupLessonSession.updateMany({
    // Only if the class still has no event: two students confirming at the same
    // instant both get here, and exactly one of them may win.
    where: { id: sessionId, googleEventId: null },
    data: {
      googleEventId: created.googleEventId,
      meetUrl: created.meetUrl,
      googleCalendarId,
      meetCode: meetCodeFrom(created.meetUrl),
    },
  });

  if (claimed.count === 0) {
    // Somebody else's event is the class's event now. Take ours back off the
    // teacher's calendar rather than leaving a meeting nobody will attend.
    if (created.googleEventId) {
      await deleteMeetLessonEvent({
        organizerUserId: teacher.userId,
        refreshTokenEncrypted: teacher.googleCalendarRefreshToken,
        calendarId: googleCalendarId,
        eventId: created.googleEventId,
      });
    }
    const winner = await prisma.groupLessonSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        googleEventId: true,
        meetUrl: true,
        googleCalendarId: true,
        meetCode: true,
      },
    });
    return winner ? addStudent(eventOf(winner)) : NO_EVENT;
  }

  return {
    meetUrl: created.meetUrl,
    googleEventId: created.googleEventId,
    googleCalendarId,
    meetCode: meetCodeFrom(created.meetUrl),
  };
}
