import { describe, expect, test } from "vitest";
import en from "../../../../messages/en.json";
import ja from "../../../../messages/ja.json";

describe("home landing hero primary CTA (guest)", () => {
  test("English label is generic, not Google-branded", () => {
    expect(en.home.ctaSignIn).toBe("Sign up or sign in");
  });

  test("Japanese label is generic, not Google-branded", () => {
    expect(ja.home.ctaSignIn).toBe("新規登録・ログイン");
  });
});
