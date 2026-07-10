import { describe, expect, test } from "vitest";
import en from "../../../messages/en.json";
import ja from "../../../messages/ja.json";
import {
  calculateRefundProcessingFeeYen,
  calculateRefundSplit,
  resolvePlatformFeeKeepYen,
} from "@/lib/payment-refunds";

describe("teacher refund copy matches refund code", () => {
  test("platform retains the tier application fee, not an extra flat 10%", () => {
    expect(resolvePlatformFeeKeepYen(5000, 1000)).toBe(1000);
    expect(calculateRefundProcessingFeeYen(5000)).toBe(500);
    expect(resolvePlatformFeeKeepYen(5000, 1000)).not.toBe(
      calculateRefundProcessingFeeYen(5000),
    );
  });

  test("default student refund is full; pass-through caps the student deduction at 10%", () => {
    expect(
      calculateRefundSplit({
        amountYen: 5000,
        applicationFeeAmountYen: 1000,
        refundFeePassedToStudent: false,
        actor: "STUDENT",
      }),
    ).toEqual({ studentRefundYen: 5000, processingFeeYen: 500 });

    expect(
      calculateRefundSplit({
        amountYen: 5000,
        applicationFeeAmountYen: 1000,
        refundFeePassedToStudent: true,
        actor: "STUDENT",
      }),
    ).toEqual({ studentRefundYen: 4500, processingFeeYen: 500 });
  });

  test("english teacher settings copy does not claim a separate platform-kept 10% fee", () => {
    const { marketplaceEconomics, refundFeeIntro, refundFeeTeacherCoversHelp } =
      en.dashboard.settingsPage;

    expect(refundFeeIntro).not.toMatch(/keeps a flat 10%/i);
    expect(marketplaceEconomics.refundTeacherDefault).not.toMatch(/separate 10%/i);
    expect(refundFeeTeacherCoversHelp).not.toMatch(/cover the 10% processing fee/i);
    expect(marketplaceEconomics.refundPlatformFee).toMatch(/tier-based platform fee/i);
    expect(marketplaceEconomics.refundPassThrough).toMatch(/up to a flat 10%|up to 10%/i);
  });

  test("japanese teacher settings copy does not claim a separate platform-kept 10% fee", () => {
    const { marketplaceEconomics, refundFeeIntro } = ja.dashboard.settingsPage;

    expect(refundFeeIntro).not.toMatch(/一律10%の返金処理手数料を保持/);
    expect(marketplaceEconomics.refundTeacherDefault).not.toMatch(/別途10%/);
  });
});
