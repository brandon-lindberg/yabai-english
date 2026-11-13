import { PLACEMENT_BANK_BANDS, PLACEMENT_BANK_SECTIONS, type PlacementBankBand, type PlacementBankSection } from "@/lib/placement-bank/constants";
import type { LoadedPlacementQuestion } from "@/lib/placement-bank/load-placement-bank";

/** Product rules, not a calibrated CEFR score conversion. Future changes need a new version. */
export const ENGLISH_PLACEMENT_POLICY_V2 = {
  version: 2, maxQuestions: 24, perSectionMax: 6, timeLimitSec: 1200,
  minimumAnswers: 15, minimumPerSection: 3, maximumTimeoutPenaltyPoints: 10,
} as const;

export type PlacementScoringOptions = { version: 2; completionReason: "completed" | "timeout" };
export type PlacementAssessment = {
  policyVersion: 2;
  completionReason: "completed" | "timeout";
  answered: number;
  total: number;
  minimumAnswers: number;
  countsBySection: Record<PlacementBankSection, number>;
  confirmedCefrBand: PlacementBankBand | null;
  unadjustedLevel: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  unadjustedSubLevel: 1 | 2 | 3;
  unadjustedScore: number;
  adjustedScore: number;
  timeoutPenaltyPoints: number;
};

/** Coverage and native-band confirmation shared by the route and existing scorer. */
export function englishPlacementEvidence(answers: number[], questions: LoadedPlacementQuestion[]) {
  const policy = ENGLISH_PLACEMENT_POLICY_V2;
  const countsBySection = Object.fromEntries(PLACEMENT_BANK_SECTIONS.map((section) =>
    [section, questions.filter((q) => q.section === section).length],
  )) as Record<PlacementBankSection, number>;
  const valid = answers.length === questions.length && questions.length <= policy.maxQuestions &&
    new Set(questions.map((q) => q.id)).size === questions.length &&
    questions.every((q, index) => PLACEMENT_BANK_BANDS.includes(q.cefrBand) &&
      PLACEMENT_BANK_SECTIONS.includes(q.section) && Number.isInteger(answers[index]) &&
      answers[index]! >= 0 && answers[index]! < q.optionsEn.length) &&
    PLACEMENT_BANK_SECTIONS.every((section) => countsBySection[section] <= policy.perSectionMax);
  const sufficient = valid && questions.length >= policy.minimumAnswers &&
    PLACEMENT_BANK_SECTIONS.every((section) => countsBySection[section] >= policy.minimumPerSection);
  const complete = sufficient && questions.length === policy.maxQuestions &&
    PLACEMENT_BANK_SECTIONS.every((section) => countsBySection[section] === policy.perSectionMax);
  let confirmedCefrBand: PlacementBankBand | null = null;
  for (const band of PLACEMENT_BANK_BANDS) {
    // Harder successes also support this band; harder probe errors do not revoke it.
    const relevant = questions.map((q, index) => ({ q, answer: answers[index] })).filter(({ q, answer }) =>
      q.cefrBand === band || (answer === q.correctIndex &&
        PLACEMENT_BANK_BANDS.indexOf(q.cefrBand) > PLACEMENT_BANK_BANDS.indexOf(band)),
    );
    const correct = relevant.filter(({ q, answer }) => answer === q.correctIndex);
    const skills = new Set(correct.map(({ q }) => q.section));
    if (correct.length >= 4 && correct.length * 3 >= relevant.length * 2 &&
      skills.size >= 3 && skills.has("grammar") && skills.has("reading")) confirmedCefrBand = band;
  }
  // App starting-level anchors for each confirmed question band.
  const placementIndexByBand = { A1: 1, A2: 2, B1: 4, B2: 6, C1: 8 } as const;
  return { valid, sufficient, complete, countsBySection, confirmedCefrBand,
    placementIndex: confirmedCefrBand ? placementIndexByBand[confirmedCefrBand] : 0 };
}
