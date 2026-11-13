import { JAPANESE_PLACEMENT_DOMAINS, type JapanesePlacementResult } from "../src/lib/japanese-placement/public";

/** Saved-result presentation fixture; never used to score or seed application learners. */
export function japanesePlacementResultFixture(): JapanesePlacementResult {
  return { attemptId: "awarded", completedAt: "2026-01-31T10:00:00.000Z",
    levelEstimate: { status: "estimated", scope: "reading_writing", band: "N5", provisional: true, basis: "jlpt_aligned_rules" },
    domains: JAPANESE_PLACEMENT_DOMAINS.map(domain => ({ domain, planned: 4, answered: 4, correct: 3, incorrect: 1, notSure: 0, observation: "observed" })),
  };
}
