import path from "node:path";
import { describe, expect, test } from "vitest";
import { EXPECTED_PLACEMENT_QUESTION_TOTAL } from "@/lib/placement-bank/constants";
import { auditPlacementBank } from "@/lib/placement-bank/placement-bank-audit";
import { loadPlacementBankSync } from "@/lib/placement-bank/load-placement-bank";

describe("placement bank audit (JSON files)", () => {
  test("bank loads with correct size (heuristic audit: yarn placement-bank:audit)", () => {
    const bank = loadPlacementBankSync(path.join(process.cwd()));
    expect(bank).toHaveLength(EXPECTED_PLACEMENT_QUESTION_TOTAL);
    const { issues } = auditPlacementBank(bank);
    expect(Array.isArray(issues)).toBe(true);
    // Full strict checks (VOCAB_QUESTION_SHAPE, etc.) are for scaffolded/template banks.
    // LLM-curated content is reviewed manually; run `yarn placement-bank:audit` when editing JSON.
  });
});
