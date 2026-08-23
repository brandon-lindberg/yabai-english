import { google } from "googleapis";
import { decryptIntegrationToken } from "@/lib/calendar-token";

/**
 * Recovering the Gemini meeting-notes document for a finished lesson.
 *
 * Google's "Take notes for me" attaches the document it writes to the Calendar
 * event, which is the only place this app can reach it. Drive is not an option:
 * the integration holds `drive.file`, which grants access to files this app
 * created, and a Gemini document is not one of them. Reading it from Drive
 * would need `drive.readonly` — a restricted scope requiring Google app
 * verification. The Meet API is out for a similar reason: `meetings.space.created`
 * covers spaces created through that API, while these conferences are created
 * through Calendar's `conferenceData`.
 *
 * So: Calendar attachments, using the `calendar.readonly` grant the teacher
 * has already given. No new consent screen.
 */

/** Google Docs. Notes are documents; recordings and transcripts are not. */
const GOOGLE_DOC_MIME = "application/vnd.google-apps.document";

export type CalendarAttachment = {
  fileId?: string | null;
  fileUrl?: string | null;
  title?: string | null;
  mimeType?: string | null;
};

export type MeetingNotesLink = { url: string; title: string | null };

/**
 * Picks the notes document out of an event's attachments.
 *
 * Kept pure and separate from the API call so the selection rules — which are
 * the part that will need adjusting as Google changes what it attaches — can be
 * tested without a Google client.
 */
export function pickNotesAttachment(
  attachments: CalendarAttachment[] | null | undefined,
): MeetingNotesLink | null {
  if (!attachments?.length) return null;

  const docs = attachments.filter(
    (a) => a.mimeType === GOOGLE_DOC_MIME && (a.fileUrl || a.fileId),
  );
  if (docs.length === 0) return null;

  // An event can carry several documents — an agenda the teacher attached
  // beforehand as well as the generated notes. Prefer one Google named as
  // notes; fall back to the first document rather than returning nothing.
  const named = docs.find((a) => /notes|gemini|recap/i.test(a.title ?? ""));
  const chosen = named ?? docs[0];

  const url =
    chosen.fileUrl ??
    (chosen.fileId ? `https://docs.google.com/document/d/${chosen.fileId}/edit` : null);
  if (!url) return null;

  return { url, title: chosen.title ?? null };
}

async function calendarClientForUser(
  prisma: NotesLinkPrisma,
  userId: string,
): Promise<ReturnType<typeof google.calendar> | null> {
  const account = await prisma.googleIntegrationAccount.findUnique({
    where: { userId },
    select: { refreshToken: true, revoked: true },
  });
  if (!account?.refreshToken || account.revoked) return null;

  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) return null;

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: decryptIntegrationToken(account.refreshToken) });
  return google.calendar({ version: "v3", auth: oauth2 });
}

type NotesLinkPrisma = {
  googleIntegrationAccount: {
    findUnique: (args: {
      where: { userId: string };
      select: { refreshToken: true; revoked: true };
    }) => Promise<{ refreshToken: string | null; revoked: boolean } | null>;
  };
  booking: {
    findUnique: (args: {
      where: { id: string };
      include: { teacher: { select: { userId: true } } };
    }) => Promise<{
      id: string;
      googleEventId: string | null;
      googleCalendarId: string | null;
      externalTranscriptUrl: string | null;
      teacher: { userId: string };
    } | null>;
  };
};

export type NotesLinkOutcome =
  | { status: "FOUND"; url: string; title: string | null }
  | { status: "ALREADY_SET"; url: string }
  | { status: "NO_CALENDAR_EVENT" }
  | { status: "NOT_CONNECTED" }
  | { status: "NO_NOTES_YET" }
  | { status: "LOOKUP_FAILED" };

/**
 * Finds the notes link for one booking. Reads only — it never writes.
 *
 * `externalTranscriptUrl` is shown to the student, so storing a link here would
 * publish the teacher's Gemini notes the moment they opened the lesson panel,
 * before they had read a word of it. Publishing is the teacher's decision, made
 * by saving the form; this only offers them the link.
 *
 * A link they already have is returned untouched for the same reason: a
 * document they chose beats one guessed from an attachment list.
 */
export async function resolveBookingNotesLink(
  prisma: NotesLinkPrisma,
  { bookingId }: { bookingId: string },
): Promise<NotesLinkOutcome> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { teacher: { select: { userId: true } } },
  });
  if (!booking) return { status: "NO_CALENDAR_EVENT" };

  const existing = (booking.externalTranscriptUrl ?? "").trim();
  if (existing) return { status: "ALREADY_SET", url: existing };

  if (!booking.googleEventId) return { status: "NO_CALENDAR_EVENT" };

  const cal = await calendarClientForUser(prisma, booking.teacher.userId);
  if (!cal) return { status: "NOT_CONNECTED" };

  let attachments: CalendarAttachment[] | undefined;
  try {
    const event = await cal.events.get({
      calendarId: booking.googleCalendarId ?? "primary",
      eventId: booking.googleEventId,
    });
    attachments = event.data.attachments ?? undefined;
  } catch (err) {
    // A revoked grant, a deleted event, or Google being unavailable. The
    // teacher can still paste the link by hand, so this is reported rather
    // than thrown.
    console.warn(`Notes link lookup failed for booking ${bookingId}:`, err);
    return { status: "LOOKUP_FAILED" };
  }

  const found = pickNotesAttachment(attachments);
  // Gemini writes its notes some minutes after the call ends, so an empty
  // result is usually "not yet" rather than "never".
  if (!found) return { status: "NO_NOTES_YET" };

  return { status: "FOUND", url: found.url, title: found.title };
}
