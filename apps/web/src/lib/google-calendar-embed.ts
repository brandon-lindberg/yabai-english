/**
 * Build the official Google Calendar embed URL (`calendar.google.com/calendar/embed`).
 * `preferredCalendarId` of `"primary"` maps to the signed-in user's Google email.
 */
export function buildGoogleCalendarEmbedSrc(input: {
  preferredCalendarId: string | null | undefined;
  userEmail: string | null | undefined;
  timeZone: string;
}): string | null {
  const raw = (input.preferredCalendarId ?? "primary").trim();
  const calendarAddress =
    raw === "" || raw.toLowerCase() === "primary"
      ? (input.userEmail?.trim() ?? null)
      : raw;
  if (!calendarAddress) return null;

  const params = new URLSearchParams({
    src: calendarAddress,
    ctz: input.timeZone.trim() || "UTC",
    mode: "WEEK",
    wkst: "1",
    bgcolor: "#ffffff",
  });

  return `https://calendar.google.com/calendar/embed?${params.toString()}`;
}
