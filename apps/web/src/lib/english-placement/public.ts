import type { PlacementQuestionPublic, scorePlacementAnswers } from "../placement-test";

export type EnglishPlacementResult = ReturnType<typeof scorePlacementAnswers>;
export type EnglishPlacementInconclusive = {
  status: "inconclusive";
  reason: "insufficient_evidence" | "question_pool_exhausted" | "attempt_unavailable";
  answered: number;
  required: number;
};
export type EnglishPlacementActive = {
  attemptToken: string;
  question: PlacementQuestionPublic | null;
  objectiveComplete: boolean;
  timeLimitSec: number;
  minimumAnswers: number;
  expiresAt: number;
  serverNow: number;
  progress: { current: number; total: number };
};
export type EnglishPlacementReply = EnglishPlacementActive | EnglishPlacementResult | EnglishPlacementInconclusive | { status: "ready" };
