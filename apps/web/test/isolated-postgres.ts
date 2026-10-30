import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { Client } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/** Explicit opt-in only. All writes and connections belong to one disposable schema. */
export async function withIsolatedPostgres(
  migration: string,
  verify: (context: { client: Client; db: PrismaClient; applyMigration: () => Promise<void>; verifyDatamodel: () => Promise<void> }) => Promise<void>,
) {
  const connectionString = process.env.MIRROR_TEST_DATABASE_URL;
  if (!connectionString || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(connectionString).hostname)) {
    throw new Error("Database verification requires a local PostgreSQL database.");
  }
  const migrations = path.resolve("prisma/migrations");
  const sql = await readFile(path.join(migrations, migration, "migration.sql"), "utf8");
  const schema = `mirror_test_${randomUUID().replaceAll("-", "")}`;
  const client = new Client({ connectionString, application_name: schema });
  let db: PrismaClient | undefined;
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    for (const name of (await readdir(migrations)).sort().filter((name) => name < migration && name !== "migration_lock.toml")) {
      const prior = await readFile(path.join(migrations, name, "migration.sql"), "utf8");
      await client.query(prior.replace('CREATE SCHEMA IF NOT EXISTS "public";', ""));
    }
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString, application_name: schema }, { schema }) });
    let applied = false;
    // Every current-client operation needs the target plus subsequent migrations,
    // even when a historical upgrade test does not request a datamodel diff.
    const applyMigration = async () => {
      if (applied) return;
      await client.query(sql);
      for (const name of (await readdir(migrations)).sort().filter(name => name > migration && name !== "migration_lock.toml")) await client.query(await readFile(path.join(migrations, name, "migration.sql"), "utf8"));
      applied = true;
    };
    await verify({ client, db, applyMigration, verifyDatamodel: async () => {
      await applyMigration();
      const testUrl = new URL(connectionString);
      testUrl.searchParams.set("schema", schema);
      const diff = spawnSync("./node_modules/.bin/prisma", ["migrate", "diff", "--from-config-datasource", "--to-schema", "prisma/schema.prisma", "--exit-code"], {
        encoding: "utf8", timeout: 10_000, env: { ...process.env, DATABASE_URL: testUrl.toString() },
      });
      if (diff.error) throw diff.error;
      if (diff.status !== 0) throw new Error(`Migrated schema differs from Prisma: ${diff.stdout}\n${diff.stderr}`);
    } });
  } finally {
    try {
      await db?.$disconnect();
      if ((await client.query("SELECT 1 FROM pg_stat_activity WHERE application_name = $1 AND pid <> pg_backend_pid()", [schema])).rowCount) {
        throw new Error("Test database connections did not close");
      }
    } finally {
      try {
        await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        if ((await client.query("SELECT 1 FROM pg_namespace WHERE nspname = $1", [schema])).rowCount) throw new Error("Test schema was not removed");
      } finally { await client.end(); }
    }
  }
}
