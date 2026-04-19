/**
 * Format an instant for lesson UI. Pass `timeZone` (IANA) for deterministic server output;
 * omit `timeZone` in the browser so the viewer’s local zone is used (matches calendar chips).
 */
export function formatLessonInstant(
  iso: string,
  locale: string,
  timeZone?: string,
): string {
  return new Date(iso).toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    ...(timeZone ? { timeZone } : {}),
  });
}
