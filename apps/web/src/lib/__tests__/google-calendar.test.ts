import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

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

vi.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(() => ({
        setCredentials: vi.fn(),
      })),
    },
    calendar: vi.fn(),
  },
}));

const originalKey = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;

describe("createMeetLessonEvent", () => {
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
    const { google } = await import("googleapis");
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
});
