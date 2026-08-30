export type TeacherCard = {
  id: string;
  displayName: string;
  imageUrl?: string | null;
  countryOfOrigin: string | null;
  specialties: string[];
  instructionLanguages: string[];
  rateYen: number | null;
  activeAvailabilityCount: number;
  offersBookableFreeTrial?: boolean;
};

type Filters = {
  specialty?: string;
  language?: string;
};

export function filterTeacherCards(teachers: TeacherCard[], filters: Filters) {
  const specialty = filters.specialty?.trim().toLowerCase();
  const language = filters.language?.trim().toUpperCase();

  return teachers.filter((teacher) => {
    if (teacher.activeAvailabilityCount <= 0) return false;
    if (
      specialty &&
      !teacher.specialties.some((s) => s.toLowerCase() === specialty)
    ) {
      return false;
    }
    if (
      language &&
      !teacher.instructionLanguages.some((l) => l.toUpperCase() === language)
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Puts the student's own teachers at the top. They came here to book their next
 * lesson with someone they already study with; leaving that teacher wherever
 * the marketplace ordering dropped them is the problem this whole listing is
 * meant to solve. Relative order within each group is preserved.
 */
export function sortOwnTeachersFirst(
  teachers: TeacherCard[],
  ownTeacherIds: ReadonlySet<string>,
): TeacherCard[] {
  if (ownTeacherIds.size === 0) return teachers;
  return [
    ...teachers.filter((teacher) => ownTeacherIds.has(teacher.id)),
    ...teachers.filter((teacher) => !ownTeacherIds.has(teacher.id)),
  ];
}
