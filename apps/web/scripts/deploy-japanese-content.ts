import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { bankDigest } from "../src/lib/japanese-placement/bank";
import { loadReleasedJapaneseBank } from "../src/lib/japanese-placement/release";
import { assertJapaneseDeploymentPins, japaneseDeploymentDatabaseTarget, publishJapaneseDeployment } from "../src/lib/japanese-content/deployment";
import { loadJapaneseStudyArtifacts } from "../src/lib/japanese-content/study-artifacts";
import { inspectJapaneseStudyDraft, japaneseStudyPublicationGuard, prepareJapaneseStudyImport } from "../src/lib/study/japanese-import";
import { parseJapaneseDraftRefreshGuard } from "../src/lib/study/japanese-import-options";

async function main() {
  const { values } = parseArgs({ strict: true, allowPositionals: false, options: {
    inspect: { type: "boolean" }, publish: { type: "boolean" },
    "expected-host": { type: "string" }, "expected-database": { type: "string" },
    "expected-study-snapshot": { type: "string" }, "expected-cards-sha256": { type: "string" },
  } });
  const mode = values.publish ? "publish" : values.inspect ? "inspect" : "verify";
  if ((values.inspect && values.publish) || (mode === "verify" && Object.keys(values).length > 0)
    || (mode === "inspect" && (values["expected-study-snapshot"] || values["expected-cards-sha256"]))) {
    throw new Error("Choose offline verification, explicit inspection, or pinned publication");
  }
  if (mode !== "verify" && (!values["expected-host"] || !values["expected-database"])) {
    throw new Error("Explicit expected host and database name are required");
  }
  const publication = mode === "publish" ? parseJapaneseDraftRefreshGuard({
    expectedSnapshotId: values["expected-study-snapshot"], expectedCardsSha256: values["expected-cards-sha256"],
  }) : null;
  const connectionString = process.env.JAPANESE_RELEASE_DATABASE_URL;
  const target = mode === "verify" ? null : japaneseDeploymentDatabaseTarget(connectionString, values["expected-host"]!, values["expected-database"]!);
  const bank = await loadReleasedJapaneseBank(resolve("data/japanese-placement"), resolve("public"));
  const { source, study } = await loadJapaneseStudyArtifacts(process.cwd());
  const plan = prepareJapaneseStudyImport(source, study);
  if (publication) assertJapaneseDeploymentPins(plan, publication);
  const report = { mode, ready: true, placement: { version: bank.version, items: bank.items.length, digest: bankDigest(bank) },
    study: { cards: plan.cards.length, ...japaneseStudyPublicationGuard(plan) } };
  if (mode === "verify") { console.log(JSON.stringify(report, null, 2)); return; }

  const { PrismaClient } = await import("../src/generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString, application_name: "japanese-content-deployment" }) });
  try {
    if (mode === "inspect") {
      const placement = await db.japanesePlacementBankSnapshot.findUnique({
        where: { bankKey_version: { bankKey: bank.id, version: bank.version } },
        select: { id: true, digest: true, revokedAt: true, publishedAt: true },
      });
      const track = await db.studyTrack.findUnique({ where: { slug: plan.track.slug }, select: { id: true } });
      const savedStudy = track ? await inspectJapaneseStudyDraft(db, plan) : null;
      console.log(JSON.stringify({ ...report, target, current: { placement, study: savedStudy } }, null, 2));
      return;
    }
    const published = await publishJapaneseDeployment(db, { bank, source, study }, publication!);
    console.log(JSON.stringify({ ...report, target, published }, null, 2));
  } finally { await db.$disconnect(); }
}

main().catch(error => { console.error(error instanceof Error ? error.message : "Japanese content deployment failed"); process.exitCode = 1; });
