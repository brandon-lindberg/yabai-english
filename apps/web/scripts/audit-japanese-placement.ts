import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { bankDigest, inspectBankReadiness, JAPANESE_PLACEMENT_DOMAINS, parseJapaneseBank } from "../src/lib/japanese-placement/bank";

async function main() {
  const args = process.argv.slice(2);
  for (const argument of args) {
    if (!["--strict", "--json"].includes(argument)) throw new Error(`Unknown argument: ${argument}`);
  }
  const bank = parseJapaneseBank(JSON.parse(await readFile(resolve("data/japanese-placement/review-bank.json"), "utf8")));
  const audit = inspectBankReadiness(bank);
  const report = {
    bankId: bank.id, bankVersion: bank.version, bankDigest: bankDigest(bank), items: bank.items.length,
    domains: Object.fromEntries(JAPANESE_PLACEMENT_DOMAINS.map((domain) => [domain, bank.items.filter((item) => item.domain === domain).length])),
    ...audit,
  };
  if (args.includes("--json")) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  else {
    process.stdout.write([
      `Japanese placement: ${report.bankId} v${report.bankVersion}`,
      `Content snapshot: ${report.bankDigest}`,
      `${report.items} reading/writing review samples`,
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
