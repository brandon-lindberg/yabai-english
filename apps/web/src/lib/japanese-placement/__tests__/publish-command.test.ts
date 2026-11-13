import { describe, expect, it } from "vitest";
import { nodeCommandTestTimeout, runServerScript } from "../../../../test/node-command";

function command(args: string[], databaseUrl = "") {
  return runServerScript("scripts/publish-japanese-placement.ts", args, {
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}

describe("explicit Japanese bank publisher", { timeout: nodeCommandTestTimeout() }, () => {
  it("checks the exact owner-authorized release and public notices without opening a database", async () => {
    const result = await command([]);
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ ready: true, published: false, bankVersion: 3, schemaVersion: 5, items: 470,
      bankDigest: "43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203", authorization: "owner_authorized_ai_assisted", noticesVerified: true });
  });
  it("refuses unknown flags before accessing credentials or a database", async () => {
    const result = await command(["--pubish"]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Unknown argument");
  });
  it("keeps this local release command from writing to remote databases", async () => {
    const result = await command(["--publish"], "postgresql://example:secret@remote.example/app");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("local PostgreSQL");
    expect(result.stderr).not.toContain("secret");
  });
});
