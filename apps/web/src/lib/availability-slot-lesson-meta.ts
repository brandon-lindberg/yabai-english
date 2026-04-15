export const AVAILABILITY_LESSON_LEVELS = [
  "beginner",
  "intermediate",
  "advanced",
] as const;

export type AvailabilityLessonLevel = (typeof AVAILABILITY_LESSON_LEVELS)[number];

export const AVAILABILITY_LESSON_TYPES = [
  "pronunciation",
  "conversation",
  "grammar",
  "reading",
  "writing",
  "business",
  "custom",
] as const;

export type AvailabilityLessonType = (typeof AVAILABILITY_LESSON_TYPES)[number];

export const DEFAULT_AVAILABILITY_LESSON_LEVEL: AvailabilityLessonLevel = "intermediate";
export const DEFAULT_AVAILABILITY_LESSON_TYPE: AvailabilityLessonType = "conversation";

export function formatAvailabilitySlotMeta(
  slot: {
    lessonLevel: string;
    lessonType: string;
    lessonTypeCustom?: string | null;
  },
  tLevel: (key: string) => string,
  tType: (key: string) => string,
): string {
  const levelLabel = tLevel(slot.lessonLevel);
  const typeLabel =
    slot.lessonType === "custom" && slot.lessonTypeCustom?.trim()
      ? slot.lessonTypeCustom.trim()
      : tType(slot.lessonType);
  return `${levelLabel} · ${typeLabel}`;
}
