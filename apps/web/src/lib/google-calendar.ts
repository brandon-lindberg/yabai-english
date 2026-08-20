import { randomUUID } from "crypto";
import { google, calendar_v3 } from "googleapis";
import { decryptRefreshToken } from "@/lib/calendar-token";
import { prisma } from "@/lib/prisma";

type MeetEventResult = {
  meetUrl: string | null;
  googleEventId: string | null;
  errorCode?: string;
  errorMessage?: string;
};

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function isInvalidGrant(err: unknown): boolean {
  if (!(err && typeof err === "object")) return false;
  const candidate = err as {
    message?: string;
    response?: { data?: { error?: string } };
  };
  return (
    candidate.message?.includes("invalid_grant") === true ||
    candidate.response?.data?.error === "invalid_grant"
  );
}

async function recordGoogleIntegrationError(
  userId: string | undefined,
  code: string,
  err: unknown,
) {
  if (!userId) return;
  const invalidGrant = isInvalidGrant(err);
  try {
    await prisma.googleIntegrationAccount.update({
      where: { userId },
      data: {
        lastErrorCode: invalidGrant ? "GOOGLE_INVALID_GRANT" : code,
        lastErrorMessage: errorMessage(err).slice(0, 2000),
        lastSyncedAt: new Date(),
        ...(invalidGrant ? { revoked: true } : {}),
      },
    });
  } catch {
    // Do not let diagnostic persistence break booking confirmation.
  }
}

/**
 * Resolve which calendar to act on and with whose credentials.
 *
 * `createMeetLessonEvent`, `patchMeetLessonEvent` and `deleteMeetLessonEvent`
 * each opened with the same block: look up the organizer's integration and
 * settings, honour a disconnected calendar, prefer the stored refresh token,
 * prefer the configured calendar id. Three copies of the check that decides
 * whether we may touch someone's calendar at all.
 *
 * Returns `null` when the calendar must not be used — disconnected, no token,
 * or the app is not configured — so every caller fails closed by construction.
 */
async function resolveCalendarContext(params: {
  organizerUserId?: string;
  refreshTokenEncrypted: string | null | undefined;
  calendarId?: string | null;
  /** Additionally require `autoCreateMeetLink`, for event creation. */
  requireAutoCreate?: boolean;
}): Promise<{ cal: calendar_v3.Calendar; calendarId: string } | null> {
  let refreshTokenEncrypted = params.refreshTokenEncrypted;
  let calendarId = params.calendarId || "primary";

  if (params.organizerUserId) {
    const [integration, settings] = await Promise.all([
      prisma.googleIntegrationAccount.findUnique({
        where: { userId: params.organizerUserId },
        select: { refreshToken: true, revoked: true },
      }),
      prisma.googleIntegrationSettings.findUnique({
        where: { userId: params.organizerUserId },
        select: {
          preferredCalendarId: true,
          autoCreateMeetLink: true,
          calendarConnected: true,
        },
      }),
    ]);
    if (settings?.calendarConnected === false) return null;
    if (params.requireAutoCreate && settings?.autoCreateMeetLink === false) return null;
    if (integration?.refreshToken && !integration.revoked) {
      refreshTokenEncrypted = integration.refreshToken;
    }
    if (settings?.preferredCalendarId) {
      calendarId = settings.preferredCalendarId;
    }
  }

  if (!refreshTokenEncrypted) return null;

  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) return null;

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: decryptRefreshToken(refreshTokenEncrypted) });

  return { cal: google.calendar({ version: "v3", auth: oauth2Client }), calendarId };
}

