import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { auditJapaneseCorpus, buildJapaneseSamples } from "../src/lib/japanese-content/corpus-audit";
import { fetchPinnedSources, loadJapaneseCorpus, parseSourceLock } from "../src/lib/japanese-content/source-files";
import { renderJapaneseAudit } from "../src/lib/japanese-content/report";

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => !["--fetch", "--strict"].includes(arg))) throw new Error("Usage: japanese-content:audit [--fetch] [--strict]");
  const webRoot = path.resolve(__dirname, "..");
  const contentRoot = path.join(webRoot, "data", "japanese-content");
  const cacheDir = path.join(webRoot, ".cache", "japanese-content");
  const lock = parseSourceLock(JSON.parse(await readFile(path.join(contentRoot, "source-lock.json"), "utf8")));
  if (args.includes("--fetch")) {
    console.log(`Fetching/verifying ${lock.files.length} pinned source files (no application database access).`);
    await fetchPinnedSources(lock.files, cacheDir);
  }
  const input = await loadJapaneseCorpus(lock, cacheDir);
  const report = auditJapaneseCorpus(input);
  const samples = buildJapaneseSamples(input, report);
  const { reconciliation, ...summary } = report;
  const provenance = {
    openjlptCommit: lock.openjlptCommit, referenceCommit: lock.referenceCommit,
    dictionaryRelease: lock.dictionaryRelease, sourceLock: "../source-lock.json",
  };
  const output = path.join(contentRoot, "reports");
  await mkdir(output, { recursive: true });
  await Promise.all([
    writeFile(path.join(output, "audit.json"), JSON.stringify({ provenance, ...summary }, null, 2) + "\n"),
    writeFile(path.join(output, "reconciliation.jsonl"), reconciliation.map((row) => JSON.stringify(row)).join("\n") + "\n"),
    writeFile(path.join(output, "samples.json"), JSON.stringify({ provenance, teacherReview: "pending", samples }, null, 2) + "\n"),
    writeFile(path.join(output, "README.md"), renderJapaneseAudit(report, samples)),
  ]);
  console.log(JSON.stringify({ ...provenance, counts: report.counts, dictionaryVerifiedVocabulary: report.dictionaryVerifiedVocabularyIds.length, dictionaryVerifiedKanji: report.dictionaryVerifiedKanji.length, issues: report.issues.length, samples: samples.length, publicationReady: report.publicationReady }, null, 2));
  if (args.includes("--strict") && (!report.publicationReady || report.issues.length || report.counts.unmatched || report.counts.ambiguous)) {
    console.error("Publication gate is blocked: resolve the report and complete Japanese-teacher review.");
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
