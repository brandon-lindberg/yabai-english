import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/*
  Tailwind's preflight zeroes blockquote margins and sets headings to
  `font-size: inherit; font-weight: inherit`. MDXEditor ships no styling for
  either, so inside the editor a quote and a heading render pixel-identical to
  a paragraph: the writer gets no feedback that the button did anything.

  The existing rules in this file restore list markers for exactly this reason.
  Quotes and headings were missed.
*/
const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
const editorBlock = css.slice(css.indexOf(".mdxeditor-rich-lists"));

describe("editor content styling", () => {
  test("a blockquote is visibly a blockquote while writing", () => {
    const rule = editorBlock.match(
      /\.mdxeditor-rich-lists\s+\.mdxeditor-root-contenteditable\s+blockquote\s*\{[^}]*\}/,
    );
    expect(rule, "no blockquote rule for the editor content area").not.toBeNull();
    expect(rule![0]).toMatch(/border-(inline-start|left)/);
    expect(rule![0]).toMatch(/padding-(inline-start|left)/);
  });

  test("consecutive paragraphs are visibly separate while writing", () => {
    /*
      Preflight zeroes paragraph margins, so paragraphs touched. Writers
      compensated by pressing Enter twice — but markdown collapses any run of
      blank lines to a single paragraph break, so that spacing vanished the
      moment the text was saved and reloaded. The separation has to come from
      the stylesheet, because it cannot come from the content.
    */
    const rule = editorBlock.match(
      /\.mdxeditor-rich-lists\s+\.mdxeditor-root-contenteditable\s+p\s*\+\s*p\s*\{[^}]*\}/,
    );
    expect(rule, "no paragraph spacing rule for the editor content area").not.toBeNull();
    expect(rule![0]).toMatch(/margin-(block-start|top)/);
  });

  test("headings are visibly headings while writing", () => {
    // Properties may be split across a shared rule and a per-level one, so
    // judge the whole cascade that reaches h2 rather than any single rule.
    const rules = [
      ...editorBlock.matchAll(
        /\.mdxeditor-rich-lists\s+\.mdxeditor-root-contenteditable\s+h2\b[^{]*\{[^}]*\}/g,
      ),
    ].map((m) => m[0]);
    expect(rules.length, "no heading rule for the editor content area").toBeGreaterThan(0);

    const applied = rules.join("\n");
    expect(applied).toMatch(/font-size/);
    expect(applied).toMatch(/font-weight/);
  });
});
