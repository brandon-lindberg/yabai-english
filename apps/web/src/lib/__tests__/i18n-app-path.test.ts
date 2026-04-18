import { describe, expect, it } from "vitest";
import { appPathForLocale } from "../i18n-app-path";

describe("appPathForLocale", () => {
  it("omits locale prefix for default locale (ja)", () => {
    expect(appPathForLocale("ja", "/book")).toBe("/book");
    const sp = new URLSearchParams({ specialty: "a" });
    expect(appPathForLocale("ja", "/book", sp)).toBe("/book?specialty=a");
  });

  it("adds /en prefix for English", () => {
    expect(appPathForLocale("en", "/book")).toBe("/en/book");
    const sp = new URLSearchParams({ language: "JP" });
    expect(appPathForLocale("en", "/book", sp)).toBe("/en/book?language=JP");
  });
});
