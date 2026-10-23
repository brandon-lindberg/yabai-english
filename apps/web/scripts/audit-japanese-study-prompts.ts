import path from "node:path";
import { loadJapaneseStudyArtifacts } from "../src/lib/japanese-content/study-artifacts";
import { auditJapaneseStudyPrompts } from "../src/lib/study/japanese-prompt-audit";

async function main() {
  if (process.argv.length > 2) throw new Error("Usage: japanese-content:prompts (no arguments)");
  const { source, study } = await loadJapaneseStudyArtifacts(path.resolve(__dirname, ".."));
  console.log(JSON.stringify(auditJapaneseStudyPrompts(source, study), null, 2));
}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
