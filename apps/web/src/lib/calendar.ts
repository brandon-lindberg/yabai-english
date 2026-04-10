export type CalendarExportEvent = {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  startsAt: Date;
  endsAt: Date;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatUtcForCalendar(date: Date) {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

function escapeIcsText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function buildGoogleCalendarUrl(event: CalendarExportEvent) {
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", event.title);
  url.searchParams.set("dates", `${formatUtcForCalendar(event.startsAt)}/${formatUtcForCalendar(event.endsAt)}`);
  if (event.description) url.searchParams.set("details", event.description);
  if (event.location) url.searchParams.set("location", event.location);
  return url.toString();
}

export function buildIcs(events: CalendarExportEvent[]) {
  const dtstamp = formatUtcForCalendar(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//English Studio//Schedule Export//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const event of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${escapeIcsText(event.uid)}`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART:${formatUtcForCalendar(event.startsAt)}`);
    lines.push(`DTEND:${formatUtcForCalendar(event.endsAt)}`);
    lines.push(`SUMMARY:${escapeIcsText(event.title)}`);
    if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
    if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
