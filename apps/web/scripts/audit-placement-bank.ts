/**
 * Run from apps/web: `yarn placement-bank:audit`
 * Validates every row in data/placement-bank/*.json (structure, duplicate options, a few answer–prompt checks).
 */
import path from "node:path";
import { loadPlacementBankSync } from "../src/lib/placement-bank/load-placement-bank";
import { auditPlacementBank } from "../src/lib/placement-bank/placement-bank-audit";

const root = path.resolve(process.cwd());
const bank = loadPlacementBankSync(root);
const { issues, errorCount } = auditPlacementBank(bank);

if (issues.length === 0) {
  console.log(`OK: ${bank.length} placement bank rows passed audit.`);
  process.exit(0);
}

for (const i of issues) {
  console.error(`${i.id}\t${i.code}\t${i.message}`);
}
console.error(`\nFailed: ${errorCount} issue(s).`);
process.exit(1);
