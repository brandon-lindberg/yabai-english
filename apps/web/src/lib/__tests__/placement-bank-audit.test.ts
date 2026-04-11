import path from "node:path";
import { describe, expect, test } from "vitest";
import { auditPlacementBank } from "@/lib/placement-bank/placement-bank-audit";
import { loadPlacementBankSync } from "@/lib/placement-bank/load-placement-bank";

describe("placement bank audit (JSON files)", () => {
  test("every scaffolded row passes automated quality checks", () => {
    const bank = loadPlacementBankSync(path.join(process.cwd()));
    const { issues } = auditPlacementBank(bank);
    expect(issues).toEqual([]);
  });
});
