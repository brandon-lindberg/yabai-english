import { beforeEach, describe, expect, test, vi } from "vitest";

const { createEventMock, addAttendeeMock, deleteEventMock } = vi.hoisted(() => ({
  createEventMock: vi.fn(),
  addAttendeeMock: vi.fn(),
  deleteEventMock: vi.fn(),
}));

vi.mock("@/lib/google-calendar", () => ({
  createMeetLessonEvent: createEventMock,
  addMeetLessonEventAttendee: addAttendeeMock,
  deleteMeetLessonEvent: deleteEventMock,
}));

import { ensureGroupSessionMeetEvent } from "@/lib/group-lesson-calendar";

const teacher = {
  userId: "teacher-user-1",
  googleCalendarRefreshToken: null,
  calendarId: "primary",
};

function fakePrisma(session: Record<string, unknown>, claimed = 1) {
  return {
    groupLessonSession: {
      findUnique: vi.fn().mockResolvedValue(session),
      updateMany: vi.fn().mockResolvedValue({ count: claimed }),
    },
  };
}

const baseArgs = {
  sessionId: "sess-1",
  teacher,
  summary: "Lesson — Group 60",
  startsAt: new Date("2026-07-05T01:30:00.000Z"),
  endsAt: new Date("2026-07-05T02:30:00.000Z"),
  studentEmail: "student@example.com",
  teacherEmail: "teacher@example.com",
};

describe("ensureGroupSessionMeetEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createEventMock.mockResolvedValue({
      meetUrl: "https://meet.google.com/abc-defg-hij",
      googleEventId: "evt-1",
    });
    addAttendeeMock.mockResolvedValue(true);
    deleteEventMock.mockResolvedValue(true);
  });

  test("opens one event for the class on the first confirmation", async () => {
    const prisma = fakePrisma({ id: "sess-1", googleEventId: null, meetUrl: null });

    const result = await ensureGroupSessionMeetEvent(prisma, baseArgs);

    expect(createEventMock).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      meetUrl: "https://meet.google.com/abc-defg-hij",
      googleEventId: "evt-1",
    });
  });

  test("remembers the event on the class so later seats can find it", async () => {
    const prisma = fakePrisma({ id: "sess-1", googleEventId: null, meetUrl: null });

    await ensureGroupSessionMeetEvent(prisma, baseArgs);

    expect(prisma.groupLessonSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sess-1", googleEventId: null },
        data: expect.objectContaining({
          googleEventId: "evt-1",
          meetUrl: "https://meet.google.com/abc-defg-hij",
          meetCode: "abc-defg-hij",
        }),
      }),
    );
  });

  // The heart of the phase: the second student joins the class that exists,
  // rather than getting a private room of their own.
  test("reuses the class's event for the next student", async () => {
    const prisma = fakePrisma({
      id: "sess-1",
      googleEventId: "evt-1",
      meetUrl: "https://meet.google.com/abc-defg-hij",
      googleCalendarId: "primary",
      meetCode: "abc-defg-hij",
    });

    const result = await ensureGroupSessionMeetEvent(prisma, baseArgs);

    expect(createEventMock).not.toHaveBeenCalled();
    expect(result.meetUrl).toBe("https://meet.google.com/abc-defg-hij");
  });

  test("adds the next student to the class's guest list", async () => {
    const prisma = fakePrisma({
      id: "sess-1",
      googleEventId: "evt-1",
      meetUrl: "https://meet.google.com/abc-defg-hij",
      googleCalendarId: "primary",
    });

    await ensureGroupSessionMeetEvent(prisma, baseArgs);

    expect(addAttendeeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: "evt-1",
        attendeeEmail: "student@example.com",
      }),
    );
  });

  // Two students paying at the same instant both find no event and both create
  // one. Only one can claim the row; the loser cleans up after itself rather
  // than leaving a stray meeting on the teacher's calendar.
  test("keeps a single event when two confirmations race", async () => {
    const prisma = fakePrisma({ id: "sess-1", googleEventId: null, meetUrl: null }, 0);
    prisma.groupLessonSession.findUnique
      .mockResolvedValueOnce({ id: "sess-1", googleEventId: null, meetUrl: null })
      .mockResolvedValueOnce({
        id: "sess-1",
        googleEventId: "evt-winner",
        meetUrl: "https://meet.google.com/win-ner-xyz",
        googleCalendarId: "primary",
        meetCode: "win-ner-xyz",
      });

    const result = await ensureGroupSessionMeetEvent(prisma, baseArgs);

    expect(result.googleEventId).toBe("evt-winner");
    expect(deleteEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: "evt-1" }),
    );
    expect(addAttendeeMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: "evt-winner" }),
    );
  });

  test("carries on without a link when the calendar refuses", async () => {
    createEventMock.mockResolvedValue({
      meetUrl: null,
      googleEventId: null,
      errorCode: "CALENDAR_DISCONNECTED",
    });
    const prisma = fakePrisma({ id: "sess-1", googleEventId: null, meetUrl: null });

    const result = await ensureGroupSessionMeetEvent(prisma, baseArgs);

    // Best-effort throughout the calendar layer: the seat is still sold.
    expect(result.meetUrl).toBeNull();
    expect(prisma.groupLessonSession.updateMany).not.toHaveBeenCalled();
  });

  test("says nothing about a class that has vanished", async () => {
    const prisma = fakePrisma({ id: "sess-1", googleEventId: null, meetUrl: null });
    prisma.groupLessonSession.findUnique.mockResolvedValue(null);

    const result = await ensureGroupSessionMeetEvent(prisma, baseArgs);

    expect(result).toEqual({
      meetUrl: null,
      googleEventId: null,
      googleCalendarId: null,
      meetCode: null,
    });
    expect(createEventMock).not.toHaveBeenCalled();
  });
});
