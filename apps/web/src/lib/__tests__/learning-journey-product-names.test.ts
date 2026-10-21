import { expect, test } from "vitest";
import { lessonProductNames } from "../lesson-product-catalog";
test("Japanese conversation never inherits the English Eikaiwa label", () => {
  const product = { tier: "EIKAWA" as const, durationMin: 60, nameEn: "Conversation (Eikawa)", nameJa: "英会話" };
  expect(lessonProductNames(product, "JAPANESE")).toEqual({ nameEn: "Japanese conversation — 60 min", nameJa: "日本語会話（60分）" });
  expect(lessonProductNames(product, "ENGLISH")).toEqual({ nameEn: product.nameEn, nameJa: product.nameJa });
});
