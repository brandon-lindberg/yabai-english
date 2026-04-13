import { StudyLevelCode } from "@prisma/client";

/**
 * Curriculum authoring targets for how much Japanese appears on study prompts by level.
 * Product spec: `PRODUCT_REQUIREMENTS.md` → **Study Track: English Flashcards (Leveled Practice)**.
 *
 * Canonical curriculum order for the English flashcard track.
 * Japanese on prompts (card fronts + assessment stems) should trend **down** along this axis.
 */
export const STUDY_LEVEL_CURRICULUM_ORDER: readonly StudyLevelCode[] = [
  StudyLevelCode.BEGINNER_1,
  StudyLevelCode.BEGINNER_2,
  StudyLevelCode.BEGINNER_3,
  StudyLevelCode.INTERMEDIATE_1,
  StudyLevelCode.INTERMEDIATE_2,
  StudyLevelCode.INTERMEDIATE_3,
  StudyLevelCode.ADVANCED_1,
  StudyLevelCode.ADVANCED_2,
  StudyLevelCode.ADVANCED_3,
] as const;

/**
 * Authoring target only: approximate share of Japanese on the **question side** (card `frontJa`,
 * assessment `promptJa` when shown in Japanese). English backs stay English.
 * Higher levels → lower values (more English-led prompts).
 */
const JAPANESE_PROMPT_WEIGHT_PERCENT: Record<StudyLevelCode, number> = {
  [StudyLevelCode.BEGINNER_1]: 88,
  [StudyLevelCode.BEGINNER_2]: 70,
  [StudyLevelCode.BEGINNER_3]: 50,
  [StudyLevelCode.INTERMEDIATE_1]: 25,
  [StudyLevelCode.INTERMEDIATE_2]: 22,
  [StudyLevelCode.INTERMEDIATE_3]: 12,
  [StudyLevelCode.ADVANCED_1]: 6,
  [StudyLevelCode.ADVANCED_2]: 3,
  [StudyLevelCode.ADVANCED_3]: 0,
};

export function studyJapanesePromptWeightPercent(levelCode: StudyLevelCode): number {
  return JAPANESE_PROMPT_WEIGHT_PERCENT[levelCode];
}

/** One-paragraph note for humans / LLM prompts when authoring bank JSON. */
export function studyPromptAuthoringGuideline(levelCode: StudyLevelCode): string {
  const p = studyJapanesePromptWeightPercent(levelCode);
  switch (levelCode) {
    case StudyLevelCode.BEGINNER_1:
      return `Level ${levelCode}: Japanese-dominant fronts (~${p}% Japanese). Use natural 漢字・ひらがな・カタカナ; English is the answer side.`;
    case StudyLevelCode.BEGINNER_2:
      return `Level ${levelCode}: Still Japanese-friendly (~${p}% Japanese), but mix in short English cues (e.g. cloze stems, bilingual lines).`;
    case StudyLevelCode.BEGINNER_3:
      return `Level ${levelCode}: English-led (~${p}% Japanese). Japanese mainly for glosses, set phrases, or disambiguation.`;
    case StudyLevelCode.INTERMEDIATE_1:
    case StudyLevelCode.INTERMEDIATE_2:
    case StudyLevelCode.INTERMEDIATE_3:
      return `Level ${levelCode}: English-primary prompts (~${p}% Japanese). Keep Japanese brief (hints, nuance notes); tasks and stems mostly English.`;
    case StudyLevelCode.ADVANCED_1:
    case StudyLevelCode.ADVANCED_2:
    case StudyLevelCode.ADVANCED_3:
      return `Level ${levelCode}: English-native prompts (~${p}% Japanese). Avoid Japanese on the front unless a register or nuance note truly needs it; both assessment prompts should read like real test items in English.`;
  }
}