export async function createMeetLessonEvent(params: {
  organizerUserId?: string;
  refreshTokenEncrypted: string | null | undefined;
  calendarId?: string | null;
  summary: string;
  start: Date;
  end: Date;
  attendeeEmails: string[];
  createMeetLink?: boolean;
}): Promise<MeetEventResult> {
  let refreshTokenEncrypted = params.refreshTokenEncrypted;
  let calendarId = params.calendarId || "primary";
  if (params.organizerUserId) {
    const [integration, settings] = await Promise.all([
      prisma.googleIntegrationAccount.findUnique({
        where: { userId: params.organizerUserId },
        select: { refreshToken: true, revoked: true },
      }),
      prisma.googleIntegrationSettings.findUnique({
        where: { userId: params.organizerUserId },
        select: { preferredCalendarId: true, autoCreateMeetLink: true, calendarConnected: true },
      }),
    ]);
    if (settings?.autoCreateMeetLink === false || settings?.calendarConnected === false) {
      return {
        meetUrl: null,
        googleEventId: null,
        errorCode: "GOOGLE_CALENDAR_NOT_CONNECTED",
        errorMessage: "Google Calendar is not connected.",
      };
    }
    if (integration?.refreshToken && !integration.revoked) {
      refreshTokenEncrypted = integration.refreshToken;
    }
    if (settings?.preferredCalendarId) {
      calendarId = settings.preferredCalendarId;
    }
  }

  if (!refreshTokenEncrypted) {
    return {
      meetUrl: null,
      googleEventId: null,
      errorCode: "GOOGLE_CALENDAR_NOT_CONNECTED",
      errorMessage: "Google Calendar is not connected.",
    };
  }

  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) {
    return {
      meetUrl: null,
      googleEventId: null,
      errorCode: "GOOGLE_CALENDAR_MISCONFIGURED",
      errorMessage: "Google Calendar OAuth credentials are not configured.",
    };
  }

  try {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    const refresh = decryptRefreshToken(refreshTokenEncrypted);
    oauth2Client.setCredentials({ refresh_token: refresh });

    const cal = google.calendar({
      version: "v3",
      auth: oauth2Client,
    });

    const requestId = randomUUID();

    const event: calendar_v3.Schema$Event = {
      summary: params.summary,
      start: { dateTime: params.start.toISOString() },
      end: { dateTime: params.end.toISOString() },
      attendees: params.attendeeEmails.map((email) => ({ email })),
    };
    if (params.createMeetLink !== false) {
      event.conferenceData = {
        createRequest: {
          requestId,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      };
    }

    const created = await cal.events.insert({
      calendarId,
      requestBody: event,
      conferenceDataVersion: params.createMeetLink === false ? 0 : 1,
      sendUpdates: "all",
    });

    const meetUrl =
      created.data.hangoutLink ||
      created.data.conferenceData?.entryPoints?.find(
        (e) => e.entryPointType === "video",
      )?.uri ||
      null;

    return {
      meetUrl,
      googleEventId: created.data.id ?? null,
    };
  } catch (err) {
    if (isInvalidGrant(err)) {
      console.warn("Google Calendar token expired; reconnect required.");
    } else {
      console.error("Google Calendar create failed:", err);
    }
    await recordGoogleIntegrationError(
      params.organizerUserId,
      isInvalidGrant(err) ? "GOOGLE_INVALID_GRANT" : "CALENDAR_CREATE_FAILED",
      err,
    );
    return {
      meetUrl: null,
      googleEventId: null,
      errorCode: isInvalidGrant(err) ? "GOOGLE_INVALID_GRANT" : "CALENDAR_CREATE_FAILED",
      errorMessage: errorMessage(err),
    };
  }
}

export async function patchMeetLessonEvent(params: {
  organizerUserId?: string;
  refreshTokenEncrypted: string | null | undefined;
  calendarId?: string | null;
  eventId: string;
  start: Date;
  end: Date;
}): Promise<boolean> {
  if (!params.eventId) return false;
  const ctx = await resolveCalendarContext(params);
  if (!ctx) return false;

  try {
    await ctx.cal.events.patch({
      calendarId: ctx.calendarId,
      eventId: params.eventId,
      requestBody: {
        start: { dateTime: params.start.toISOString() },
        end: { dateTime: params.end.toISOString() },
      },
      sendUpdates: "all",
    });
    return true;
  } catch (err) {
    console.error("Google Calendar patch failed:", err);
    return false;
  }
}

export async function deleteMeetLessonEvent(params: {
  organizerUserId?: string;
  refreshTokenEncrypted: string | null | undefined;
  calendarId?: string | null;
  eventId: string;
}): Promise<boolean> {
  if (!params.eventId) return false;
  const ctx = await resolveCalendarContext(params);
  if (!ctx) return false;

  try {
    await ctx.cal.events.delete({
      calendarId: ctx.calendarId,
      eventId: params.eventId,
      sendUpdates: "all",
    });
    return true;
  } catch (err) {
    console.error("Google Calendar delete failed:", err);
    return false;
  }
}
