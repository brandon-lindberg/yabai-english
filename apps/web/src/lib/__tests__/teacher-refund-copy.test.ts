import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import en from "../../../messages/en.json";
import ja from "../../../messages/ja.json";

/**
 * Refunds are a full unwind: the student is returned the whole lesson price and
 * the platform returns its entire application fee. Nothing is retained and
 * nothing is deducted, so no surface may describe a share, a split, or a
 * teacher-configurable deduction. This guards every place that says so — the
 * settings UI, the payment notices, and the legal documents in both locales.
 */

const LEGAL_DIR = path.join(process.cwd(), "src", "content", "legal");

function legalDoc(name: string): string {
  return readFileSync(path.join(LEGAL_DIR, `${name}.md`), "utf8");
}

const PASS_THROUGH_EN =
  /pass[- ]through|pass the .{0,30}fee|may deduct|deduct up to|90%|refund processing fee|retains the (tier|platform)/i;
const PASS_THROUGH_JA = /返金処理手数料|費用転嫁|差し引くことができます|控除|90%|プラットフォーム手数料を保持/;

describe("refund copy matches the full-unwind refund code", () => {
  test("the teacher refund-fee toggle strings are gone from both locales", () => {
    for (const messages of [en, ja]) {
      const settings = messages.dashboard.settingsPage as Record<string, unknown>;
      for (const key of Object.keys(settings)) {
        expect(key).not.toMatch(/^refundFee/);
      }
    }
  });

  test("english surfaces never describe a deduction or a retained platform fee", () => {
    const { marketplaceEconomics } = en.dashboard.settingsPage;
    const surfaces = [
      ...Object.values(marketplaceEconomics),
      en.paymentPolicy.student.refunds,
      en.paymentPolicy.teacher.refunds,
      en.booking.acceptCheckoutTermsSuffix,
    ];

    for (const copy of surfaces) {
      expect(typeof copy).toBe("string");
      expect(copy as string).not.toMatch(PASS_THROUGH_EN);
    }
  });

  test("japanese surfaces never describe a deduction or a retained platform fee", () => {
    const { marketplaceEconomics } = ja.dashboard.settingsPage;
    const surfaces = [
      ...Object.values(marketplaceEconomics),
      ja.paymentPolicy.student.refunds,
      ja.paymentPolicy.teacher.refunds,
    ];

    for (const copy of surfaces) {
      expect(typeof copy).toBe("string");
      expect(copy as string).not.toMatch(PASS_THROUGH_JA);
    }
  });

  test("teacher settings state that the platform returns its fee in full", () => {
    expect(en.dashboard.settingsPage.marketplaceEconomics.refundPlatformFee).toMatch(
      /returns? .{0,40}(platform|application) fee|retains? nothing/i,
    );
    expect(en.dashboard.settingsPage.marketplaceEconomics.refundFullAmount).toMatch(
      /full (lesson price|refund)/i,
    );
  });

  test("the refund policies promise a full refund and claim nothing for the platform", () => {
    for (const doc of ["refund-students-en", "refund-teachers-en"]) {
      const body = legalDoc(doc);
      expect(body).toMatch(/full refund|100% of the lesson price/i);
      expect(body).not.toMatch(PASS_THROUGH_EN);
    }

    for (const doc of ["refund-students-ja", "refund-teachers-ja"]) {
      expect(legalDoc(doc)).not.toMatch(PASS_THROUGH_JA);
    }
  });

  test("no legal document still describes the tier fee as retained on refund", () => {
    for (const doc of [
      "terms-teachers-en",
      "terms-students-en",
      "terms-teachers-ja",
      "terms-students-ja",
    ]) {
      const body = legalDoc(doc);
      expect(body).not.toMatch(/refund processing fee|返金処理手数料/i);
    }
  });
});
