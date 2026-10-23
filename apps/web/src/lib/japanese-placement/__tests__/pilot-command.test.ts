import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadContentCatalog } from "../content-files";
import { buildContentBank } from "../content-pack";
import { pilotFormsDigest } from "../pilot";

const command = (...args: string[]) => spawnSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "scripts/japanese-placement-pilot.ts", ...args],
  { encoding: "utf8", timeout: 10000, maxBuffer: 16 * 1024 * 1024 });

describe("database-free Japanese pilot command", () => {
  it("exports versioned forms, a learner-safe form and empty-evidence diagnostics without changing the bank", async () => {
    const result = command("forms");
    expect(result.status, result.stderr).toBe(0);
    const forms = JSON.parse(result.stdout);
    expect(forms.forms.flatMap((form: { items: unknown[] }) => form.items)).toHaveLength(470);
    const directory = await mkdtemp(join(tmpdir(), "japanese-pilot-test-"));
    try {
      const formsFile = join(directory, "forms.json"), dataFile = join(directory, "data.json");
      await writeFile(formsFile, JSON.stringify(forms));
      const projected = command("form", "--forms", formsFile, "--id", forms.forms[0].id);
      expect(projected.status, projected.stderr).toBe(0);
      expect(JSON.parse(projected.stdout)).toMatchObject({ awardsLevel: false, formId: forms.forms[0].id });
      expect(projected.stdout).not.toMatch(/"(correctChoiceId|acceptedOrders|sourceIds|explanation)":/);
      const bank = buildContentBank((await loadContentCatalog("data/japanese-placement")).pack);
      await writeFile(dataFile, JSON.stringify({ schemaVersion: 1, kind: "japanese-pilot-observations", studyId: "00000000-0000-4000-8000-000000000001",
        protocolDigest: "a".repeat(64), formsDigest: pilotFormsDigest(bank, forms), participants: [] }));
      const diagnosed = command("diagnose", "--forms", formsFile, "--data", dataFile);
      expect(diagnosed.status, diagnosed.stderr).toBe(0);
      expect(JSON.parse(diagnosed.stdout)).toMatchObject({ status: "descriptive_only", participants: 0, fittedModel: null, publicationReady: false });
      await writeFile(dataFile, JSON.stringify({ participants: [], email: "not-allowed@example.test" }));
      const invalid = command("diagnose", "--forms", formsFile, "--data", dataFile);
      expect(invalid.status).toBe(1);
      expect(invalid.stdout).toBe("");
      expect(invalid.stderr).not.toContain("not-allowed@example.test");
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  it.each([[], ["publish"], ["forms", "--data", "missing.json"], ["form", "--forms", "missing.json"],
    ["diagnose", "--forms", "missing.json"], ["forms", "--strcit"], ["form", "--id", "form-001", "--id", "form-002", "--forms", "missing.json"]].map((args) => ({ args })))("refuses incomplete, unknown or repeated arguments: $args", ({ args }) => {
    const result = command(...args);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toMatch(/usage|argument|requires|duplicate/i);
  });
});
