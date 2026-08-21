import { describe, expect, test } from "vitest";
import { markdownSanitizeSchema } from "../sanitize-schema";

describe("markdownSanitizeSchema", () => {
  test("allows the underline MDXEditor emits for its underline toggle", () => {
    // MDXEditor has no markdown syntax for underline, so it emits raw `<u>`.
    // rehype-sanitize's default schema drops it, which silently ate formatting.
    expect(markdownSanitizeSchema.tagNames).toContain("u");
  });

  test("keeps the GitHub-default allowlist rather than replacing it", () => {
    for (const tag of ["strong", "em", "ul", "ol", "li", "a", "blockquote", "h2"]) {
      expect(markdownSanitizeSchema.tagNames).toContain(tag);
    }
  });

  test("does not allow script or style through", () => {
    expect(markdownSanitizeSchema.tagNames).not.toContain("script");
    expect(markdownSanitizeSchema.tagNames).not.toContain("style");
  });
});
