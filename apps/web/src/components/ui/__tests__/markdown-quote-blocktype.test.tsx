// @vitest-environment jsdom

import { beforeAll, describe, expect, test } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import { MarkdownEditorInner } from "../markdown-editor-inner";

const editorRef = () => ({ current: null } as { current: MDXEditorMethods | null });

/*
  Reproduces a real reported bug: a quote that arrives from parsed markdown
  cannot be turned back into a paragraph.

  MDXEditor reports the block type from the *top-level* element (the
  blockquote, so the dropdown correctly reads "Quote"), but converts using
  Lexical's `$setBlocksType`, which acts on the nearest *block*. Parsed
  markdown nests a paragraph inside the quote (`blockquote > p`), so choosing
  "Paragraph" replaces that inner paragraph with another paragraph and leaves
  the quote wrapper untouched. Toolbar-created quotes have no inner paragraph
  and so were never affected — which is why this only bites content that has
  been saved and reloaded.
*/
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};
});

async function pickBlockType(label: string) {
  const trigger = screen.getByLabelText("Block type");
  fireEvent.pointerDown(trigger, { button: 0, pointerType: "mouse" });
  fireEvent.click(trigger);
  await new Promise((r) => setTimeout(r, 50));
  const option = Array.from(document.querySelectorAll('[role="option"]')).find(
    (o) => o.textContent === label,
  ) as HTMLElement;
  fireEvent.pointerDown(option, { button: 0, pointerType: "mouse" });
  fireEvent.pointerUp(option, { button: 0, pointerType: "mouse" });
  fireEvent.click(option);
  await new Promise((r) => setTimeout(r, 120));
}

function selectAllText(ce: HTMLElement) {
  const span = ce.querySelector("span")!;
  const range = document.createRange();
  range.setStart(span.firstChild!, 0);
  range.setEnd(span.firstChild!, span.textContent!.length);
  const sel = window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
  fireEvent.focus(ce);
  fireEvent(document, new Event("selectionchange"));
}

describe("quote block type round trip", () => {
  test("a quote loaded from saved markdown can be turned back into a paragraph", async () => {
    const ref = editorRef();
    render(<MarkdownEditorInner editorRef={ref} markdown={"> quoted line"} />);
    const ce = document.querySelector('[contenteditable="true"]') as HTMLElement;

    selectAllText(ce);
    await new Promise((r) => setTimeout(r, 60));
    await pickBlockType("Paragraph");

    expect(ref.current!.getMarkdown().trim()).toBe("quoted line");
    expect(ce.querySelector("blockquote")).toBeNull();
  });

  test("a multi-paragraph quote keeps its paragraphs", async () => {
    // Normalization must not join separate paragraphs into one. This content
    // is left in its nested shape on purpose.
    const ref = editorRef();
    render(<MarkdownEditorInner editorRef={ref} markdown={"> first\n>\n> second"} />);
    await new Promise((r) => setTimeout(r, 120));

    const md = ref.current!.getMarkdown();
    expect(md).toContain("first");
    expect(md).toContain("second");
    expect(md).not.toMatch(/first\s+second/);
  });

  test("ordinary markdown is unchanged by the normalization", async () => {
    const ref = editorRef();
    const source = "# ignored\n\n**bold** text\n\n- one\n- two";
    render(<MarkdownEditorInner editorRef={ref} markdown={source} />);
    await new Promise((r) => setTimeout(r, 120));

    const md = ref.current!.getMarkdown();
    expect(md).toContain("**bold**");
    // MDXEditor normalises bullets to `*` on export — equivalent markdown, and
    // unrelated to the quote handling under test here.
    expect(md).toMatch(/[-*] one/);
    expect(md).toMatch(/[-*] two/);
    expect(md).toContain("# ignored");
  });

  test("a quote created from the toolbar still round trips", async () => {
    const ref = editorRef();
    render(<MarkdownEditorInner editorRef={ref} markdown={"plain sentence"} />);
    const ce = document.querySelector('[contenteditable="true"]') as HTMLElement;

    selectAllText(ce);
    await new Promise((r) => setTimeout(r, 60));
    await pickBlockType("Quote");
    expect(ref.current!.getMarkdown().trim()).toBe("> plain sentence");

    selectAllText(ce);
    await new Promise((r) => setTimeout(r, 60));
    await pickBlockType("Paragraph");
    expect(ref.current!.getMarkdown().trim()).toBe("plain sentence");
  });
});
