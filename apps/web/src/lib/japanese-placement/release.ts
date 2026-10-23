import "server-only";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { bankDigest, loadApprovedJapaneseBank, type JapanesePlacementBank } from "./bank";
import { loadJapaneseRubricBank } from "./rubric-content";

const licenceFiles = ["kotonoha-MIT.txt", "nihongo-mono-MIT.txt", "nihongo-mono-DATA.md", "yomitaku-MIT.txt",
  "jlptsuccess-LICENSE.txt", "jlptsuccess-CONTENT.md", "openjlpt-LICENSE", "openjlpt-NOTICE.md", "waller-LICENSE.txt"];

/** Public credits are generated from the same private sources; keys and release records never enter them. */
export async function renderJapaneseReleaseNotices(bank: JapanesePlacementBank, directory: string) {
  const notices = await Promise.all(licenceFiles.map(async (file) => `--- ${file} ---\n${(await readFile(join(directory, "licences", file), "utf8")).trim()}`));
  return [
    "Japanese assessment — Sources and licences / 日本語レベルチェック — 出典・ライセンス",
    `Bank: ${bank.id}, version ${bank.version}; content SHA-256: ${bankDigest(bank)}`,
    "Generated from the release sources and retained licence files by japanese-placement:publish --write-notices.",
    "Original contributions and CC BY-SA adaptations: English Platform contributors, 2026; CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/.",
    "MIT source material retains its original notices below. Licensed assessment content may be reused under its applicable terms; no additional restrictions are imposed on that content.",
    "These are adapted practice tasks, not official JLPT questions or certification. Source owners do not endorse this assessment. Content is provided without warranties under the licences below.",
    "Selected JMdict-derived spellings/readings/glosses are copyright James William BREEN and the Electronic Dictionary Research and Development Group (EDRDG), used in conformance with https://www.edrdg.org/edrdg/licence.html.",
    "JMdict documentation: https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project ; pinned English dictionary edition: 2026-10-19, scriptin/jmdict-simplified 3.6.2+20261019180022.",
    "Only the stated vocabulary fields and community level references are used here. No Tatoeba sentences, KanjiVG drawings, audio or dictionary software are imported. Broader upstream notices are retained verbatim below for context.",
    ...bank.sources.map((source) => [`--- ${source.title} ---`, `Source: ${source.location}`, `Revision: ${source.revision}`, `Licence: ${source.license}`, source.attribution].join("\n")),
    ...notices, "",
  ].join("\n\n");
}

export async function loadJapaneseReleaseCandidate(directory: string) {
  const bank = await loadJapaneseRubricBank(directory);
  const ownerRelease: unknown = JSON.parse(await readFile(join(directory, "release.json"), "utf8"));
  return loadApprovedJapaneseBank({ ...bank, ownerRelease });
}

export async function loadReleasedJapaneseBank(directory: string, publicDirectory: string) {
  const bank = await loadJapaneseReleaseCandidate(directory);
  const notices = await renderJapaneseReleaseNotices(bank, directory);
  if (createHash("sha256").update(notices).digest("hex") !== bank.ownerRelease!.notices.sha256
    || await readFile(join(publicDirectory, bank.ownerRelease!.notices.path), "utf8") !== notices) {
    throw new Error("Japanese release notices are missing, modified or stale");
  }
  return bank;
}
