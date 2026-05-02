import { describe, expect, test } from "vitest";
import { slugifyTaxonomyCode } from "../slugify-taxonomy-code";

describe("slugifyTaxonomyCode", () => {
  test("lowercases and replaces spaces with hyphens", () => {
    expect(slugifyTaxonomyCode("Year 7")).toBe("year-7");
    expect(slugifyTaxonomyCode("Conversation Club")).toBe("conversation-club");
  });

  test("strips non-alphanumeric characters", () => {
    expect(slugifyTaxonomyCode("Eiken Pre-2!")).toBe("eiken-pre-2");
  });

  test("collapses repeated separators and trims edge hyphens", () => {
    expect(slugifyTaxonomyCode("  --- Foo   Bar --- ")).toBe("foo-bar");
  });

  test("strips Japanese / non-ASCII and falls back when result is empty", () => {
    expect(slugifyTaxonomyCode("初級 Beginner")).toBe("beginner");
    expect(slugifyTaxonomyCode("初級")).toBe("");
  });

  test("preserves digits", () => {
    expect(slugifyTaxonomyCode("JLPT N2")).toBe("jlpt-n2");
  });

  test("max length 64 and trims trailing hyphen", () => {
    const long = "x".repeat(80);
    const out = slugifyTaxonomyCode(long);
    expect(out.length).toBeLessThanOrEqual(64);
    expect(out.endsWith("-")).toBe(false);
  });
});
