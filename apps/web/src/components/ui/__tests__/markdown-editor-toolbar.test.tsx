// @vitest-environment jsdom

import { describe, expect, test } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MarkdownEditorInner } from "../markdown-editor-inner";

/*
  Renders the real MDXEditor, bypassing the `next/dynamic` wrapper that never
  resolves under jsdom.

  Most people writing a bio do not know markdown syntax, so the toolbar is the
  feature rather than a nicety — a plain contenteditable would be a regression
  even though the stored value would look identical. That makes its presence
  worth asserting, not assuming.
*/
describe("markdown editor toolbar", () => {
  function renderEditor() {
    render(<MarkdownEditorInner editorRef={null} markdown="" />);
    return screen.findByRole("toolbar");
  }

  test("ships a formatting toolbar with the editor", async () => {
    expect(await renderEditor()).toBeInTheDocument();
  });

  test("offers formatting by button, so nobody has to know the syntax", async () => {
    const toolbar = await renderEditor();

    for (const name of ["Bold", "Italic", "Underline"]) {
      expect(within(toolbar).getByLabelText(name)).toBeInTheDocument();
    }
  });

  test("offers lists, links and block types", async () => {
    const toolbar = await renderEditor();

    for (const name of [
      "Bulleted list",
      "Numbered list",
      "Check list",
      "Create link",
      "Block type",
    ]) {
      expect(within(toolbar).getByLabelText(name)).toBeInTheDocument();
    }
  });

  test("offers undo and redo", async () => {
    const toolbar = await renderEditor();

    expect(within(toolbar).getByLabelText(/^Undo/)).toBeInTheDocument();
    expect(within(toolbar).getByLabelText(/^Redo/)).toBeInTheDocument();
  });

  test("keeps the toolbar when a character cap is applied", async () => {
    // The cap adds a plugin; a mistake there could drop the toolbar on exactly
    // the capped fields (student bio, teacher bio) and nowhere else.
    render(<MarkdownEditorInner editorRef={null} markdown="" maxPlainTextLength={300} />);

    const toolbars = await screen.findAllByRole("toolbar");
    expect(within(toolbars[0]).getByLabelText("Bold")).toBeInTheDocument();
  });
});
