import { z } from "zod";

/** Stored markdown cap for `Booking.completionNotesMd` (align with API + Prisma + MDXEditor maxLength). */
export const BOOKING_COMPLETION_NOTES_MD_MAX = 10_000;

export const bookingCompletionNotesPatchSchema = z
  .object({
    completionNotesMd: z.string().max(BOOKING_COMPLETION_NOTES_MD_MAX).nullable().optional(),
    externalTranscriptUrl: z.string().max(2048).nullable().optional(),
  })
  .superRefine((body, ctx) => {
    if (
      body.completionNotesMd === undefined &&
      body.externalTranscriptUrl === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide at least one of completionNotesMd or externalTranscriptUrl",
        path: [],
      });
    }
    const raw = body.externalTranscriptUrl;
    if (raw === undefined || raw === null) return;
    const t = raw.trim();
    if (t === "") return;
    if (!z.string().url().safeParse(t).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid transcript URL",
        path: ["externalTranscriptUrl"],
      });
    }
  })
  .transform((body) => ({
    completionNotesMd: body.completionNotesMd,
    externalTranscriptUrl:
      body.externalTranscriptUrl === undefined
        ? undefined
        : body.externalTranscriptUrl === null
          ? null
          : body.externalTranscriptUrl.trim() === ""
            ? null
            : body.externalTranscriptUrl.trim(),
  }));

export type BookingCompletionNotesPatch = z.infer<typeof bookingCompletionNotesPatchSchema>;

export function normalizeBookingCompletionNotesPatch(input: unknown) {
  return bookingCompletionNotesPatchSchema.safeParse(input);
}
