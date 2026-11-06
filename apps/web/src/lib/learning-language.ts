import { z } from "zod";
import { LearningLanguage } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

export const learningLanguageSchema = z.nativeEnum(LearningLanguage);

/** Admin permission, separate from the subject of any particular class. */
export const teachingLanguagesSchema = z.array(learningLanguageSchema).min(1).max(2)
  .refine((languages) => new Set(languages).size === languages.length, "Choose each language once")
  .transform((languages) => [LearningLanguage.ENGLISH, LearningLanguage.JAPANESE].filter((language) => languages.includes(language)));

export function teacherCanTeach(
  profile: { teachingLanguages?: readonly LearningLanguage[] },
  language: LearningLanguage,
): boolean {
  // Undefined occurs only in historical callers; persisted profiles always have this field.
  return (profile.teachingLanguages ?? [LearningLanguage.ENGLISH]).includes(resolveLearningLanguage(language));
}

/** Missing historical intent defaults to English. Locale codes are never inferred. */
export function resolveLearningLanguage(value: unknown): LearningLanguage {
  const parsed = learningLanguageSchema.safeParse(value);
  return parsed.success ? parsed.data : LearningLanguage.ENGLISH;
}

/** Subject capabilities come from actual classes, including existing trial-only teachers. */
export function teachingLanguagesFromOfferings(offerings: ReadonlyArray<{ active?: boolean; learningLanguage?: LearningLanguage }>): LearningLanguage[] {
  return [...new Set(offerings.filter((offering) => offering.active !== false).map((offering) => resolveLearningLanguage(offering.learningLanguage)))];
}

export function learningLanguageOfferingWhere(learningLanguage: LearningLanguage) {
  return { active: true, learningLanguage };
}

export const activeTeacherAccountWhere = { user: { accountStatus: "ACTIVE" } } as const;

export function learningLanguageClassWhere(
  learningLanguage: LearningLanguage,
): Prisma.TeacherProfileWhereInput {
  const matching = { lessonOfferings: { some: learningLanguageOfferingWhere(learningLanguage) } };
  // Historical teachers could publish unlinked English trial hours, including
  // after retiring their priced classes. Those hours retain their subject.
  return learningLanguage === LearningLanguage.ENGLISH
    ? { OR: [
        matching,
        { lessonOfferings: { none: {} } },
        { availabilitySlots: { some: { active: true, teacherLessonOfferingId: null } } },
      ] }
    : matching;
}

/** Admin permission and an active class must agree before discovery. */
export function learningLanguageTeacherWhere(learningLanguage: LearningLanguage): Prisma.TeacherProfileWhereInput {
  return {
    ...activeTeacherAccountWhere,
    teachingLanguages: { has: learningLanguage },
    ...learningLanguageClassWhere(learningLanguage),
  };
}

export function learningLanguageAvailabilityWhere(
  learningLanguage: LearningLanguage,
): Prisma.AvailabilitySlotWhereInput {
  const matching = {
    teacherLessonOffering: { is: learningLanguageOfferingWhere(learningLanguage) },
  };
  return learningLanguage === LearningLanguage.ENGLISH
    ? { OR: [matching, { teacherLessonOfferingId: null }] }
    : matching;
}

type SubjectSlot = {
  teacherLessonOffering?: { learningLanguage: LearningLanguage; active: boolean } | null;
};

/** Same boundary for existing bookings: their snapshot governs rescheduling. */
export function slotsForLearningLanguage<T extends SubjectSlot>(
  slots: readonly T[],
  learningLanguage: LearningLanguage,
): T[] {
  return slots.filter(({ teacherLessonOffering: offering }) =>
    offering
      ? offering.active && offering.learningLanguage === learningLanguage
      : learningLanguage === LearningLanguage.ENGLISH,
  );
}
