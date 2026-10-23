import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const command = (args: string[], script = "audit-japanese-placement.ts") => spawnSync(process.execPath, [
  "--conditions=react-server", "--import", "tsx", `scripts/${script}`, ...args,
], { encoding: "utf8", timeout: 10_000 });

describe("database-free Japanese assessment audit command", () => {
  it("reports the text-only review work without publishing or loading credentials", () => {
    const result = command(["--json"]);
    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report).toMatchObject({ bankId: "japanese-review-samples", items: 12, ready: false, domains: { writing: 2 } });
    expect(report).not.toHaveProperty("assetsVerified");
    expect(report.domains).not.toHaveProperty("listening");
    expect(report.issues).toEqual(["japanese-teacher-review-required", "rights-review-required", "placement-review-required", "assessment-calibration-required"]);
    expect(report.bankDigest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("fails the publication check while content is unreviewed", () => {
    const result = command(["--strict", "--json"]);
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout).ready).toBe(false);
  });

  it("refuses unknown arguments rather than ignoring a misspelled strict flag", () => {
    const result = command(["--strcit"]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Unknown argument");
  });
});

describe("offline Japanese content import command", () => {
  it("distinguishes six-domain draft coverage from publication readiness", () => {
    const result = command(["--strict", "--json"], "audit-japanese-placement-content.ts");
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ status: "draft", coverageScope: "six_domain_authoring", complete: true, items: 470, publicationReady: false, sourceExcerpts: 333 });
  });

  it("exports private keyed items without manufacturing a published bank or calibration", () => {
    const result = command(["--items"], "audit-japanese-placement-content.ts");
    expect(result.status, result.stderr).toBe(0);
    const exported = JSON.parse(result.stdout);
    expect(exported.items).toHaveLength(470);
    expect(exported.sources).toHaveLength(9);
    expect(exported).not.toHaveProperty("reviews");
    expect(exported).not.toHaveProperty("assessment");
    expect(exported.items.every((item: { calibration: unknown }) => item.calibration === null)).toBe(true);
  });
});
