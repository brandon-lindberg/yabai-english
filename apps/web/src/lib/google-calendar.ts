import { randomUUID } from "crypto";
import { google, calendar_v3 } from "googleapis";
import { decryptRefreshToken } from "@/lib/calendar-token";

type MeetEventResult = {
  meetUrl: string | null;
  googleEventId: string | null;
};

export async function createMeetLessonEvent(params: {
  refreshTokenEncrypted: string | null | undefined;
  calendarId?: string | null;
  summary: string;
  start: Date;
  end: Date;
  attendeeEmails: string[];
}): Promise<MeetEventResult> {
  if (!params.refreshTokenEncrypted) {
    return { meetUrl: null, googleEventId: null };
  }

  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) {
    return { meetUrl: null, googleEventId: null };
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  const refresh = decryptRefreshToken(params.refreshTokenEncrypted);
  oauth2Client.setCredentials({ refresh_token: refresh });

  const cal = google.calendar({
    version: "v3",
    auth: oauth2Client,
  });

  const calendarId = params.calendarId || "primary";

  const requestId = randomUUID();

  const event: calendar_v3.Schema$Event = {
    summary: params.summary,
    start: { dateTime: params.start.toISOString() },
    end: { dateTime: params.end.toISOString() },
    attendees: params.attendeeEmails.map((email) => ({ email })),
    conferenceData: {
      createRequest: {
        requestId,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  try {
    const created = await cal.events.insert({
      calendarId,
      requestBody: event,
      conferenceDataVersion: 1,
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
  refreshTokenEncrypted: string | null | undefined;
  calendarId?: string | null;
  eventId: string;
  start: Date;
  end: Date;
}): Promise<boolean> {
  if (!params.refreshTokenEncrypted || !params.eventId) return false;

  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) return false;

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({
    refresh_token: decryptRefreshToken(params.refreshTokenEncrypted),
  });

  const cal = google.calendar({ version: "v3", auth: oauth2Client });
  const calendarId = params.calendarId || "primary";

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
