import "server-only";
import { JAPANESE_PLACEMENT_DOMAINS, JAPANESE_STUDY_BANDS, japaneseEvidenceKey, japaneseQuestionLimit, sentenceOrderSignature,
  type JapanesePlacementBank, type JapanesePlacementItem } from "./bank";
import type { JapaneseResponse } from "./attempt";
import type { JapaneseResponseInput } from "./public";

export function isCorrectJapaneseResponse<T extends JapaneseResponseInput>(item: JapanesePlacementItem, response: T): boolean {
  if (response.kind === "answer" && item.responseType === "choice") return response.choiceId === item.correctChoiceId;
  if (response.kind === "sentence_assembly" && item.responseType === "sentence_assembly") {
    const submitted = sentenceOrderSignature(item, response.tileIds);
    return item.acceptedOrders.some((order) => sentenceOrderSignature(item, order) === submitted);
  }
  return false;
}

export function initialJapaneseEvidence() {
  return { posterior: JAPANESE_STUDY_BANDS.map(() => 1 / JAPANESE_STUDY_BANDS.length),
    rubric: { target: 3, streak: 0, observations: [] as { domain: JapanesePlacementItem["domain"]; rank: number; correct: boolean; skipped: boolean; anchor: boolean }[] },
    used: new Set<string>(), usedGroups: new Set<string>(), counts: Object.fromEntries(JAPANESE_PLACEMENT_DOMAINS.map((domain) => [domain, 0])) as Record<typeof JAPANESE_PLACEMENT_DOMAINS[number], number> };
}
type Evidence = ReturnType<typeof initialJapaneseEvidence>;
const normalize = (values: number[]) => { const sum = values.reduce((a, b) => a + b, 0); return values.map((value) => value / sum); };
const entropy = (values: number[]) => -values.reduce((sum, value) => sum + (value === 0 ? 0 : value * Math.log(value)), 0);

/** Replay rubric observations or legacy likelihoods; no English thresholds or JLPT score conversion. */
export function updateJapaneseEvidence(evidence: Evidence, item: JapanesePlacementItem, response: JapaneseResponse): void {
  if (evidence.usedGroups.has(japaneseEvidenceKey(item))) throw new Error("Repeated Japanese evidence item or passage");
  const correct = isCorrectJapaneseResponse(item, response);
  if (item.placementRole) {
    const rank = JAPANESE_STUDY_BANDS.indexOf(item.referenceBand!);
    const rubric = evidence.rubric;
    rubric.observations.push({ domain: item.domain, rank, correct, skipped: response.kind === "skip", anchor: item.placementRole === "anchor" });
    if (item.domain !== "kana") {
      if (!correct) { rubric.target = Math.min(rubric.target, Math.max(1, rank - 1)); rubric.streak = 0; }
      else if (rank >= rubric.target && ++rubric.streak >= 2) { rubric.target = Math.min(5, rank + 1); rubric.streak = 0; }
    }
  } else {
    if (!item.calibration) throw new Error("Japanese calibration required");
    evidence.posterior = normalize(evidence.posterior.map((weight, index) => weight * (correct
      ? item.calibration!.probabilities[index] : 1 - item.calibration!.probabilities[index])));
  }
  evidence.used.add(item.id);
  evidence.usedGroups.add(japaneseEvidenceKey(item));
  evidence.counts[item.domain]++;
}

/** Balance domain quotas first, then use the bank's versioned selection rule within that domain. */
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
  const candidates = bank.sequence.map((id) => byId.get(id)!).filter((item) => item.domain === domain && !evidence.usedGroups.has(japaneseEvidenceKey(item))
    && (bank.schemaVersion !== 5 || !["reading", "writing"].includes(domain) || item.placementRole === "anchor"));
  if (bank.schemaVersion === 5) {
    const target = domain === "kana" ? 1 : evidence.rubric.target;
    const supported = new Set(bank.assessment.supportedBands);
    const eligible = candidates.filter((item) => domain === "kana" || supported.has(item.referenceBand!));
    // Snapshot order breaks equal-distance ties. No probabilities or learned difficulty are assumed.
    const selected = eligible.sort((a, b) => Math.abs(JAPANESE_STUDY_BANDS.indexOf(a.referenceBand!) - target) - Math.abs(JAPANESE_STUDY_BANDS.indexOf(b.referenceBand!) - target))[0];
    if (!selected) throw new Error(`Japanese bank exhausted domain: ${domain}`);
    return selected;
  }
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
  if (bank.schemaVersion === 5) {
    const observed = evidence.rubric.observations.filter((row) => row.domain !== "kana");
    for (const band of [...JAPANESE_STUDY_BANDS].reverse()) {
      if (band === "BELOW_N5" || !policy.supportedBands.includes(band)) continue;
      const rank = JAPANESE_STUDY_BANDS.indexOf(band);
      // Success on harder tasks supports a lower study band; harder failures do not disprove it.
      const relevant = observed.filter((row) => row.rank === rank || (row.rank > rank && row.correct));
      const success = relevant.filter((row) => row.correct);
      if (success.length >= 4 && success.length * 3 >= relevant.length * 2
        && success.filter((row) => row.domain === "reading" && row.anchor).length >= 2
        && success.some((row) => row.domain === "writing" && row.anchor)
        && new Set(success.map((row) => row.domain)).size >= 3) {
        return { scope: "reading_writing" as const, status: "estimated" as const, provisional: true as const, basis: "jlpt_aligned_rules" as const, band };
      }
    }
    const basic = observed.filter((row) => row.rank === 1 && !row.skipped);
    const basicSuccess = basic.filter((row) => row.correct);
    if (basic.length >= 4 && basicSuccess.length * 3 < basic.length * 2
      && basic.filter((row) => row.anchor && row.domain === "reading" && !row.correct).length >= 2
      && basic.some((row) => row.anchor && row.domain === "writing" && !row.correct)
      && !observed.some((row) => row.correct && row.anchor)) {
      return { scope: "reading_writing" as const, status: "estimated" as const, provisional: true as const, basis: "jlpt_aligned_rules" as const, band: "BELOW_N5" as const };
    }
    return { scope: "reading_writing" as const, status: "insufficient_evidence" as const, reason: "unconfirmed_reading_or_construction" as const };
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
