import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildJapaneseFlashcardCatalog, serializeJapaneseFlashcards, summarizeJapaneseFlashcards } from "../src/lib/japanese-content/flashcard-catalog";
import { fetchPinnedSources, loadJapaneseCorpus, parseSourceLock, readPinnedSourceBytes } from "../src/lib/japanese-content/source-files";
import { parseVocabularyCorrections } from "../src/lib/japanese-content/vocabulary-corrections";
import { parseReferenceDecisions } from "../src/lib/japanese-content/reference-decisions";
import { buildJapaneseStudyCatalog, parseJapaneseStudyPolicy, serializeJapaneseStudyCatalog, summarizeJapaneseStudyCatalog } from "../src/lib/japanese-content/study-catalog";

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || args.some((arg) => !["--check", "--fetch"].includes(arg))) throw new Error("Usage: japanese-content:flashcards [--check | --fetch]");
  const webRoot = path.resolve(__dirname, "..");
  const contentRoot = path.join(webRoot, "data", "japanese-content");
  const cacheDir = path.join(webRoot, ".cache", "japanese-content");
  const lock = parseSourceLock(JSON.parse(await readFile(path.join(contentRoot, "source-lock.json"), "utf8")));
  const corrections = parseVocabularyCorrections(JSON.parse(await readFile(path.join(contentRoot, "vocabulary-corrections.json"), "utf8")));
  const references = parseReferenceDecisions(JSON.parse(await readFile(path.join(contentRoot, "reference-decisions.json"), "utf8")));
  const studyPolicy = parseJapaneseStudyPolicy(JSON.parse(await readFile(path.join(contentRoot, "study-policy.json"), "utf8")));
  if (args.includes("--fetch")) await fetchPinnedSources(corrections.phraseSources, cacheDir);
  for (const source of corrections.phraseSources) await readPinnedSourceBytes(source, cacheDir);
  const dictionaryIds = [...new Set([
    ...corrections.records.flatMap((record) => record.status === "corrected" ? record.evidence.dictionaryIds : []),
    ...references.records.flatMap((record) => record.kind === "dictionary-supplement" ? [record.entryId] : []),
  ])];
  const input = await loadJapaneseCorpus(lock, cacheDir, dictionaryIds);
  const catalog = buildJapaneseFlashcardCatalog(input, lock, corrections, references);
  const summary = summarizeJapaneseFlashcards(catalog);
  const study = buildJapaneseStudyCatalog(catalog, input.dictionaryWords, studyPolicy);
  const studySummary = summarizeJapaneseStudyCatalog(study);
  const summaryBytes = JSON.stringify(summary, null, 2) + "\n";
  const summaryPath = path.join(contentRoot, "reports", "flashcards.json");
  const studySummaryPath = path.join(contentRoot, "reports", "study.json");
  const studySummaryBytes = JSON.stringify(studySummary, null, 2) + "\n";
  if (args.includes("--check")) {
    if (await readFile(summaryPath, "utf8") !== summaryBytes) throw new Error("Flashcard import summary drifted. Rebuild and review the source/content changes.");
    if (await readFile(studySummaryPath, "utf8") !== studySummaryBytes) throw new Error("Canonical study summary drifted. Rebuild and review the grouping/level decisions.");
    console.log(`Verified draft catalog: ${catalog.cards.length} cards; SHA-256 ${summary.catalogSha256}`);
  } else {
    await mkdir(path.dirname(summaryPath), { recursive: true });
    await writeFile(path.join(cacheDir, "flashcards-v4.json"), serializeJapaneseFlashcards(catalog));
    await writeFile(summaryPath, summaryBytes);
    await writeFile(path.join(cacheDir, "study-v1.json"), serializeJapaneseStudyCatalog(study));
    await writeFile(studySummaryPath, studySummaryBytes);
    console.log(`Built draft catalog: ${catalog.cards.length} cards; SHA-256 ${summary.catalogSha256}`);
  }
  console.log(`Vocabulary: ${summary.counts.vocabulary} (${summary.directDictionaryVocabulary} direct dictionary matches; ${summary.derivedVocabulary} supported constructions; ${summary.attestedPhraseVocabulary} source-attested phrases; ${summary.unsupportedVocabularyIds.length} unsupported); kanji: ${summary.counts.kanji} (${summary.dictionaryVerifiedKanji} on/kun-verified).`);
  console.log(`Reference rows: ${summary.counts.referenceRows}; supplements: ${summary.referenceCoverage.supplementedRows}; character coverage: ${summary.referenceCoverage.characterRows}; unresolved unmatched: ${summary.referenceCoverage.unresolvedUnmatchedRows}; unresolved ambiguous: ${summary.referenceCoverage.unresolvedAmbiguousRows}. No database access or publication.`);
  console.log(`Canonical study: ${studySummary.counts.units} units; ${studySummary.counts.sourceRecords} source identities; ${studySummary.counts.mergedGroups} explicit variant groups; ${studySummary.counts.levelDecisions} recorded level decisions. SHA-256 ${studySummary.catalogSha256}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
