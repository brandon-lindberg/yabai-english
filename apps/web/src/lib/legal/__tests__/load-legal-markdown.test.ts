import { describe, expect, test } from "vitest";
import { isLegalLocale, loadLegalMarkdown } from "@/lib/legal/load-legal-markdown";

describe("loadLegalMarkdown", () => {
  test("loads English terms and privacy", async () => {
    const terms = await loadLegalMarkdown("terms", "en");
    expect(terms).toContain("English Studio Japan");
    expect(terms).toContain("Limitation of liability");
    expect(terms).toContain("teacher is responsible for the full refund amount");
    expect(terms).toContain("20% for lessons 1-5");
    expect(terms).toMatch(/COPPA|Children’s Online Privacy Protection Act/i);
    expect(terms).toMatch(/18 years of age/i);

    const privacy = await loadLegalMarkdown("privacy", "en");
    expect(privacy).toContain("Google");
    expect(privacy).toContain("Lesson recording");
    expect(privacy).toMatch(/COPPA|Children’s Online Privacy Protection Act/i);
    expect(privacy).toMatch(/18\+|adults \(18\+\)/i);
  });

  test("loads Japanese terms and privacy", async () => {
    const terms = await loadLegalMarkdown("terms", "ja");
    expect(terms).toContain("English Studio Japan");
    expect(terms).toContain("責任制限");
    expect(terms).toContain("受講生に返金すべき全額について講師が責任を負います");
    expect(terms).toContain("1〜5回目は20%");
    expect(terms).toContain("COPPA");
    expect(terms).toContain("満18歳以上");

    const privacy = await loadLegalMarkdown("privacy", "ja");
    expect(privacy).toContain("Google");
    expect(privacy).toContain("レッスンの録音");
    expect(privacy).toContain("COPPA");
    expect(privacy).toContain("満18歳以上");
  });
});

describe("isLegalLocale", () => {
  test("accepts en and ja only", () => {
    expect(isLegalLocale("en")).toBe(true);
    expect(isLegalLocale("ja")).toBe(true);
    expect(isLegalLocale("fr")).toBe(false);
  });
});
