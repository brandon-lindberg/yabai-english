import { expect, test } from "vitest";
import { lessonProductNames, withBookingLessonProductNames } from "../lesson-product-catalog";
import { conversationProduct, lessonSubjectCases } from "../../../test/lesson-subject-fixture";
test.each(lessonSubjectCases)("the $learningLanguage read projection preserves shared identities, amounts and the original catalog", ({ learningLanguage, nameEn, nameJa }) => {
  const booking = { id: "booking", learningLanguage, quotedPriceYen: 5000, meetUrl: "https://meet.google.com/existing", lessonProduct: conversationProduct };
  const projected = withBookingLessonProductNames(booking);
  expect(projected).toEqual({ ...booking, lessonProduct: { ...conversationProduct, nameEn, nameJa } });
  expect(conversationProduct.nameJa).toBe("英会話");
  expect(projected.lessonProduct).not.toBe(conversationProduct);
});
test("Japanese conversation never inherits the English Eikaiwa label", () => {
  const product = { tier: "EIKAWA" as const, durationMin: 60, nameEn: "Conversation (Eikawa)", nameJa: "英会話" };
  expect(lessonProductNames(product, "JAPANESE")).toEqual({ nameEn: "Japanese conversation — 60 min", nameJa: "日本語会話（60分）" });
  expect(lessonProductNames(product, "ENGLISH")).toEqual({ nameEn: product.nameEn, nameJa: product.nameJa });
});
