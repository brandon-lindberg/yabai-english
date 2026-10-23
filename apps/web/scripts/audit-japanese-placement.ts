import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { bankDigest, inspectBankReadiness, JAPANESE_PLACEMENT_DOMAINS, parseJapaneseBank } from "../src/lib/japanese-placement/bank";
import { loadContentCatalog } from "../src/lib/japanese-placement/content-files";
import { buildContentBank } from "../src/lib/japanese-placement/content-pack";

async function main() {
  const args = process.argv.slice(2);
  for (const argument of args) {
    if (!["--strict", "--json", "--samples"].includes(argument)) throw new Error(`Unknown argument: ${argument}`);
  }
  const bank = args.includes("--samples")
    ? parseJapaneseBank(JSON.parse(await readFile(resolve("data/japanese-placement/review-bank.json"), "utf8")))
    : buildContentBank((await loadContentCatalog(resolve("data/japanese-placement"))).pack);
  const audit = inspectBankReadiness(bank);
  const report = {
    bankId: bank.id, schemaVersion: bank.schemaVersion, bankVersion: bank.version, bankDigest: bankDigest(bank), items: bank.items.length,
    independentReadingPassages: bank.schemaVersion === 4 ? new Set(bank.items.filter((item) => item.domain === "reading").map((item) => item.passageId)).size : null,
    domains: Object.fromEntries(JAPANESE_PLACEMENT_DOMAINS.map((domain) => [domain, bank.items.filter((item) => item.domain === domain).length])),
    ...audit,
  };
  if (args.includes("--json")) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  else {
    process.stdout.write([
      `Japanese placement: ${report.bankId} v${report.bankVersion}`,
      `Content snapshot: ${report.bankDigest}`,
      `${report.items} reading/writing draft items${report.independentReadingPassages === null ? " (legacy format samples)" : `; ${report.independentReadingPassages} independent reading passages`}`,
      `Content publication: ${report.ready ? "reviewed snapshot ready" : "blocked"}`,
      ...report.issues.map((issue) => `- ${issue}`),
      "This audit does not calibrate proficiency or approve a learner-facing launch.",
      "",
    ].join("\n"));
  }
  if (args.includes("--strict") && !report.ready) process.exitCode = 1;
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
