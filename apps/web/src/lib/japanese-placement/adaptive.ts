import "server-only";
import { JAPANESE_PLACEMENT_DOMAINS, JAPANESE_STUDY_BANDS, japaneseEvidenceKey, japaneseQuestionLimit, sentenceOrderSignature,
  type JapanesePlacementBank, type JapanesePlacementItem } from "./bank";
import type { JapaneseResponse } from "./attempt";

export function isCorrectJapaneseResponse(item: JapanesePlacementItem, response: JapaneseResponse): boolean {
  if (response.kind === "answer" && item.responseType === "choice") return response.choiceId === item.correctChoiceId;
  if (response.kind === "sentence_assembly" && item.responseType === "sentence_assembly") {
    const submitted = sentenceOrderSignature(item, response.tileIds);
    return item.acceptedOrders.some((order) => sentenceOrderSignature(item, order) === submitted);
  }
  return false;
}

export function initialJapaneseEvidence() {
  return { posterior: JAPANESE_STUDY_BANDS.map(() => 1 / JAPANESE_STUDY_BANDS.length),
    used: new Set<string>(), usedGroups: new Set<string>(), counts: Object.fromEntries(JAPANESE_PLACEMENT_DOMAINS.map((domain) => [domain, 0])) as Record<typeof JAPANESE_PLACEMENT_DOMAINS[number], number> };
}
type Evidence = ReturnType<typeof initialJapaneseEvidence>;
const normalize = (values: number[]) => { const sum = values.reduce((a, b) => a + b, 0); return values.map((value) => value / sum); };
const entropy = (values: number[]) => -values.reduce((sum, value) => sum + (value === 0 ? 0 : value * Math.log(value)), 0);

/** The bank supplies reviewed response likelihoods; no English thresholds or guessed JLPT score conversion. */
export function updateJapaneseEvidence(evidence: Evidence, item: JapanesePlacementItem, response: JapaneseResponse): void {
  if (!item.calibration) throw new Error("Japanese calibration required");
  if (evidence.usedGroups.has(japaneseEvidenceKey(item))) throw new Error("Repeated Japanese evidence item or passage");
  const correct = isCorrectJapaneseResponse(item, response);
  evidence.posterior = normalize(evidence.posterior.map((weight, index) => weight * (correct
    ? item.calibration!.probabilities[index] : 1 - item.calibration!.probabilities[index])));
  evidence.used.add(item.id);
  evidence.usedGroups.add(japaneseEvidenceKey(item));
  evidence.counts[item.domain]++;
}

/** Balance domain quotas first, then minimize expected posterior entropy within that domain. */
export function selectJapaneseItem(bank: JapanesePlacementBank, evidence: Evidence): JapanesePlacementItem | null {
  if (!bank.assessment) throw new Error("Japanese assessment policy required");
  if (evidence.used.size >= japaneseQuestionLimit(bank)) return null;
  const quotas = bank.assessment.quotas;
  const domain = JAPANESE_PLACEMENT_DOMAINS.filter((entry) => evidence.counts[entry] < quotas[entry])
    .sort((a, b) => evidence.counts[a] / quotas[a] - evidence.counts[b] / quotas[b])[0];
  const byId = new Map(bank.items.map((item) => [item.id, item]));
  let cumulative = 0;
  const median = evidence.posterior.findIndex((weight) => { cumulative += weight; return cumulative >= 0.5; });
  const verifyBand = (domain === "reading" || domain === "writing") && evidence.counts[domain] === quotas[domain] - 1;
  const candidates = bank.sequence.map((id) => byId.get(id)!).filter((item) => item.domain === domain && !evidence.usedGroups.has(japaneseEvidenceKey(item)));
  const distance = (item: JapanesePlacementItem) => Math.abs(JAPANESE_STUDY_BANDS.indexOf(item.calibration!.band) - Math.max(1, median));
  const nearest = verifyBand ? Math.min(...candidates.map(distance)) : 0;
  let best: JapanesePlacementItem | null = null;
  let bestGain = -Infinity;
  for (const item of candidates) {
    if (!item.calibration) throw new Error("Japanese calibration required");
    // Reserve the final reading/construction slots for direct verification of the candidate band.
    if (verifyBand && distance(item) !== nearest) continue;
    const yes = evidence.posterior.map((weight, index) => weight * item.calibration!.probabilities[index]);
    const no = evidence.posterior.map((weight, index) => weight * (1 - item.calibration!.probabilities[index]));
    const p = yes.reduce((sum, weight) => sum + weight, 0);
    const gain = entropy(evidence.posterior) - p * entropy(normalize(yes)) - (1 - p) * entropy(normalize(no));
    // Deterministic snapshot order breaks ties, making replay and concurrent retries stable.
    if (gain > bestGain + 1e-12) { best = item; bestGain = gain; }
  }
  if (!best) throw new Error(`Japanese bank exhausted domain: ${domain}`);
  return best;
}

export function estimateJapaneseLevel(bank: JapanesePlacementBank, evidence: Evidence, responses: JapaneseResponse[]) {
  const policy = bank.assessment!;
  const items = new Map(bank.items.map((item) => [item.id, item]));
  const answered = responses.filter((response) => response.kind !== "skip");
  const domains = new Set(answered.map((response) => items.get(response.itemId)!.domain));
  if (answered.length < policy.minimumAnswers || domains.size < policy.minimumDomains || !domains.has("reading") || !domains.has("writing")) {
    return { scope: "reading_writing" as const, status: "insufficient_evidence" as const, reason: "too_few_answers_or_domains" as const };
  }
  // Infer ability from the full response pattern, including wrong answers. Bound extrapolation
  // by the difficulty range actually administered in BOTH reading and construction.
  const measuredCeiling = Math.min(...["reading", "writing"].map((domain) => Math.max(0, ...answered
    .map((response) => items.get(response.itemId)!).filter((item) => item.domain === domain)
    .map((item) => JAPANESE_STUDY_BANDS.indexOf(item.calibration!.band)))));
  const quantile = (probability: number) => {
    let sum = 0;
    return evidence.posterior.findIndex((weight) => { sum += weight; return sum >= probability; });
  };
  const cap = Math.min(measuredCeiling, Math.max(...policy.supportedBands.map((band) => JAPANESE_STUDY_BANDS.indexOf(band))));
  const rank = Math.min(Math.max(0, quantile(0.5)), cap);
  return { scope: "reading_writing" as const, status: "estimated" as const, provisional: true as const,
    band: JAPANESE_STUDY_BANDS[rank],
    // Range includes uncertainty above an evidence-capped estimate; it is not a certified confidence interval.
    modelRange: { lower: JAPANESE_STUDY_BANDS[Math.min(rank, Math.max(0, quantile(0.05)))],
      upper: JAPANESE_STUDY_BANDS[Math.max(rank, quantile(0.95))] },
  };
}
