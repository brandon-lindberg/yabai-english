// @vitest-environment jsdom

import { describe, expect, test, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../messages/en.json";

/*
  MDXEditor is Lexical-backed and arrives through `next/dynamic({ssr:false})`,
  so it never renders in jsdom. Stand in a textarea that speaks the same props
  contract — markdown in, markdown out, `setMarkdown` on the ref — so this can
  test the wiring `MarkdownField` owns. The editor itself is covered in e2e.
*/
const setMarkdown = vi.fn();
vi.mock("@/components/ui/markdown-editor", () => ({
  MarkdownEditor: ({
    markdown,
    onChange,
    placeholder,
    ref,
  }: {
    markdown: string;
    onChange?: (md: string) => void;
    placeholder?: string;
    ref?: { current: unknown };
  }) => {
    if (ref) ref.current = { setMarkdown, getMarkdown: () => markdown };
    return (
      <textarea
        data-testid="markdown-editor"
        value={markdown}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
      />
    );
  },
}));

const { MarkdownField } = await import("../markdown-field");

function renderField(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("MarkdownField Tailwind class extraction", () => {
  test("writes its editor background classes out as complete literals", async () => {
    // Tailwind emits CSS by scanning source text. A class assembled at runtime
    // (`[&_.mdxeditor]:${bg}`) never appears in the source, so no rule is
    // generated and the editor renders with no background — a failure no
    // amount of DOM assertion can see, because the class name is still there.
    const src = await readFile(
      resolve(process.cwd(), "src/components/ui/markdown-field.tsx"),
      "utf8",
    );

    expect(src).toContain("[&_.mdxeditor]:bg-surface");
    expect(src).toContain("[&_.mdxeditor]:bg-background");
    expect(src).not.toMatch(/\[&_\.mdxeditor\]:\$\{/);
  });
});

describe("MarkdownField", () => {
  test("renders a markdown editor, not a plain textarea fallback", () => {
    renderField(<MarkdownField label="Bio" value="" onChange={() => {}} />);

    expect(screen.getByTestId("markdown-editor")).toBeInTheDocument();
  });

  test("names the editor through a labelled group", () => {
    renderField(<MarkdownField label="Lesson notes" value="" onChange={() => {}} />);

    expect(screen.getByRole("group", { name: "Lesson notes" })).toBeInTheDocument();
  });

  test("passes the hint through to the group's description", () => {
    renderField(
      <MarkdownField label="Bio" hint="Markdown supported" value="" onChange={() => {}} />,
    );

    const group = screen.getByRole("group", { name: "Bio" });
    const describedBy = group.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!.split(" ")[0])?.textContent).toBe(
      "Markdown supported",
    );
  });

  test("reports edits to the caller", () => {
    const onChange = vi.fn();
    renderField(<MarkdownField label="Bio" value="" onChange={onChange} />);

    fireEvent.change(screen.getByTestId("markdown-editor"), { target: { value: "**hi**" } });
    expect(onChange).toHaveBeenCalledWith("**hi**");
  });

  test("clips edits past the cap instead of letting them reach the API", () => {
    const onChange = vi.fn();
    renderField(<MarkdownField label="Bio" value="" maxChars={5} onChange={onChange} />);

    fireEvent.change(screen.getByTestId("markdown-editor"), { target: { value: "abcdefghij" } });
    expect(onChange).toHaveBeenCalledWith("abcde");
  });

  test("resyncs the editor document when it had to clip", async () => {
    // Without this the editor keeps the over-length text on screen while state
    // holds the clipped copy, and the two drift apart. The resync is deferred a
    // microtask so it lands after React commits, so wait one out.
    setMarkdown.mockClear();
    renderField(<MarkdownField label="Bio" value="" maxChars={5} onChange={() => {}} />);

    fireEvent.change(screen.getByTestId("markdown-editor"), { target: { value: "abcdefghij" } });
    await Promise.resolve();
    expect(setMarkdown).toHaveBeenCalledWith("abcde");
  });

  test("does not resync when the edit already fits", async () => {
    setMarkdown.mockClear();
    renderField(<MarkdownField label="Bio" value="" maxChars={50} onChange={() => {}} />);

    fireEvent.change(screen.getByTestId("markdown-editor"), { target: { value: "abc" } });
    await Promise.resolve();
    expect(setMarkdown).not.toHaveBeenCalled();
  });

  test("shows a counter only when there is a cap to count against", () => {
    const { rerender } = renderField(
      <MarkdownField label="Bio" value="abc" maxChars={300} onChange={() => {}} />,
    );
    expect(screen.getByText("3 / 300")).toBeInTheDocument();

    rerender(
      <NextIntlClientProvider locale="en" messages={en}>
        <MarkdownField label="Bio" value="abc" onChange={() => {}} />
      </NextIntlClientProvider>,
    );
    expect(screen.queryByText(/\/ 300/)).toBeNull();
  });

  test("warns as the counter nears the cap and marks it when full", () => {
    const { rerender } = renderField(
      <MarkdownField label="Bio" value={"x".repeat(95)} maxChars={100} onChange={() => {}} />,
    );
    expect(screen.getByText("95 / 100").className).toContain("--app-warn-text");

    rerender(
      <NextIntlClientProvider locale="en" messages={en}>
        <MarkdownField label="Bio" value={"x".repeat(100)} maxChars={100} onChange={() => {}} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("100 / 100").className).toContain("--app-danger");
  });

  test("keeps the counter in the group's description so it is announced", () => {
    renderField(
      <MarkdownField label="Bio" hint="Markdown supported" value="ab" maxChars={10} onChange={() => {}} />,
    );

    const group = screen.getByRole("group", { name: "Bio" });
    const ids = (group.getAttribute("aria-describedby") ?? "").split(" ").filter(Boolean);
    const texts = ids.map((id) => document.getElementById(id)?.textContent);
    expect(texts).toContain("Markdown supported");
    expect(texts).toContain("2 / 10");
  });
});
