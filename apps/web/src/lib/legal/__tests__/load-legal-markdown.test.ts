import { describe, expect, test } from "vitest";
import { isLegalLocale, loadLegalMarkdown } from "@/lib/legal/load-legal-markdown";

describe("loadLegalMarkdown", () => {
  test("loads English terms and privacy", async () => {
    const terms = await loadLegalMarkdown("terms", "en");
    expect(terms).toContain("English Studio Japan");
    expect(terms).toContain("Limitation of liability");
    expect(terms).toMatch(/COPPA|Children’s Online Privacy Protection Act/i);

    const privacy = await loadLegalMarkdown("privacy", "en");
    expect(privacy).toContain("Google");
    expect(privacy).toContain("Lesson recording");
    expect(privacy).toMatch(/COPPA|Children’s Online Privacy Protection Act/i);
  });

  test("loads Japanese terms and privacy", async () => {
    const terms = await loadLegalMarkdown("terms", "ja");
    expect(terms).toContain("English Studio Japan");
    expect(terms).toContain("責任制限");
    expect(terms).toContain("COPPA");

    const privacy = await loadLegalMarkdown("privacy", "ja");
    expect(privacy).toContain("Google");
    expect(privacy).toContain("レッスンの録音");
    expect(privacy).toContain("COPPA");
  });
});

describe("isLegalLocale", () => {
  test("accepts en and ja only", () => {
    expect(isLegalLocale("en")).toBe(true);
    expect(isLegalLocale("ja")).toBe(true);
    expect(isLegalLocale("fr")).toBe(false);
  });
});
