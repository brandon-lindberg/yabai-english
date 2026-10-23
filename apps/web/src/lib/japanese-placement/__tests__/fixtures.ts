import type { JapanesePlacementBank } from "../bank";
import { bankDigest } from "../bank";

// Synthetic exercise mechanics only; these are not Japanese teaching material.
export function draftBank(): JapanesePlacementBank {
  const domains = ["kana", "kanji_reading", "vocabulary", "grammar", "reading", "writing"] as const;
  return {
    schemaVersion: 3,
    assessment: { revision: "japanese-posterior-v1", timeLimitSec: 1200,
      quotas: { kana: 1, kanji_reading: 1, vocabulary: 1, grammar: 1, reading: 1, writing: 1 },
      supportedBands: ["N3"], minimumAnswers: 6, minimumDomains: 6 },
    id: "synthetic-japanese-survey",
    version: 1,
    sources: [{
      id: "synthetic", origin: "original", title: "Test fixture",
      location: "test-fixtures", revision: "1", license: "Test use only",
      attribution: "Synthetic fixture", permissionEvidence: "Test fixture author",
    }],
    items: domains.map((domain) => ({
      id: `${domain}-one`, revision: 1, domain, focus: `${domain} fixture`,
      prompt: { en: "Choose the fixture answer.", ja: "テスト用の選択肢です。" },
      stimulus: { kind: "text" as const, text: `Synthetic ${domain} stimulus` },
      ...(domain === "writing" ? {
        responseType: "sentence_assembly" as const,
        tiles: [{ id: "verb", text: "読みます。" }, { id: "topic", text: "私は" }, { id: "object", text: "本を" }],
        acceptedOrders: [["topic", "object", "verb"]],
      } : {
        responseType: "choice" as const,
        choices: [{ id: "a", text: "Fixture A" }, { id: "b", text: "Fixture B" }],
        correctChoiceId: "a",
      }),
      explanation: { en: "Private answer rationale", ja: "テスト用の解説です。" },
      sourceIds: ["synthetic"],
      calibration: { band: domain === "kana" ? "N5" as const : "N3" as const,
        probabilities: domain === "kana" ? [0.2, 0.9, 0.9, 0.9, 0.9, 0.9] : [0.05, 0.1, 0.2, 0.5, 0.8, 0.9] },
    })),
    sequence: domains.map((domain) => `${domain}-one`),
    reviews: { japaneseTeacher: null, rights: null, placement: null },
  };
}

export function approvedBank(): JapanesePlacementBank {
  return approveBank(draftBank());
}

export function approveBank<T extends JapanesePlacementBank>(bank: T): T {
  const digest = bankDigest(bank);
  bank.reviews = {
    japaneseTeacher: { reviewerId: "fixture-teacher", reviewedAt: "2026-10-22T00:00:00.000Z", bankDigest: digest, evidence: "Synthetic approval only" },
    placement: { reviewerId: "fixture-placement", reviewedAt: "2026-10-22T00:00:00.000Z", bankDigest: digest, evidence: "Synthetic calibration only" },
    rights: { reviewerId: "fixture-rights", reviewedAt: "2026-10-22T00:00:00.000Z", bankDigest: digest, evidence: "Synthetic approval only" },
  };
  return bank;
}

const bands = ["N5", "N4", "N3", "N2", "N1"] as const;

// Synthetic probabilities exercise the engine; they are not calibrated Japanese content.
export function adaptiveBank(): JapanesePlacementBank {
  const base = draftBank();
  const bank = {
    ...base, id: "synthetic-adaptive", version: 3,
    assessment: {
      revision: "japanese-posterior-v1" as const, timeLimitSec: 1200 as const,
      quotas: { kana: 4, kanji_reading: 4, vocabulary: 4, grammar: 4, reading: 4, writing: 4 },
      supportedBands: [...bands], minimumAnswers: 6, minimumDomains: 6,
    },
    items: base.items.flatMap((item) => (item.domain === "kana" ? [bands[0]] : bands).flatMap((band) =>
      Array.from({ length: 4 }, (_, index) => ({
        ...item, id: `${item.domain}-${band.toLowerCase()}-${index}`,
        stimulus: { kind: "text" as const, text: `Synthetic ${item.domain} ${band} ${index}` },
        calibration: {
          band,
          probabilities: Array.from({ length: 6 }, (_, ability) => item.domain === "kana"
            ? ability === 0 ? 0.2 : 0.9
            : 0.02 + 0.96 / (1 + Math.exp(2 * (bands.indexOf(band) + 1 - ability)))),
        },
      })))),
    sequence: [] as string[],
  };
  bank.sequence = bank.items.map((item) => item.id);
  return approveBank(bank);
}

