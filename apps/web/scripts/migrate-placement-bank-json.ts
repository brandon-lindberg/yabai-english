/**
 * One-off: rewrite data/placement-bank/*.json to instruction + question fields (drops legacy prompt fields and item tags).
 * Run: cd apps/web && yarn tsx scripts/migrate-placement-bank-json.ts
 */
import fs from "node:fs";
import path from "node:path";
import { PLACEMENT_BANK_BANDS } from "../src/lib/placement-bank/constants";
import { placementBankLevelFileSchema } from "../src/lib/placement-bank/schema";
import { splitLegacyPromptsToPresentation } from "../src/lib/placement-bank/presentation-fields";

const DATA = path.join(process.cwd(), "data", "placement-bank");

function main() {
  for (const band of PLACEMENT_BANK_BANDS) {
    const fp = path.join(DATA, `${band}.json`);
    const raw = JSON.parse(fs.readFileSync(fp, "utf8")) as {
      cefrBand: string;
      questions: Array<Record<string, unknown>>;
    };
    const questions = raw.questions.map((q) => {
      const section = q.section as "grammar" | "vocabulary" | "reading" | "functional";
      const promptEn = String(q.promptEn ?? "");
      const promptJa = String(q.promptJa ?? "");
      const { instructionEn, instructionJa, questionEn, questionJa } = splitLegacyPromptsToPresentation(
        section,
        promptEn,
        promptJa,
      );
      const rest = { ...(q as Record<string, unknown>) };
      delete rest.promptEn;
      delete rest.promptJa;
      return {
        ...rest,
        instructionEn,
        instructionJa,
        questionEn,
        questionJa,
      };
    });
    const next = { cefrBand: band, questions };
    placementBankLevelFileSchema.parse(next);
    fs.writeFileSync(fp, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    console.log(`Migrated ${fp} (${questions.length} questions)`);
  }
}

main();
