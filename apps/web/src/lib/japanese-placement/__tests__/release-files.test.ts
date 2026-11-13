import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { bankDigest, inspectBankReadiness } from "../bank";
import { loadReleasedJapaneseBank, renderJapaneseReleaseNotices } from "../release";

describe("Japanese publication artifacts", () => {
  it("loads the real release with complete public credits, original licence notices and no answer keys", async () => {
    const bank = await loadReleasedJapaneseBank("data/japanese-placement", "public");
    expect(inspectBankReadiness(bank)).toEqual({ ready: true, issues: [] });
    expect(bank.ownerRelease!.bankDigest).toBe(bankDigest(bank));
    expect(bank.reviews.japaneseTeacher).toBeNull();
    const notice = await renderJapaneseReleaseNotices(bank, "data/japanese-placement");
    for (const source of bank.sources) expect(notice).toContain(source.attribution);
    for (const licence of ["kotonoha-MIT.txt", "nihongo-mono-MIT.txt", "yomitaku-MIT.txt"]) {
      expect(notice).toContain((await readFile(join("data/japanese-placement/licences", licence), "utf8")).trim());
    }
    expect(notice).toContain("2026-10-19");
    expect(notice).toContain("https://www.edrdg.org/edrdg/licence.html");
    expect(notice).not.toMatch(/correctChoiceId|acceptedOrders|permissionEvidence|ownerRelease/);
    expect(notice).toBe(await readFile(join("public", bank.ownerRelease!.notices.path), "utf8"));
  });

  it("rejects missing or modified public attribution instead of publishing without notices", async () => {
    const directory = await mkdtemp(join(tmpdir(), "japanese-release-notices-"));
    try {
      await expect(loadReleasedJapaneseBank("data/japanese-placement", directory)).rejects.toThrow();
      await mkdir(join(directory, "japanese-placement/v3"), { recursive: true });
      await writeFile(join(directory, "japanese-placement/v3/NOTICE.txt"), "Changed credits\n");
      await expect(loadReleasedJapaneseBank("data/japanese-placement", directory)).rejects.toThrow(/notices/i);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});
