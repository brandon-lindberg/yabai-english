import { resolve } from "node:path";
import { loadContentCatalog } from "../src/lib/japanese-placement/content-files";
import { buildContentItems, inspectContentCoverage } from "../src/lib/japanese-placement/content-pack";

async function main() {
  const args = process.argv.slice(2);
  for (const arg of args) if (!["--json", "--items", "--strict"].includes(arg)) throw new Error(`Unknown argument: ${arg}`);
  const { pack, sourceExcerpts, packs, selectionLedgers } = await loadContentCatalog(resolve("data/japanese-placement"));
  const items = buildContentItems(pack);
  const coverage = inspectContentCoverage(pack);
  const report = { packId: pack.id, revision: pack.revision, packs, coverageScope: "six_domain_authoring", ...coverage, items: items.length,
    sources: pack.sources.map(({ id, license, attribution }) => ({ id, license, attribution })),
    sourceExcerpts, selectionLedgers, publicationReady: false,
    remaining: ["Japanese content, distractor and alternative-order review", "Full-bank integration, capacity and passage grouping", "Difficulty calibration and learner validation", "Bank publication and real-bank completion checks"],
  };
  if (args.includes("--items")) process.stdout.write(`${JSON.stringify({ packId: pack.id, status: "draft", sources: pack.sources, items }, null, 2)}\n`);
  else if (args.includes("--json")) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  else process.stdout.write([
    `Japanese placement draft content: ${pack.id} v${pack.revision}`,
    ...coverage.bands.map((row) => `${row.band}: ${row.passages} passages / ${row.readingItems} reading questions / ${row.assemblies} assemblies / ${row.kana} kana / ${row.kanjiReading} kanji readings / ${row.vocabulary} vocabulary / ${row.grammar} grammar; ${row.genres.join(", ")}`),
    `${items.length} items; ${sourceExcerpts} source excerpts verified.`,
    ...selectionLedgers.map((row) => `${row.packId} selection ledger: ${row.selected} selected / ${row.deferred} deferred / ${row.excluded} excluded.`),
    `Six-domain authoring target (kana at N5 only): ${coverage.complete ? "met" : "incomplete"}. Student publication: not ready.`,
    ...report.remaining.map((issue) => `- ${issue}`),
    "No database writes, learner publication or calibration are performed.", "",
  ].join("\n"));
  // Strict here checks the declared content target, not the separate publication gate.
  if (args.includes("--strict") && !coverage.complete) process.exitCode = 1;
}
main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
