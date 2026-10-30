import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { parse } from "dotenv";
import { withIsolatedPostgres } from "../test/isolated-postgres";
import { seedPlacementBankQuestions } from "../prisma/seed-placement-bank";
import { seedStudyTrack } from "../prisma/seed-study";
import { loadReleasedJapaneseBank } from "../src/lib/japanese-placement/release";
import { publishJapaneseBank } from "../src/lib/japanese-placement/service";
import { loadJapaneseStudyArtifacts } from "../src/lib/japanese-content/study-artifacts";
import { importJapaneseStudyDraft } from "../src/lib/study/japanese-import";
import { seedJapaneseStudy } from "../test/japanese-study-db-fixture";
import { MIRROR_RELEASE_AUTH_ENV } from "../test/mirror-release-environment";

async function main() {
  if (existsSync("../../.impeccable/mirror-fixtures.json")) throw new Error("An existing fixture manifest must be cleaned up by its owner first");
  const args = process.argv.slice(2);
  const capture = args.includes("--capture");
  const synthetic = args.includes("--synthetic-draft");
  const filter = args.filter(arg => !["--capture", "--synthetic-draft"].includes(arg));
  if (filter.length && (filter.length !== 2 || filter[0] !== "--grep")) throw new Error("Use test:mirror:e2e [--capture] [--synthetic-draft] [--grep pattern]");
  const connectionString = process.env.MIRROR_TEST_DATABASE_URL ?? parse(readFileSync(".env", "utf8")).DATABASE_URL;
  if (!connectionString || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(connectionString).hostname)) throw new Error("Local PostgreSQL required");
  process.env.MIRROR_TEST_DATABASE_URL = connectionString;
  let interrupted = false;
  let active: ReturnType<typeof spawn> | undefined;
  const stop = () => { interrupted = true; active?.kill("SIGTERM"); };
  process.on("SIGINT", stop); process.on("SIGTERM", stop);
  try { await withIsolatedPostgres("20261027010000_study_catalog_card_snapshots", async ({ client, db, applyMigration }) => {
    await applyMigration();
    const schema = (await client.query("SELECT current_schema() AS schema")).rows[0].schema as string;
    if (!/^mirror_test_[a-f0-9]{32}$/.test(schema)) throw new Error("Invalid disposable schema");
    const url = new URL(connectionString);
    url.searchParams.set("schema", schema);
    url.searchParams.set("options", `-c search_path=${schema}`);
    const childEnv = { ...process.env, ...MIRROR_RELEASE_AUTH_ENV, DATABASE_URL: url.toString(), MIRROR_QA_DATABASE_URL: url.toString(), ...(capture ? { MIRROR_RELEASE_CAPTURE: "1" } : {}) };
    const fingerprint = async () => {
      const rows: Record<string, { count: number; digest: string }> = {};
      for (const table of ["User", "StudentProfile", "TeacherProfile", "PlacementBankQuestion", "StudyTrack", "StudyLevel", "StudyDeck", "StudyCard", "StudyAssessment", "StudyCatalogSnapshot", "UserStudyCardState", "UserStudyLevelProgress", "UserStudyAssessmentAttempt", "StudyQuickReviewDay", "StudyReviewPrompt", "JapanesePlacementBankSnapshot", "JapanesePlacementAttempt", "JapanesePlacementResponse", "Booking", "Payment", "Invoice", "Notification"]) {
        rows[table] = (await client.query(`SELECT count(*)::int AS count, md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id)::text,'[]')) AS digest FROM public."${table}" t`)).rows[0];
      }
      return rows;
    };
    const protectedBefore = await fingerprint();
    const run = (commandArgs: string[], cleanup = false) => new Promise<void>((resolve, reject) => {
      if (interrupted && !cleanup) return reject(new Error("Browser verification interrupted"));
      active = spawn(process.execPath, commandArgs, { stdio: "inherit", env: childEnv });
      console.log(JSON.stringify({ ownedPid: active.pid, schema }));
      active.once("error", reject);
      active.once("close", (code, signal) => { active = undefined; if (code === 0) resolve(); else reject(new Error(`Owned command exited ${code ?? signal}`)); });
    });
    try {
      await seedPlacementBankQuestions(db);
      await seedStudyTrack(db);
      await publishJapaneseBank(db, await loadReleasedJapaneseBank("data/japanese-placement", "public"));
      const cached = !synthetic && (existsSync(".cache/japanese-content/study-v1.json") || existsSync(".cache/japanese-content/flashcards-v4.json"));
      if (cached) {
        const { source, study } = await loadJapaneseStudyArtifacts(process.cwd());
        await importJapaneseStudyDraft(db, source, study);
        console.log(`Isolated Japanese study draft: reviewed corpus, ${study.units.length} canonical cards.`);
      } else {
        await seedJapaneseStudy(db);
        await db.studyTrack.update({ where: { slug: "japanese-flashcards" }, data: { publicationStatus: "DRAFT" } });
        console.log(`Isolated Japanese study draft: shared synthetic prompt fixture, ${await db.studyCard.count({ where: { kind: { not: "ENGLISH_EXERCISE" } } })} canonical cards.`);
      }
      await run(["--conditions=react-server", "--import", "tsx", "scripts/mirror-journey-fixtures.ts", "create", "--release"]);
      await run(["node_modules/@playwright/test/cli.js", "test", "--config", "playwright.release.config.ts", ...filter]);
    } finally {
      try {
        const manifest = "../../.impeccable/mirror-fixtures.json";
        if (existsSync(manifest) && JSON.parse(readFileSync(manifest, "utf8")).schema === schema) await run(["--conditions=react-server", "--import", "tsx", "scripts/mirror-journey-fixtures.ts", "cleanup"], true);
      }
      finally {
        const protectedAfter = await fingerprint();
        const unchanged = JSON.stringify(protectedBefore) === JSON.stringify(protectedAfter);
        mkdirSync("../../.impeccable/review/release", { recursive: true });
        writeFileSync(`../../.impeccable/review/release/protected-${schema}.json`, JSON.stringify({ unchanged, before: protectedBefore, after: protectedAfter }, null, 2));
        if (!unchanged) throw new Error("Application table fingerprints changed during browser verification");
        console.log("Application table fingerprints unchanged.");
      }
    }
  }); } finally { process.off("SIGINT", stop); process.off("SIGTERM", stop); }
  console.log("Disposable browser schema and connections removed.");
}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
