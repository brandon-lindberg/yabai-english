import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

function command(args: string[], databaseUrl = "") {
  return spawnSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "scripts/publish-japanese-placement.ts", ...args], {
    encoding: "utf8", timeout: 10_000, env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}

describe("explicit Japanese bank publisher", () => {
  it("checks the exact owner-authorized release and public notices without opening a database", () => {
    const result = command([]);
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ ready: true, published: false, bankVersion: 3, schemaVersion: 5, items: 470,
      bankDigest: "43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203", authorization: "owner_authorized_ai_assisted", noticesVerified: true });
  });
  it("refuses unknown flags before accessing credentials or a database", () => {
    const result = command(["--pubish"]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Unknown argument");
  });
  it("keeps this local release command from writing to remote databases", () => {
    const result = command(["--publish"], "postgresql://example:secret@remote.example/app");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("local PostgreSQL");
    expect(result.stderr).not.toContain("secret");
  });
});
