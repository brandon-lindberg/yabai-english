import path from "node:path";
import { readFile } from "node:fs/promises";
import { parse } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { loadJapaneseStudyArtifacts } from "../src/lib/japanese-content/study-artifacts";
import { importJapaneseStudyDraft, inspectJapaneseStudyDraft, prepareJapaneseStudyImport } from "../src/lib/study/japanese-import";
import { parseJapaneseStudyImportOptions } from "../src/lib/study/japanese-import-options";

async function main() {
  const options = parseJapaneseStudyImportOptions(process.argv.slice(2));
  const root = path.resolve(__dirname, "..");
  const { source, study } = await loadJapaneseStudyArtifacts(root);
  const plan = prepareJapaneseStudyImport(source, study);
  if (options.mode === "verify") {
    console.log(`Verified draft persistence plan: ${plan.cards.length} canonical cards, ${source.cards.length} source identities, ${plan.levels.length} Japanese levels. No database access.\nSHA-256 ${plan.snapshot.studyCatalogSha256}`);
    return;
  }
  // This increment supports local draft persistence only. Read credentials only
  // for this explicit mode; the default verification command remains DB-free.
  const connectionString = process.env.JAPANESE_STUDY_DATABASE_URL ?? parse(await readFile(path.join(root, ".env"), "utf8")).DATABASE_URL;
  if (!connectionString || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(connectionString).hostname)) throw new Error("Draft import requires a local PostgreSQL database");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    if (options.mode === "inspect") {
      console.log(JSON.stringify(await inspectJapaneseStudyDraft(db, plan), null, 2));
      return;
    }
    const result = await importJapaneseStudyDraft(db, source, study, options.mode === "refresh" ? options.refresh : undefined);
    console.log(`${result.refreshed ? "Refreshed" : result.imported ? "Imported" : "Verified existing"} unpublished Japanese draft: ${result.cards} cards.\nSHA-256 ${result.digest}`);
  } finally { await db.$disconnect(); }
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
