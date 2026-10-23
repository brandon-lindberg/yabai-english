import { describe, expect, it } from "vitest";
import { bankDigest, inspectBankReadiness, parseJapaneseBank } from "../bank";
import { loadJapaneseRubricBank } from "../rubric-content";
import { approvedBank } from "./fixtures";

async function ownerReleasedBank() {
  const bank = await loadJapaneseRubricBank("data/japanese-placement");
  return { ...bank, ownerRelease: {
    kind: "owner_authorized_ai_assisted" as const, authorizedBy: "Test release owner", authorizedOn: "2026-10-23",
    authorization: "Synthetic release authorization for contract tests only.", bankDigest: bankDigest(bank),
    checks: { content: "AI-assisted editorial evidence", rights: "Pinned licence and credit evidence", policy: "Rubric mechanics evidence" },
    notices: { path: "/japanese-placement/v3/NOTICE.txt", sha256: "a".repeat(64) },
  } };
}

describe("explicit owner-authorized Japanese rubric release", () => {
  it("accepts the exact authorized rubric without manufacturing teacher signoffs or changing its content hash", async () => {
    const bank = await ownerReleasedBank();
    expect(inspectBankReadiness(bank)).toEqual({ ready: true, issues: [] });
    expect(parseJapaneseBank(bank).reviews).toEqual({ japaneseTeacher: null, rights: null, placement: null });
    expect(bankDigest(bank)).toBe(bank.ownerRelease.bankDigest);
    expect(bankDigest(bank)).toBe("43832badc0f39b039b2d0ffda31481f99774bd6f9035b5b42e65195bb8b9d203");
  });

  it("invalidates release authorization when content, source terms or the approved hash change", async () => {
    for (const change of ["content", "rights", "digest"]) {
      const bank = await ownerReleasedBank();
      if (change === "content") bank.items[0].explanation.en += " Changed.";
      if (change === "rights") bank.sources[0].license = "Changed terms";
      if (change === "digest") bank.ownerRelease.bankDigest = "0".repeat(64);
      expect(inspectBankReadiness(bank).issues).toContain("owner-release-stale");
    }
  });

  it("does not let owner authorization waive structural, policy or anchor-capacity checks", async () => {
    const bank = await ownerReleasedBank();
    for (const item of bank.items) if (item.domain === "reading" && item.referenceBand === "N1") item.placementRole = "support";
    bank.ownerRelease.bankDigest = bankDigest(bank);
    expect(inspectBankReadiness(bank).issues).toContain("insufficient-anchors:reading:N1");
    expect(() => parseJapaneseBank({ ...bank, assessment: { ...bank.assessment, minimumAnswers: 1 } })).toThrow();
  });

  it("requires all evidence fields and restricts owner releases to v5", async () => {
    const bank = await ownerReleasedBank();
    expect(() => parseJapaneseBank({ ...bank, ownerRelease: { ...bank.ownerRelease, checks: { content: "Only content" } } })).toThrow();
    expect(() => parseJapaneseBank({ ...bank, ownerRelease: { ...bank.ownerRelease, notices: { path: "/../private.json", sha256: "a".repeat(64) } } })).toThrow();
    expect(() => parseJapaneseBank({ ...approvedBank(), ownerRelease: bank.ownerRelease })).toThrow();
  });
});
