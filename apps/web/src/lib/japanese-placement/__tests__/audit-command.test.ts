import { describe, expect, it } from "vitest";
import { nodeCommandTestTimeout, runServerScript } from "../../../../test/node-command";

const command = (args: string[], script = "audit-japanese-placement.ts") => runServerScript(`scripts/${script}`, args);

describe("database-free Japanese assessment audit command", { timeout: nodeCommandTestTimeout(2) }, () => {
  it("audits a source-aligned rubric without making an empirical pilot a publication requirement", async () => {
    const result = await command(["--rubric", "--json"]);
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ schemaVersion: 5, bankVersion: 3, items: 470, independentReadingPassages: 100,
      basis: "jlpt_aligned_rules", anchors: 50, issues: ["japanese-teacher-review-required", "rights-review-required", "placement-review-required"] });
    const strict = await command(["--rubric", "--strict", "--json"]);
    expect(strict.status).toBe(1);
    expect(JSON.parse(strict.stdout).issues).not.toContain("assessment-calibration-required");
  });
  it("reports the text-only review work without publishing or loading credentials", async () => {
    const result = await command(["--json"]);
    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report).toMatchObject({ bankId: "japanese-content-catalog", schemaVersion: 4, items: 470, independentReadingPassages: 100, ready: false, domains: { reading: 200, writing: 100 } });
    expect(report).not.toHaveProperty("assetsVerified");
    expect(report.domains).not.toHaveProperty("listening");
    expect(report.issues).toEqual(["japanese-teacher-review-required", "rights-review-required", "placement-review-required", "assessment-calibration-required"]);
    expect(report.bankDigest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("fails the publication check while content is unreviewed", async () => {
    const result = await command(["--strict", "--json"]);
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout).ready).toBe(false);
  });

  it("can still audit the original twelve format samples explicitly", async () => {
    const result = await command(["--samples", "--json"]);
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ bankId: "japanese-review-samples", schemaVersion: 3, items: 12, ready: false });
  });

  it("refuses unknown arguments rather than ignoring a misspelled strict flag", async () => {
    const result = await command(["--strcit"]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Unknown argument");
  });
});

describe("offline Japanese content import command", { timeout: nodeCommandTestTimeout(2) }, () => {
  it("exports the rubric policy and aligned roles from the same catalog without invented likelihoods or approvals", async () => {
    const result = await command(["--rubric-bank"], "audit-japanese-placement-content.ts");
    expect(result.status, result.stderr).toBe(0);
    const bank = JSON.parse(result.stdout);
    expect(bank).toMatchObject({ schemaVersion: 5, version: 3, assessment: { revision: "japanese-jlpt-rubric-v1" }, reviews: { japaneseTeacher: null, rights: null, placement: null } });
    expect(bank.items.every((item: { calibration: unknown }) => item.calibration === null)).toBe(true);
    expect((await command(["--bank", "--rubric-bank"], "audit-japanese-placement-content.ts")).status).toBe(1);
  });
  it("distinguishes six-domain draft coverage from publication readiness", async () => {
    const result = await command(["--strict", "--json"], "audit-japanese-placement-content.ts");
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ status: "draft", coverageScope: "six_domain_authoring", complete: true, items: 470, publicationReady: false, sourceExcerpts: 333 });
  });

  it("exports private keyed items without manufacturing a published bank or calibration", async () => {
    const result = await command(["--items"], "audit-japanese-placement-content.ts");
    expect(result.status, result.stderr).toBe(0);
    const exported = JSON.parse(result.stdout);
    expect(exported.items).toHaveLength(470);
    expect(exported.sources).toHaveLength(9);
    expect(exported).not.toHaveProperty("reviews");
    expect(exported).not.toHaveProperty("assessment");
    expect(exported.items.every((item: { calibration: unknown }) => item.calibration === null)).toBe(true);
  });

  it("exports the full unapproved bank and reports its grouping without assigning release inputs", async () => {
    const result = await command(["--bank"], "audit-japanese-placement-content.ts");
    expect(result.status, result.stderr).toBe(0);
    const bank = JSON.parse(result.stdout);
    expect(bank).toMatchObject({ schemaVersion: 4, assessment: null, reviews: { japaneseTeacher: null, rights: null, placement: null } });
    expect(bank.items).toHaveLength(470);
    expect(bank.sequence).toHaveLength(470);
    expect(bank.items.every((item: { calibration: unknown }) => item.calibration === null)).toBe(true);
    const incompatible = await command(["--items", "--bank"], "audit-japanese-placement-content.ts");
    expect(incompatible.status).toBe(1);
    expect(incompatible.stderr).toMatch(/one export/i);
  });
});
