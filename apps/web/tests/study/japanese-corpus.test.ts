import { access } from "node:fs/promises";
import { expect, test } from "vitest";
import { loadJapaneseStudyArtifacts } from "@/lib/japanese-content/study-artifacts";
import { auditJapaneseStudyPrompts } from "@/lib/study/japanese-prompt-audit";

const cached = await access(".cache/japanese-content/study-v1.json").then(() => true, () => false);
test.runIf(cached)("every canonical Japanese unit has source-backed, automatically graded prompts", async () => {
  const { source, study } = await loadJapaneseStudyArtifacts(process.cwd());
  const before = JSON.stringify(study);
  const report = auditJapaneseStudyPrompts(source, study);
  expect(report).toMatchObject({ units: 10291, coveredSourceMembers: 10307, omittedUnits: 0, publicationChanged: false });
  expect(report.taskCounts.vocabulary_meaning).toBe(7908);
  expect(report.taskCounts.vocabulary_reading).toBeGreaterThan(4000);
  expect(report.taskCounts.kanji_on + report.taskCounts.kanji_kun).toBeGreaterThanOrEqual(2383);
  expect(JSON.stringify(study)).toBe(before);
}, 30_000);
