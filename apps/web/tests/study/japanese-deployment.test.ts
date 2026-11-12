import { spawnSync } from "node:child_process";
import { expect, test } from "vitest";

const snapshot = "ja-study:d9a72223da0534a2bbec995f8e26a508f1dd678c3c39f9d958607484207457b2";
const digest = "fc8b021f80054501c56a1b3631ed411d1572cee350d26307dd5f13b1e22d93c8";
const target = ["--expected-host", "production.example", "--expected-database", "english_platform"];
const pins = ["--expected-study-snapshot", snapshot, "--expected-cards-sha256", digest];

function command(args: string[], connection = "") {
  return spawnSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "scripts/deploy-japanese-content.ts", ...args], {
    encoding: "utf8", timeout: 15_000,
    env: { ...process.env, JAPANESE_RELEASE_DATABASE_URL: connection, DATABASE_URL: "postgresql://unused:secret@ignored.example/ignored" },
  });
}

test("the deployment command validates the approved local artifacts without a database", () => {
  const result = command([], "postgresql://unused:secret@unreachable.example/app");
  expect(result.status, result.stderr).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({ mode: "verify", ready: true,
    placement: { version: 3, items: 470, digest: "43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203" },
    study: { cards: 10291, expectedSnapshotId: snapshot, expectedCardsSha256: digest },
  });
  expect(result.stdout + result.stderr).not.toContain("secret");
});

test.each([
  ["--publish"], ["--inspect"], ["--inspect", "--publish"],
  [...target], ["--publish", ...target],
  ["--publish", ...target, "--expected-study-snapshot", snapshot],
  ["--publish", ...target, "--expected-cards-sha256", digest],
  ["--inspect", ...target, ...pins], ["--force"],
])("refuses incomplete or ambiguous deployment arguments %j", (...args) => {
  const result = command(args);
  expect(result.status).toBe(1);
  expect(result.stderr).toMatch(/Choose|Explicit|expectedSnapshotId|expectedCardsSha256|Unknown/i);
});

test("explicit database operations require the dedicated release connection", () => {
  const result = command(["--inspect", ...target]);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("JAPANESE_RELEASE_DATABASE_URL");
  expect(result.stderr).not.toContain("secret");
});

test.each([
  "postgresql://user:private-password@wrong.example/english_platform",
  "postgresql://user:private-password@production.example/wrong_database",
  "postgresql://user:private-password@production.example/english_platform?schema=other",
  "https://user:private-password@production.example/english_platform",
  "private-password",
])("refuses an unintended database target without revealing its credentials", connection => {
  const result = command(["--inspect", ...target], connection);
  expect(result.status).toBe(1);
  expect(result.stderr).toMatch(/database target/);
  expect(result.stdout + result.stderr).not.toContain("private-password");
});

test("wrong content pins fail before opening the target database", () => {
  const result = command(["--publish", ...target, "--expected-study-snapshot", snapshot, "--expected-cards-sha256", "0".repeat(64)],
    "postgresql://user:private-password@production.example/english_platform");
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("Publication content pins differ");
  expect(result.stderr).not.toContain("private-password");
});
