import { randomInt } from "crypto";
import type { PlacementQuestion } from "@/lib/placement-test";

/** Legacy: tags were never learner-facing; strip if present in old rows. */
const ITEM_TAG_EN = /\s+—\s+(A1|A2|B1|B2|C1)-(grammar|vocabulary|reading|functional)-\d{3}$/i;

/**
 * Normalized English **question line** for deduplication (instruction is shared across templates).
 * Used by `chooseNextAdaptiveQuestion` so two bank rows with different ids cannot show the same body twice in one attempt.
 *
 * Vocabulary: the visible gloss line may repeat across the bank with different MCQ lines — the key
 * includes the choice fingerprint so learners are not forced to read internal disambiguators like `(set 50)`.
 */
export function placementQuestionPromptDedupeKey(
  question: Pick<PlacementQuestion, "section" | "questionEn" | "optionsEn" | "optionsJa">,
): string {
  const base = question.questionEn
    .replace(ITEM_TAG_EN, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (question.section !== "vocabulary") return base;
  return `${base}\u001e${placementQuestionChoicesDedupeKey(question)}`;
}

function normalizeChoiceLine(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Fingerprints the visible MCQ choices (EN + JA). Same multiset of lines = same "answers" to the learner
 * even when the prompt wording differs — must not appear twice in one attempt.
 */
export function placementQuestionChoicesDedupeKey(
  question: Pick<PlacementQuestion, "optionsEn" | "optionsJa">,
): string {
  const en = [...question.optionsEn].map(normalizeChoiceLine).sort().join("\u001f");
  const ja = [...question.optionsJa].map(normalizeChoiceLine).sort().join("\u001f");
  return `${en}\u001e${ja}`;
}

export type SectionKey = PlacementQuestion["section"];
export type BandScore = 1 | 2 | 3 | 4 | 5;

export type AdaptiveSectionState = {
  asked: number;
  correct: number;
  targetBand: BandScore;
};

export type PlacementAdaptiveState = {
  sectionState: Record<SectionKey, AdaptiveSectionState>;
  askedQuestionIds: string[];
  askedStemIds: string[];
  maxQuestions: number;
  perSectionMax: number;
};

const SECTION_ORDER: SectionKey[] = ["grammar", "vocabulary", "reading", "functional"];
const BAND_ORDER: Record<PlacementQuestion["cefrBand"], BandScore> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
};

function clampBand(v: number): BandScore {
  if (v <= 1) return 1;
  if (v >= 5) return 5;
  return v as BandScore;
}

/** After an item at `prev` difficulty, move up on correct and down on incorrect (1–5 scale). */
export function computeNextTargetBand(prev: BandScore, isCorrect: boolean): BandScore {
  return clampBand(prev + (isCorrect ? 1 : -1));
}

export function buildInitialAdaptiveState(): PlacementAdaptiveState {
  return {
    sectionState: {
      grammar: { asked: 0, correct: 0, targetBand: 2 },
      vocabulary: { asked: 0, correct: 0, targetBand: 2 },
      reading: { asked: 0, correct: 0, targetBand: 2 },
      functional: { asked: 0, correct: 0, targetBand: 2 },
    },
    askedQuestionIds: [],
    askedStemIds: [],
    maxQuestions: 24,
    perSectionMax: 6,
  };
}

export function baseQuestionStemId(questionId: string) {
  return questionId.replace(/-v\d+$/, "");
}

/** Use explicit stemId when present (e.g. JSON bank); otherwise strip variant suffix from id. */
export function placementQuestionStemKey(question: Pick<PlacementQuestion, "id" | "stemId">): string {
  return question.stemId ?? baseQuestionStemId(question.id);
}

function askedPromptDedupeKeys(state: PlacementAdaptiveState, pool: PlacementQuestion[]): Set<string> {
  const byId = new Map(pool.map((q) => [q.id, q]));
  const keys = new Set<string>();
  for (const id of state.askedQuestionIds) {
    const q = byId.get(id);
    if (q) keys.add(placementQuestionPromptDedupeKey(q));
  }
  return keys;
}

function askedChoicesDedupeKeys(state: PlacementAdaptiveState, pool: PlacementQuestion[]): Set<string> {
  const byId = new Map(pool.map((q) => [q.id, q]));
  const keys = new Set<string>();
  for (const id of state.askedQuestionIds) {
    const q = byId.get(id);
    if (q) keys.add(placementQuestionChoicesDedupeKey(q));
  }
  return keys;
}

function chooseSection(state: PlacementAdaptiveState): SectionKey | null {
  const candidates = SECTION_ORDER.filter(
    (section) => state.sectionState[section].asked < state.perSectionMax,
  );
  if (candidates.length === 0) return null;
  candidates.sort(
    (a, b) =>
      state.sectionState[a].asked - state.sectionState[b].asked ||
      SECTION_ORDER.indexOf(a) - SECTION_ORDER.indexOf(b),
  );
  return candidates[0] ?? null;
}

export function chooseNextAdaptiveQuestion(
  state: PlacementAdaptiveState,
  pool: PlacementQuestion[],
  avoidIds: string[] = [],
): PlacementQuestion | null {
  if (state.askedQuestionIds.length >= state.maxQuestions) return null;
  const section = chooseSection(state);
  if (!section) return null;

  const asked = new Set(state.askedQuestionIds);
  const askedStems = new Set(state.askedStemIds);
  const askedPromptKeys = askedPromptDedupeKeys(state, pool);
  const askedChoicesKeys = askedChoicesDedupeKeys(state, pool);
  const avoid = new Set(avoidIds);
  const available = pool.filter(
    (q) =>
      q.section === section &&
      !asked.has(q.id) &&
      !askedStems.has(placementQuestionStemKey(q)) &&
      !askedPromptKeys.has(placementQuestionPromptDedupeKey(q)) &&
      !askedChoicesKeys.has(placementQuestionChoicesDedupeKey(q)) &&
      !avoid.has(q.id),
  );
  const fallback = pool.filter(
    (q) =>
      q.section === section &&
      !asked.has(q.id) &&
      !askedStems.has(placementQuestionStemKey(q)) &&
      !askedPromptKeys.has(placementQuestionPromptDedupeKey(q)) &&
      !askedChoicesKeys.has(placementQuestionChoicesDedupeKey(q)),
  );
  const source = available.length > 0 ? available : fallback;
  if (source.length === 0) return null;

  const target = state.sectionState[section].targetBand;
  const exact = source.filter((q) => BAND_ORDER[q.cefrBand] === target);
  const candidatePool = exact.length > 0 ? exact : source;
  const ranked = [...candidatePool].sort(
    (a, b) => Math.abs(BAND_ORDER[a.cefrBand] - target) - Math.abs(BAND_ORDER[b.cefrBand] - target),
  );
  const bestDistance = Math.abs(BAND_ORDER[ranked[0]?.cefrBand ?? "B1"] - target);
  const best = ranked.filter((q) => Math.abs(BAND_ORDER[q.cefrBand] - target) === bestDistance);
  return best[randomInt(0, best.length)] ?? null;
}

export function applyAdaptiveAnswer(
  state: PlacementAdaptiveState,
  question: PlacementQuestion,
  isCorrect: boolean,
): PlacementAdaptiveState {
  const section = question.section;
  const prev = state.sectionState[section];
  const nextBand = computeNextTargetBand(prev.targetBand, isCorrect);
  return {
    ...state,
    askedQuestionIds: [...state.askedQuestionIds, question.id],
    askedStemIds: [...state.askedStemIds, placementQuestionStemKey(question)],
    sectionState: {
      ...state.sectionState,
      [section]: {
        asked: prev.asked + 1,
        correct: prev.correct + (isCorrect ? 1 : 0),
        targetBand: nextBand,
      },
    },
  };
}
