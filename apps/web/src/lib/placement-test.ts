import { PlacedLevel } from "@/generated/prisma/client";
import { randomInt } from "crypto";
import {
  EXPECTED_PLACEMENT_QUESTION_TOTAL,
  PLACEMENT_BANK_BANDS,
  PLACEMENT_BANK_SECTIONS,
  PLACEMENT_QUESTIONS_PER_BAND_SECTION,
} from "@/lib/placement-bank/constants";
import type { LoadedPlacementQuestion } from "@/lib/placement-bank/load-placement-bank";

export type PlacementQuestion = LoadedPlacementQuestion;

/** Re-export for tests and tooling. */
export {
  EXPECTED_PLACEMENT_QUESTION_TOTAL,
  PLACEMENT_QUESTIONS_PER_BAND_SECTION,
  PLACEMENT_BANK_BANDS,
  PLACEMENT_BANK_SECTIONS,
};

export type PlacementQuestionPublic = Omit<PlacementQuestion, "correctIndex" | "stemId">;

export const PLACEMENT_WRITING_TASK = {
  promptJa:
    "あなたの英語学習の目的と、最近直面した仕事または日常のコミュニケーション課題について、60-120語で英語で書いてください。",
  promptEn:
    "In 60-120 words, describe your English-learning goals and one communication challenge you recently faced at work or in daily life.",
  minWords: 60,
  recommendedWords: 120,
} as const;

export function getPlacementQuestionsForClient(
  questions: PlacementQuestion[],
): PlacementQuestionPublic[] {
  return questions.map((q) => {
    const { correctIndex, stemId, ...rest } = q;
    void correctIndex;
    void stemId;
    return rest;
  });
}

const CEFR_ORDER = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5 } as const;

function pickByBandProgression(pool: PlacementQuestion[], count: number) {
  const remaining = [...pool];
  const picked: PlacementQuestion[] = [];
  const targetBands: Array<PlacementQuestion["cefrBand"]> = [
    "A1",
    "A2",
    "B1",
    "B1",
    "B2",
    "C1",
  ];

  for (let i = 0; i < count; i++) {
    const target = targetBands[i] ?? "B1";
    let candidates = remaining.filter((q) => q.cefrBand === target);
    if (candidates.length === 0) {
      candidates = [...remaining].sort(
        (a, b) =>
          Math.abs(CEFR_ORDER[a.cefrBand] - CEFR_ORDER[target]) -
          Math.abs(CEFR_ORDER[b.cefrBand] - CEFR_ORDER[target]),
      );
    }
    const candidatePool = candidates.length > 0 ? candidates : remaining;
    if (candidatePool.length === 0) break;
    const choice = candidatePool[randomInt(0, candidatePool.length)];
    if (!choice) break;
    picked.push(choice);
    const removeIdx = remaining.findIndex((q) => q.id === choice.id);
    if (removeIdx >= 0) remaining.splice(removeIdx, 1);
  }
  return picked;
}

export function buildPlacementQuestionSet(
  questions: PlacementQuestion[],
  avoidIds: string[] = [],
) {
  const avoid = new Set(avoidIds);
  const bySection = {
    grammar: questions.filter((q) => q.section === "grammar" && !avoid.has(q.id)),
    vocabulary: questions.filter((q) => q.section === "vocabulary" && !avoid.has(q.id)),
    reading: questions.filter((q) => q.section === "reading" && !avoid.has(q.id)),
    functional: questions.filter((q) => q.section === "functional" && !avoid.has(q.id)),
  } as const;

  const fallback = {
    grammar: questions.filter((q) => q.section === "grammar"),
    vocabulary: questions.filter((q) => q.section === "vocabulary"),
    reading: questions.filter((q) => q.section === "reading"),
    functional: questions.filter((q) => q.section === "functional"),
  } as const;

  const selected = [
    ...pickByBandProgression(
      bySection.grammar.length >= 6 ? bySection.grammar : fallback.grammar,
      6,
    ),
    ...pickByBandProgression(
      bySection.vocabulary.length >= 6 ? bySection.vocabulary : fallback.vocabulary,
      6,
    ),
    ...pickByBandProgression(
      bySection.reading.length >= 6 ? bySection.reading : fallback.reading,
      6,
    ),
    ...pickByBandProgression(
      bySection.functional.length >= 6 ? bySection.functional : fallback.functional,
      6,
    ),
  ];

  return [...selected].sort((a, b) => CEFR_ORDER[a.cefrBand] - CEFR_ORDER[b.cefrBand]);
}

