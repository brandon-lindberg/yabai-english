export type TeacherCard = {
  id: string;
  displayName: string;
  imageUrl?: string | null;
  countryOfOrigin: string | null;
  specialties: string[];
  instructionLanguages: string[];
  rateYen: number | null;
  activeAvailabilityCount: number;
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
