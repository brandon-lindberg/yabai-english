import { readFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./digest";
import { type JapaneseFlashcardCatalog } from "./flashcard-catalog";
import { type JapaneseStudyCatalog } from "./study-catalog";

/** Only import exact artifacts that reproduce the tracked, reviewed summaries. */
export async function loadJapaneseStudyArtifacts(webRoot: string) {
  const cache = path.join(webRoot, ".cache/japanese-content");
  const reports = path.join(webRoot, "data/japanese-content/reports");
  const [sourceBytes, studyBytes, sourceReport, studyReport] = await Promise.all([
    readFile(path.join(cache, "flashcards-v4.json"), "utf8"), readFile(path.join(cache, "study-v1.json"), "utf8"),
    readFile(path.join(reports, "flashcards.json"), "utf8"), readFile(path.join(reports, "study.json"), "utf8"),
  ]);
  if (sha256(sourceBytes) !== JSON.parse(sourceReport).catalogSha256 || sha256(studyBytes) !== JSON.parse(studyReport).catalogSha256) throw new Error("Draft study artifacts differ from tracked summaries; rebuild and review before importing");
  return { source: JSON.parse(sourceBytes) as JapaneseFlashcardCatalog, study: JSON.parse(studyBytes) as JapaneseStudyCatalog };
}
