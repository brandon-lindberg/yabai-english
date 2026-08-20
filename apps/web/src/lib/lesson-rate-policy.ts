export const MIN_PUBLIC_LESSON_RATE_YEN = 3000;

export function validatePublicLessonRateYen(rateYen: number | null | undefined):
  | { ok: true }
  | { ok: false; error: string } {
  if (rateYen == null) return { ok: true };
  if (rateYen < MIN_PUBLIC_LESSON_RATE_YEN) {
    return { ok: false, error: "Public lesson rates must be at least ¥3,000." };
  }
  return { ok: true };
}
