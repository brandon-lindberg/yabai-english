import { randomUUID } from "crypto";
import { google, calendar_v3 } from "googleapis";
import { decryptRefreshToken } from "@/lib/calendar-token";
import { prisma } from "@/lib/prisma";

type MeetEventResult = {
  meetUrl: string | null;
  googleEventId: string | null;
};

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
      return { meetUrl: null, googleEventId: null };
    }
    if (integration?.refreshToken && !integration.revoked) {
      refreshTokenEncrypted = integration.refreshToken;
    }
    if (settings?.preferredCalendarId) {
      calendarId = settings.preferredCalendarId;
    }
  }

  if (!refreshTokenEncrypted) {
    return { meetUrl: null, googleEventId: null };
  }

  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) {
    return { meetUrl: null, googleEventId: null };
  }

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

  try {
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
    console.error("Google Calendar create failed:", err);
    return { meetUrl: null, googleEventId: null };
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
        select: { preferredCalendarId: true, calendarConnected: true },
      }),
    ]);
    if (settings?.calendarConnected === false) return false;
    if (integration?.refreshToken && !integration.revoked) {
      refreshTokenEncrypted = integration.refreshToken;
    }
    if (settings?.preferredCalendarId) {
      calendarId = settings.preferredCalendarId;
    }
  }

  if (!refreshTokenEncrypted || !params.eventId) return false;

  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) return false;

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({
    refresh_token: decryptRefreshToken(refreshTokenEncrypted),
  });

  const cal = google.calendar({ version: "v3", auth: oauth2Client });
  try {
    await cal.events.patch({
      calendarId,
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
