import { describe, expect, test } from "vitest";
import en from "../../../../messages/en.json";
import ja from "../../../../messages/ja.json";

describe("site footer copy", () => {
  test("English copyright uses year placeholder and brand", () => {
    expect(en.common.footerCopyright).toContain("{year}");
    expect(en.common.footerCopyright).toContain("English Studio Japan");
  });

  test("Japanese copyright uses year placeholder", () => {
    expect(ja.common.footerCopyright).toContain("{year}");
  });

  test("operator line names Yabai Studios in both locales", () => {
    // Stripe requires the website to visibly match the registered business
    // name (Yabai Studios), which operates English Studio Japan.
    expect(en.common.footerOperatedBy).toContain("Yabai Studios");
    expect(en.common.footerOperatedBy).toContain("English Studio Japan");
    expect(ja.common.footerOperatedBy).toContain("Yabai Studios");
  });

  test("legal footer link labels exist", () => {
    expect(en.legal.footerTermsLink).toBeTruthy();
    expect(en.legal.footerPrivacyLink).toBeTruthy();
    expect(ja.legal.footerTermsLink).toBeTruthy();
    expect(ja.legal.footerPrivacyLink).toBeTruthy();
  });
});
