// @vitest-environment jsdom

import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkdownView } from "../markdown-view";

describe("MarkdownView", () => {
  test("renders markdown as formatting rather than as source", () => {
    const { container } = render(<MarkdownView markdown="**bold** and *italic*" />);

    expect(container.querySelector("strong")?.textContent).toBe("bold");
    expect(container.querySelector("em")?.textContent).toBe("italic");
    expect(container.textContent).not.toContain("**");
  });

  test("renders lists, which is what teachers reach for in notes", () => {
    const { container } = render(<MarkdownView markdown={"- one\n- two"} />);

    expect(container.querySelectorAll("ul li")).toHaveLength(2);
  });

  test("keeps the underline MDXEditor emits as raw HTML", () => {
    const { container } = render(<MarkdownView markdown="<u>underlined</u>" />);

    expect(container.querySelector("u")?.textContent).toBe("underlined");
  });

  test("strips scripts from authored content", () => {
    const { container } = render(
      <MarkdownView markdown={'text <script>alert("xss")</script> more'} />,
    );

    expect(container.querySelector("script")).toBeNull();
    expect(container.innerHTML).not.toContain("alert");
  });

  test("renders nothing when the markdown is blank", () => {
    const { container } = render(<MarkdownView markdown="   " />);

    expect(container.textContent).toBe("");
  });

  test("is a plain function component, so server components can render it", () => {
    // The public teacher page and the student profile panel are RSCs. If this
    // ever grows a hook it silently becomes client-only and they break.
    expect(MarkdownView.name).toBe("MarkdownView");
    expect(String(MarkdownView)).not.toContain("useState");
  });
});

describe("MarkdownView accessibility and links", () => {
  test("renders links and styles them from the wrapper", () => {
    // Link styling rides descendant variants on the container, the way the
    // bio preview has always done it — react-markdown owns the <a> itself.
    const { container } = render(<MarkdownView markdown="[docs](https://example.com)" />);

    expect(container.querySelector("a")).toHaveAttribute("href", "https://example.com");
    expect(container.firstElementChild?.className).toContain("[&_a]:text-link");
    expect(container.firstElementChild?.className).toContain("[&_a]:underline");
  });
});

describe("MarkdownView empty label", () => {
  test("shows the empty label when given one and there is no content", () => {
    render(<MarkdownView markdown="" emptyLabel="Nothing yet" />);

    expect(screen.getByText("Nothing yet")).toBeInTheDocument();
  });
});
