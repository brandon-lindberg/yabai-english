import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { lessonSubjectCases } from "../../../test/lesson-subject-fixture";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    googleIntegrationAccount: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    googleIntegrationSettings: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("googleapis/build/src/apis/calendar", () => ({
  auth: {
    OAuth2: vi.fn().mockImplementation(() => ({
      setCredentials: vi.fn(),
    })),
  },
  calendar: vi.fn(),
}));

const originalKey = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;

describe("Google lesson calendar operations", () => {
  test.each(lessonSubjectCases)("the existing Google client creates the $learningLanguage lesson event", async ({ nameEn }) => {
    const { encryptRefreshToken } = await import("@/lib/calendar-token");
    const google = await import("googleapis/build/src/apis/calendar");
    const { createMeetLessonEvent } = await import("@/lib/google-calendar");
    prismaMock.googleIntegrationAccount.findUnique.mockResolvedValue({ refreshToken: encryptRefreshToken("test-token"), revoked: false });
    const insert = vi.fn().mockResolvedValue({ data: { id: "existing-google-event", hangoutLink: "https://meet.google.com/test-room" } });
    vi.mocked(google.calendar).mockReturnValue({ events: { insert } } as never);
    const start = new Date("2026-11-01T00:00:00Z"), end = new Date("2026-11-01T01:00:00Z");
    expect(await createMeetLessonEvent({ organizerUserId: "same-teacher", refreshTokenEncrypted: null, summary: nameEn, start, end, attendeeEmails: ["student@example.invalid"] })).toMatchObject({ meetUrl: "https://meet.google.com/test-room", googleEventId: "existing-google-event" });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ calendarId: "primary", requestBody: expect.objectContaining({ summary: nameEn, start: { dateTime: start.toISOString() }, attendees: [{ email: "student@example.invalid" }] }) }));
  });
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_GOOGLE_ID = "google-client-id";
    process.env.AUTH_GOOGLE_SECRET = "google-client-secret";
    process.env.CALENDAR_TOKEN_ENCRYPTION_KEY =
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    prismaMock.googleIntegrationAccount.findUnique.mockResolvedValue({
      refreshToken: "enc:v1:not-decryptable",
      revoked: false,
    });
    prismaMock.googleIntegrationSettings.findUnique.mockResolvedValue({
      preferredCalendarId: "primary",
      autoCreateMeetLink: true,
      calendarConnected: true,
    });
    prismaMock.googleIntegrationAccount.update.mockResolvedValue({});
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
    } else {
      process.env.CALENDAR_TOKEN_ENCRYPTION_KEY = originalKey;
    }
  });

  test("records a diagnostic instead of throwing when an encrypted token cannot be decrypted", async () => {
    const { createMeetLessonEvent } = await import("@/lib/google-calendar");

    const result = await createMeetLessonEvent({
      organizerUserId: "teacher-user-1",
      refreshTokenEncrypted: null,
      calendarId: "primary",
      summary: "Lesson",
      start: new Date("2026-06-21T01:00:00.000Z"),
      end: new Date("2026-06-21T01:30:00.000Z"),
      attendeeEmails: ["student@example.com", "teacher@example.com"],
    });

    expect(result).toEqual(
      expect.objectContaining({
        meetUrl: null,
        googleEventId: null,
        errorCode: "CALENDAR_CREATE_FAILED",
      }),
    );
    expect(prismaMock.googleIntegrationAccount.update).toHaveBeenCalledWith({
      where: { userId: "teacher-user-1" },
      data: expect.objectContaining({
        lastErrorCode: "CALENDAR_CREATE_FAILED",
        lastErrorMessage: expect.any(String),
        lastSyncedAt: expect.any(Date),
      }),
    });
  });

  test("marks revoked and returns gracefully when Google returns invalid_grant", async () => {
    const { encryptRefreshToken } = await import("@/lib/calendar-token");
    const google = await import("googleapis/build/src/apis/calendar");
    const encrypted = encryptRefreshToken("refresh-token");
    prismaMock.googleIntegrationAccount.findUnique.mockResolvedValue({
      refreshToken: encrypted,
      revoked: false,
    });
    const invalidGrant = Object.assign(new Error("invalid_grant"), {
      response: { data: { error: "invalid_grant", error_description: "Bad Request" } },
    });
    vi.mocked(google.calendar).mockReturnValue({
      events: {
        insert: vi.fn().mockRejectedValue(invalidGrant),
      },
    } as never);

    const { createMeetLessonEvent } = await import("@/lib/google-calendar");

    const result = await createMeetLessonEvent({
      organizerUserId: "teacher-user-1",
      refreshTokenEncrypted: encrypted,
      calendarId: "primary",
      summary: "Lesson",
      start: new Date("2026-06-21T01:00:00.000Z"),
      end: new Date("2026-06-21T01:30:00.000Z"),
      attendeeEmails: ["student@example.com"],
    });

    expect(result).toEqual(
      expect.objectContaining({
        meetUrl: null,
        googleEventId: null,
        errorCode: "GOOGLE_INVALID_GRANT",
      }),
    );
    expect(prismaMock.googleIntegrationAccount.update).toHaveBeenCalledWith({
      where: { userId: "teacher-user-1" },
      data: expect.objectContaining({
        lastErrorCode: "GOOGLE_INVALID_GRANT",
        revoked: true,
      }),
    });
  });

  test("rescheduling, guest updates, cancellation and notes lookup use the existing teacher calendar", async () => {
    const { encryptRefreshToken } = await import("@/lib/calendar-token");
    const google = await import("googleapis/build/src/apis/calendar");
    const { patchMeetLessonEvent, addMeetLessonEventAttendee, removeMeetLessonEventAttendee, deleteMeetLessonEvent } = await import("@/lib/google-calendar");
    const { resolveBookingNotesLink } = await import("@/lib/google/meeting-notes-link");
    prismaMock.googleIntegrationAccount.findUnique.mockResolvedValue({ refreshToken: encryptRefreshToken("teacher-token"), revoked: false });
    prismaMock.googleIntegrationSettings.findUnique.mockResolvedValue({ preferredCalendarId: "teacher-calendar", calendarConnected: true });
    const attendees = [{ email: "existing@example.test" }, { email: "leaving@example.test" }];
    const notesUrl = "https://docs.google.com/document/d/test-notes/edit";
    const events = {
      get: vi.fn().mockResolvedValue({ data: { attendees, attachments: [{ mimeType: "application/vnd.google-apps.document", fileUrl: notesUrl, title: "Notes by Gemini" }] } }),
      patch: vi.fn().mockResolvedValue({ data: {} }),
      delete: vi.fn().mockResolvedValue({ data: {} }),
    };
    vi.mocked(google.calendar).mockReturnValue({ events } as never);
    const booking = { organizerUserId: "teacher", refreshTokenEncrypted: null, calendarId: "fallback", eventId: "event" };
    const start = new Date("2026-11-20T00:00:00Z"), end = new Date("2026-11-20T01:00:00Z");
    expect(await patchMeetLessonEvent({ ...booking, start, end })).toBe(true);
    expect(events.patch).toHaveBeenLastCalledWith({ calendarId: "teacher-calendar", eventId: "event", requestBody: { start: { dateTime: start.toISOString() }, end: { dateTime: end.toISOString() } }, sendUpdates: "all" });
    expect(await addMeetLessonEventAttendee({ ...booking, attendeeEmail: "new@example.test" })).toBe(true);
    expect(events.patch).toHaveBeenLastCalledWith(expect.objectContaining({ requestBody: { attendees: [...attendees, { email: "new@example.test" }] } }));
    expect(await removeMeetLessonEventAttendee({ ...booking, attendeeEmail: "leaving@example.test" })).toBe(true);
    expect(events.patch).toHaveBeenLastCalledWith(expect.objectContaining({ requestBody: { attendees: [{ email: "existing@example.test" }] } }));
    expect(await deleteMeetLessonEvent(booking)).toBe(true);
    expect(events.delete).toHaveBeenCalledWith({ calendarId: "teacher-calendar", eventId: "event", sendUpdates: "all" });
    expect(await resolveBookingNotesLink({ ...prismaMock, booking: { findUnique: vi.fn().mockResolvedValue({ id: "booking", teacher: { userId: "teacher" }, googleEventId: "event", googleCalendarId: "teacher-calendar", externalTranscriptUrl: null }) } }, { bookingId: "booking" })).toEqual({ status: "FOUND", url: notesUrl, title: "Notes by Gemini" });
    expect(events.get).toHaveBeenLastCalledWith({ calendarId: "teacher-calendar", eventId: "event" });
  });
});
