import { describe, expect, it } from "vitest";
import { StudyLevelCode } from "@prisma/client";
import {
  STUDY_LEVEL_CURRICULUM_ORDER,
  studyJapanesePromptWeightPercent,
  studyPromptAuthoringGuideline,
} from "../study/prompt-locale-policy";

describe("studyPromptAuthoringGuideline", () => {
  it("covers every StudyLevelCode", () => {
    const codes = Object.values(StudyLevelCode) as StudyLevelCode[];
    for (const code of codes) {
      expect(studyPromptAuthoringGuideline(code).length).toBeGreaterThan(20);
      expect(studyJapanesePromptWeightPercent(code)).toBeGreaterThanOrEqual(0);
      expect(studyJapanesePromptWeightPercent(code)).toBeLessThanOrEqual(100);
    }
  });

  it("non-increasing Japanese weight as levels advance", () => {
    for (let i = 1; i < STUDY_LEVEL_CURRICULUM_ORDER.length; i++) {
      const prev = STUDY_LEVEL_CURRICULUM_ORDER[i - 1]!;
      const cur = STUDY_LEVEL_CURRICULUM_ORDER[i]!;
      expect(studyJapanesePromptWeightPercent(prev)).toBeGreaterThanOrEqual(studyJapanesePromptWeightPercent(cur));
    }
  });
});
