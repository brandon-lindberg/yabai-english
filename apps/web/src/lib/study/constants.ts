import { StudyLevelCode } from "@/generated/prisma/client";

/** Canonical order for unlock gates and UI. */
export const STUDY_LEVEL_ORDER: StudyLevelCode[] = [
  StudyLevelCode.BEGINNER_1,
  StudyLevelCode.BEGINNER_2,
  StudyLevelCode.BEGINNER_3,
  StudyLevelCode.INTERMEDIATE_1,
  StudyLevelCode.INTERMEDIATE_2,
  StudyLevelCode.INTERMEDIATE_3,
  StudyLevelCode.ADVANCED_1,
  StudyLevelCode.ADVANCED_2,
  StudyLevelCode.ADVANCED_3,
];

export function studyLevelIndex(code: StudyLevelCode): number {
  const i = STUDY_LEVEL_ORDER.indexOf(code);
  if (i < 0) throw new Error(`Unknown level code: ${code}`);
  return i;
}

export function previousStudyLevel(code: StudyLevelCode): StudyLevelCode | null {
  const i = studyLevelIndex(code);
  return i <= 0 ? null : STUDY_LEVEL_ORDER[i - 1]!;
}

export function nextStudyLevel(code: StudyLevelCode): StudyLevelCode | null {
  const i = studyLevelIndex(code);
  return i >= STUDY_LEVEL_ORDER.length - 1 ? null : STUDY_LEVEL_ORDER[i + 1]!;
}

export function assertLevelOrder(prev: StudyLevelCode, next: StudyLevelCode): boolean {
  return studyLevelIndex(next) === studyLevelIndex(prev) + 1;
}