export type SectionScore = {
  earned: number;
  max: number;
  ratio: number;
};

export function scorePlacementAnswers(
  answers: number[],
  questions: PlacementQuestion[],
): {
  level: PlacedLevel;
  subLevel: 1 | 2 | 3;
  earned: number;
  max: number;
  sectionScores: Record<PlacementQuestion["section"], SectionScore>;
  strengths: string[];
  improvements: string[];
  needsManualReview: boolean;
  manualReviewReasons: string[];
} {
  const objectiveMax = questions.reduce((s, q) => s + q.weight, 0);
  let earned = 0;
  const sectionScores: Record<PlacementQuestion["section"], SectionScore> = {
    grammar: { earned: 0, max: 0, ratio: 0 },
    vocabulary: { earned: 0, max: 0, ratio: 0 },
    reading: { earned: 0, max: 0, ratio: 0 },
    functional: { earned: 0, max: 0, ratio: 0 },
  };

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q) continue;
    sectionScores[q.section].max += q.weight;
    if (answers[i] === q.correctIndex) {
      earned += q.weight;
      sectionScores[q.section].earned += q.weight;
    }
  }

  for (const key of ["grammar", "vocabulary", "reading", "functional"] as const) {
    const section = sectionScores[key];
    section.ratio = section.max > 0 ? section.earned / section.max : 0;
  }

  const max = objectiveMax;
  const totalEarned = earned;
  const ratio = max > 0 ? totalEarned / max : 0;

  let level: PlacedLevel;
  if (
    ratio >= 0.78 &&
    sectionScores.grammar.ratio >= 0.6 &&
    sectionScores.reading.ratio >= 0.6
  ) {
    level = PlacedLevel.ADVANCED;
  } else if (
    ratio >= 0.45 &&
    sectionScores.grammar.ratio >= 0.35 &&
    sectionScores.reading.ratio >= 0.3
  ) {
    level = PlacedLevel.INTERMEDIATE;
  } else {
    level = PlacedLevel.BEGINNER;
  }

  let subLevel: 1 | 2 | 3 = 1;
  if (level === PlacedLevel.BEGINNER) {
    if (ratio >= 0.32) subLevel = 3;
    else if (ratio >= 0.2) subLevel = 2;
  } else if (level === PlacedLevel.INTERMEDIATE) {
    if (ratio >= 0.68) subLevel = 3;
    else if (ratio >= 0.57) subLevel = 2;
  } else {
    if (ratio >= 0.93) subLevel = 3;
    else if (ratio >= 0.86) subLevel = 2;
  }

  const strengths: string[] = [];
  const improvements: string[] = [];
  const manualReviewReasons: string[] = [];
  const sectionOrder: Array<keyof typeof sectionScores> = [
    "grammar",
    "vocabulary",
    "reading",
    "functional",
  ];

  for (const key of sectionOrder) {
    const ratioValue = sectionScores[key].ratio;
    if (ratioValue >= 0.7) strengths.push(key);
    if (ratioValue < 0.5) improvements.push(key);
  }

  const beginnerCut = 0.45;
  const advancedCut = 0.78;
  if (Math.abs(ratio - beginnerCut) <= 0.03) {
    manualReviewReasons.push("nearBeginnerIntermediateBoundary");
  }
  if (Math.abs(ratio - advancedCut) <= 0.03) {
    manualReviewReasons.push("nearIntermediateAdvancedBoundary");
  }
  const maxSectionRatio = Math.max(
    sectionScores.grammar.ratio,
    sectionScores.vocabulary.ratio,
    sectionScores.reading.ratio,
    sectionScores.functional.ratio,
  );
  const minSectionRatio = Math.min(
    sectionScores.grammar.ratio,
    sectionScores.vocabulary.ratio,
    sectionScores.reading.ratio,
    sectionScores.functional.ratio,
  );
  if (maxSectionRatio - minSectionRatio >= 0.45) {
    manualReviewReasons.push("highSectionVariance");
  }

  const needsManualReview = manualReviewReasons.length > 0;

  return {
    level,
    subLevel,
    earned: totalEarned,
    max,
    sectionScores,
    strengths,
    improvements,
    needsManualReview,
    manualReviewReasons,
  };
}
