import { describe, expect, test } from "vitest";
import { isGuideLocale, loadGuideMarkdown } from "@/lib/guides/load-guide-markdown";

describe("loadGuideMarkdown", () => {
  test.each(["en", "ja"] as const)("the %s guide exists and has content", async (locale) => {
    const markdown = await loadGuideMarkdown("stripe-onboarding", locale);
    expect(markdown.length).toBeGreaterThan(500);
    expect(markdown.startsWith("#")).toBe(true);
  });

  // The guide renders through the same CommonMark pipeline as the legal docs,
  // which has no GFM table support — a pipe table would show up as raw text on
  // the page. Caught in review once; kept as a guard.
  test.each(["en", "ja"] as const)("the %s guide uses no pipe tables", async (locale) => {
    const markdown = await loadGuideMarkdown("stripe-onboarding", locale);
    const tableRows = markdown.split("\n").filter((line) => line.trim().startsWith("|"));
    expect(tableRows).toEqual([]);
  });

  // The login-security answer is the one thing in here that teachers cannot
  // work out for themselves, because it describes how this platform
  // authenticates. If the answer drifts from the code, the guide is worse than
  // useless — it is wrong on a legal declaration.
  test.each(["en", "ja"] as const)(
    "the %s guide still documents the Google-OAuth login answer",
    async (locale) => {
      const markdown = await loadGuideMarkdown("stripe-onboarding", locale);
      expect(markdown).toContain("Google OAuth");
      expect(markdown).toContain("OpenID Connect");
    },
  );

  test("rejects an unknown locale", () => {
    expect(isGuideLocale("en")).toBe(true);
    expect(isGuideLocale("ja")).toBe(true);
    expect(isGuideLocale("fr")).toBe(false);
  });
});
