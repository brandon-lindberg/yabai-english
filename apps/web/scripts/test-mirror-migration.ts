import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { parse } from "dotenv";

// Read credentials only for this explicit opt-in test. Do not load the normal
// Vitest global setup, which seeds application placement tables.
const args = process.argv.slice(2);
if (args.length > 1 || args.some((argument) => !["--japanese-placement", "--english-placement", "--study", "--payments"].includes(argument))) throw new Error("Unknown database test argument");
const japanese = args.includes("--japanese-placement");
const study = args.includes("--study");
const english = args.includes("--english-placement");
const connectionString = process.env.MIRROR_TEST_DATABASE_URL ?? parse(readFileSync(".env")).DATABASE_URL;
if (!connectionString || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(connectionString).hostname)) {
  throw new Error("Set MIRROR_TEST_DATABASE_URL to a local PostgreSQL database. Verification uses an isolated temporary schema.");
}
const result = spawnSync("./node_modules/.bin/vitest", ["run", "--config",
  study ? "vitest.study.config.ts" : japanese ? "vitest.japanese-placement.config.ts" : english ? "vitest.english-placement.config.ts" : "vitest.mirror.config.ts",
  ...(study ? ["tests/study/persistence.test.ts", "tests/study/draft-refresh-persistence.test.ts", "tests/study/japanese-service-persistence.test.ts", "tests/study/japanese-dashboard-persistence.test.ts"] : [args.includes("--payments") ? "tests/mirror/payment-recovery.test.ts" : japanese ? "tests/japanese-placement/persistence.test.ts" : english ? "tests/english-placement/persistence.test.ts" : "tests/mirror/learning-language-migration.test.ts"]),
], {
  stdio: "inherit", env: { ...process.env, MIRROR_TEST_DATABASE_URL: connectionString },
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
