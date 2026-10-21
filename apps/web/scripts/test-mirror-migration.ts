import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { parse } from "dotenv";

// Read credentials only for this explicit opt-in test. Do not load the normal
// Vitest global setup, which seeds application placement tables.
const connectionString = process.env.MIRROR_TEST_DATABASE_URL ?? parse(readFileSync(".env")).DATABASE_URL;
if (!connectionString || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(connectionString).hostname)) {
  throw new Error("Set MIRROR_TEST_DATABASE_URL to a local PostgreSQL database. Verification uses an isolated temporary schema.");
}
const result = spawnSync("./node_modules/.bin/vitest", ["run", "--config", "vitest.mirror.config.ts", "tests/mirror/learning-language-migration.test.ts"], {
  stdio: "inherit", env: { ...process.env, MIRROR_TEST_DATABASE_URL: connectionString },
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
