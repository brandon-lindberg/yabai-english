import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { loadJapaneseStudyContentReview, serializeJapaneseContentReviewRows } from "../src/lib/japanese-content/study-content-review";

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || args.some(arg => arg !== "--check")) throw new Error("Usage: japanese-content:review [--check]");
  const webRoot = path.resolve(__dirname, "..");
  const cache = path.join(webRoot, ".cache/japanese-content");
  const review = await loadJapaneseStudyContentReview(webRoot);
  const bytes = JSON.stringify(review.summary, null, 2) + "\n";
  const target = path.join(webRoot, "data/japanese-content/reports/content-review.json");
  if (args.includes("--check")) {
    if (await readFile(target, "utf8") !== bytes) throw new Error("Study content review drifted. Regenerate and inspect the source-bound review findings.");
  } else {
    await writeFile(path.join(cache, "content-review-v1.jsonl"), serializeJapaneseContentReviewRows(review.records));
    await writeFile(target, bytes);
  }
  console.log(JSON.stringify({ checked: args.includes("--check"), ...review.summary.counts, rowsSha256: review.summary.rowsSha256, publicationChanged: false }, null, 2));
}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
