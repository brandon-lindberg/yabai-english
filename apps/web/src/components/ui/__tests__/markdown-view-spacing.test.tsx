// @vitest-environment jsdom

import { describe, expect, test } from "vitest";
import { render } from "@testing-library/react";
import { MarkdownView } from "../markdown-view";

describe("MarkdownView paragraph spacing", () => {
  test("renders separate paragraphs as separate elements", () => {
    const { container } = render(<MarkdownView markdown={"first para\n\nsecond para"} />);

    expect(container.querySelectorAll("p")).toHaveLength(2);
  });

  test("separates consecutive paragraphs visibly", () => {
    // A multi-paragraph bio read as one wall of text because paragraphs
    // carried a 2px margin — and the blank lines the writer added to fix it
    // do not survive markdown at all.
    const { container } = render(<MarkdownView markdown={"a\n\nb"} />);

    const cls = container.firstElementChild!.className;
    expect(cls).toMatch(/\[&_p\+p\]:mt-[2-9]/);
    expect(cls).not.toContain("[&_p]:my-0.5");
  });
});
