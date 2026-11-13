import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { mkdir, mkdtemp, readFile, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { japaneseStudyFixture } from "../../test/japanese-study-fixture";
import { nodeCommandTestTimeout, runServerScript } from "../../test/node-command";
import { serializeJapaneseFlashcards } from "@/lib/japanese-content/flashcard-catalog";
import { serializeJapaneseStudyCatalog } from "@/lib/japanese-content/study-catalog";
import { sha256 } from "@/lib/japanese-content/digest";
import { japaneseStudyPublicationGuard, prepareJapaneseStudyImport } from "@/lib/study/japanese-import";

const fixture = japaneseStudyFixture();
const study = fixture.build();
const publication = japaneseStudyPublicationGuard(prepareJapaneseStudyImport(fixture.source, study));
const target = ["--expected-host", "production.example", "--expected-database", "english_platform"];
const pins = ["--expected-study-snapshot", publication.expectedSnapshotId, "--expected-cards-sha256", publication.expectedCardsSha256];
const artifacts = { "flashcards-v4.json": serializeJapaneseFlashcards(fixture.source), "study-v1.json": serializeJapaneseStudyCatalog(study) };
const script = resolve("scripts/deploy-japanese-content.ts");
let directory: string;

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "japanese-deployment-test-"));
  await mkdir(join(directory, ".cache/japanese-content"), { recursive: true });
  await mkdir(join(directory, "data/japanese-content/reports"), { recursive: true });
  // Share tracked release inputs and dependencies, never the operator's cache.
  for (const file of ["node_modules", "public", "src", "data/japanese-placement", "tsconfig.json"]) {
    await symlink(resolve(file), join(directory, file), file.endsWith(".json") ? "file" : "dir");
  }
  for (const [name, bytes] of Object.entries(artifacts)) {
    await writeFile(join(directory, ".cache/japanese-content", name), bytes);
    await writeFile(join(directory, "data/japanese-content/reports", name === "flashcards-v4.json" ? "flashcards.json" : "study.json"), JSON.stringify({ catalogSha256: sha256(bytes) }));
  }
});

afterAll(async () => { if (directory) await rm(directory, { recursive: true, force: true }); });

const command = (args: string[], connection = "") => runServerScript(script, args, {
  cwd: directory,
  env: { ...process.env, JAPANESE_RELEASE_DATABASE_URL: connection, DATABASE_URL: "postgresql://unused:secret@ignored.example/ignored" },
});

describe("Japanese deployment CLI with isolated, hash-pinned artifacts", { timeout: nodeCommandTestTimeout() }, () => {
  test("validates fixture artifacts without opening a database", async () => {
    const result = await command([], "postgresql://unused:secret@unreachable.example/app");
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ mode: "verify", ready: true,
      placement: { version: 3, items: 470, digest: "43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203" },
      study: { cards: 2, ...publication },
    });
    expect(result.stdout + result.stderr).not.toContain("secret");
  });

  test.each([
    ["--publish"], ["--inspect"], ["--inspect", "--publish"],
    [...target], ["--publish", ...target],
    ["--publish", ...target, "--expected-study-snapshot", publication.expectedSnapshotId],
    ["--publish", ...target, "--expected-cards-sha256", publication.expectedCardsSha256],
    ["--inspect", ...target, ...pins], ["--force"],
  ])("refuses incomplete or ambiguous deployment arguments %j", async (...args) => {
    const result = await command(args);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Choose|Explicit|expectedSnapshotId|expectedCardsSha256|Unknown/i);
  });

  test("explicit database operations require the dedicated release connection", async () => {
    const result = await command(["--inspect", ...target]);
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
  ])("refuses an unintended database target without revealing its credentials", async connection => {
    const result = await command(["--inspect", ...target], connection);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/database target/);
    expect(result.stdout + result.stderr).not.toContain("private-password");
  });

  test("wrong content pins fail before opening the target database", async () => {
    const result = await command(["--publish", ...target, "--expected-study-snapshot", publication.expectedSnapshotId, "--expected-cards-sha256", "0".repeat(64)],
      "postgresql://user:private-password@production.example/english_platform");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Publication content pins differ");
    expect(result.stderr).not.toContain("private-password");
  });

  test.each([
    ["missing", "flashcards-v4.json"], ["missing", "study-v1.json"],
    ["modified", "flashcards-v4.json"], ["modified", "study-v1.json"],
  ] as const)("refuses %s artifact %s before database access", async (mode, name) => {
    const file = join(directory, ".cache/japanese-content", name);
    const original = await readFile(file, "utf8");
    try {
      if (mode === "missing") await unlink(file);
      else await writeFile(file, `${original} `);
      const result = await command(["--publish", ...target, ...pins], "postgresql://user:private-password@production.example/english_platform");
      expect(result.status).toBe(1);
      expect(result.stdout).toBe("");
      expect(result.stderr).toMatch(mode === "missing" ? /ENOENT/ : /artifacts differ from tracked summaries/);
      expect(result.stderr).not.toContain("private-password");
    } finally { await writeFile(file, original); }
  });
});
