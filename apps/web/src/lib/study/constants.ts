import { StudyLevelCode, type LearningLanguage } from "@/generated/prisma/client";

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

export const JAPANESE_STUDY_LEVEL_ORDER: StudyLevelCode[] = ["N5", "N4", "N3", "N2", "N1"];

function levelOrder(language: LearningLanguage) {
  return language === "JAPANESE" ? JAPANESE_STUDY_LEVEL_ORDER : STUDY_LEVEL_ORDER;
}

export function studyLevelIndex(code: StudyLevelCode, language: LearningLanguage = "ENGLISH"): number {
  const i = levelOrder(language).indexOf(code);
  if (i < 0) throw new Error(`Unknown level code: ${code}`);
  return i;
}

export function previousStudyLevel(code: StudyLevelCode, language: LearningLanguage = "ENGLISH"): StudyLevelCode | null {
  const i = studyLevelIndex(code, language);
  return i <= 0 ? null : levelOrder(language)[i - 1]!;
}

export function nextStudyLevel(code: StudyLevelCode, language: LearningLanguage = "ENGLISH"): StudyLevelCode | null {
  const i = studyLevelIndex(code, language);
  const order = levelOrder(language);
  return i >= order.length - 1 ? null : order[i + 1]!;
}

export function assertLevelOrder(prev: StudyLevelCode, next: StudyLevelCode): boolean {
  return studyLevelIndex(next) === studyLevelIndex(prev) + 1;
}
