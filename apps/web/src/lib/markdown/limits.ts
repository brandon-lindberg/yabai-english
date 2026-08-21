/**
 * Stored markdown caps, shared by the editor, the API schema and Prisma.
 *
 * The cap counts markdown *source*, not rendered text — bolding a word costs
 * four characters. That is what the column stores, so it is what we measure.
 */

/** `TeacherProfile.bio` — `@db.Text`, validated at this width by the API. */
export const TEACHER_BIO_MAX_CHARS = 2000;

/** `TeacherProfile.credentials` — `@db.Text`. */
export const TEACHER_CREDENTIALS_MAX_CHARS = 2000;

/** `StudentProfile.placementReviewReason`, and the placement review admin note. */
export const PLACEMENT_NOTE_MAX_CHARS = 1000;

/** `Organization.description` / `School.description` — `@db.Text`. */
export const ENTITY_DESCRIPTION_MAX_CHARS = 2000;

/**
 * Trim markdown to `max`, leaving it alone when it already fits.
 *
 * The at-limit case matters: the editor resyncs its document whenever this
 * returns something different, and resyncing puts the caret at the end. Typing
 * while exactly at the cap must therefore come back identical.
 */
export function clipMarkdown(markdown: string, max: number | undefined): string {
  if (typeof max !== "number" || max <= 0) return markdown;
  return markdown.length <= max ? markdown : markdown.slice(0, max);
}
