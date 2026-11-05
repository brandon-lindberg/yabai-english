import { expect, test } from "vitest";
import { parseJapaneseStudyImportOptions } from "@/lib/study/japanese-import-options";

const snapshot = `ja-study:${"a".repeat(64)}`;
const digest = "b".repeat(64);
test("keeps artifact verification database-free unless an explicit operator mode is supplied", () => {
  expect(parseJapaneseStudyImportOptions([])).toEqual({ mode: "verify" });
  expect(parseJapaneseStudyImportOptions(["--inspect-draft"])).toEqual({ mode: "inspect" });
  expect(parseJapaneseStudyImportOptions(["--import-draft"])).toEqual({ mode: "import" });
  expect(parseJapaneseStudyImportOptions(["--refresh-draft-from", snapshot, "--expected-cards-sha256", digest]))
    .toEqual({ mode: "refresh", refresh: { expectedSnapshotId: snapshot, expectedCardsSha256: digest } });
});
test("publication requires the inspected snapshot and exact card digest", () => {
  expect(parseJapaneseStudyImportOptions(["--publish-draft-from", snapshot, "--expected-cards-sha256", digest]))
    .toEqual({ mode: "publish", publication: { expectedSnapshotId: snapshot, expectedCardsSha256: digest } });
});
test.each([
  ["--publish-draft-from", snapshot], ["--publish-draft-from", "bad", "--expected-cards-sha256", digest],
  ["--inspect-draft", "--publish-draft-from", snapshot, "--expected-cards-sha256", digest],
  ["--refresh-draft-from", snapshot, "--publish-draft-from", snapshot, "--expected-cards-sha256", digest],
  ["--refresh-draft-from", snapshot], ["--expected-cards-sha256", digest],
  ["--import-draft", "--inspect-draft"], ["--import-draft", "--refresh-draft-from", snapshot, "--expected-cards-sha256", digest],
  ["--refresh-draft-from", "bad", "--expected-cards-sha256", digest],
  ["--refresh-draft-from", snapshot, "--expected-cards-sha256", "bad"], ["--force"], ["unexpected"],
])("rejects ambiguous or unpinned operator arguments %j", (...args) => {
  expect(() => parseJapaneseStudyImportOptions(args)).toThrow();
});
