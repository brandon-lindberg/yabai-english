import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { parse } from "dotenv";
import { bankDigest } from "../src/lib/japanese-placement/bank";
import { loadJapaneseReleaseCandidate, loadReleasedJapaneseBank, renderJapaneseReleaseNotices } from "../src/lib/japanese-placement/release";

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => !["--publish", "--write-notices"].includes(arg))) throw new Error("Unknown argument; use no flags to check, --write-notices to regenerate credits, or --publish to activate locally");
  if (args.length > 1) throw new Error("Choose one operation");
  const directory = resolve("data/japanese-placement");
  if (args.includes("--write-notices")) {
    const bank = await loadJapaneseReleaseCandidate(directory);
    const notices = await renderJapaneseReleaseNotices(bank, directory);
    if (createHash("sha256").update(notices).digest("hex") !== bank.ownerRelease!.notices.sha256) throw new Error("Release notices hash mismatch; review the release manifest first");
    const path = join(resolve("public"), bank.ownerRelease!.notices.path);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, notices);
  }
  const bank = await loadReleasedJapaneseBank(directory, resolve("public"));
  const report = { ready: true, published: false, bankId: bank.id, bankVersion: bank.version, schemaVersion: bank.schemaVersion,
    bankDigest: bankDigest(bank), items: bank.items.length, authorization: bank.ownerRelease!.kind, noticesVerified: true };
  if (!args.includes("--publish")) { process.stdout.write(`${JSON.stringify(report, null, 2)}\n`); return; }

  // Reading credentials and opening a connection happen only after explicit publication and all offline checks.
  const connectionString = process.env.DATABASE_URL ?? parse(await readFile(".env")).DATABASE_URL;
  let target: URL;
  try { target = new URL(connectionString); } catch { throw new Error("Publication requires a local PostgreSQL DATABASE_URL"); }
  if (!["postgres:", "postgresql:"].includes(target.protocol) || !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname)) throw new Error("This publication command requires a local PostgreSQL database");
  const { PrismaClient } = await import("../src/generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { publishJapaneseBank } = await import("../src/lib/japanese-placement/service");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString, application_name: "japanese-placement-publish" }) });
  try {
    const snapshot = await publishJapaneseBank(db, bank);
    process.stdout.write(`${JSON.stringify({ ...report, published: true, snapshotId: snapshot.id, publishedAt: snapshot.publishedAt,
      target: { hostname: target.hostname, database: target.pathname.slice(1) } }, null, 2)}\n`);
  } finally { await db.$disconnect(); }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Japanese bank publication failed"}\n`);
  process.exitCode = 1;
});
