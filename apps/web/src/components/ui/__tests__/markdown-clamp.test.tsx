// @vitest-environment jsdom

import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, act } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../messages/en.json";
import { MarkdownClamp } from "../markdown-clamp";

/*
  jsdom has no layout engine: every element reports 0 for scrollHeight and
  clientHeight, and ResizeObserver does not exist at all. The clamp decides
  whether to offer "See more" from exactly those two things, so the test has to
  supply them rather than the component growing a prop for our benefit.
*/
beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

function withOverflow(overflows: boolean) {
  const spies = [
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(overflows ? 500 : 40),
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(40),
  ];
  return () => spies.forEach((s) => s.mockRestore());
}

function renderClamp(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

afterEach(() => vi.restoreAllMocks());

describe("MarkdownClamp", () => {
  test("renders markdown as formatting, not source", () => {
    const { container } = renderClamp(<MarkdownClamp markdown="**bold**" emptyLabel="" />);

    expect(container.querySelector("strong")?.textContent).toBe("bold");
  });

  test("shows the empty label instead of an empty box", () => {
    renderClamp(<MarkdownClamp markdown="" emptyLabel="Nothing here yet" />);

    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
  });

  test("clamps by default so a long bio cannot push the page around", () => {
    const { container } = renderClamp(<MarkdownClamp markdown="a bio" emptyLabel="" />);

    expect(container.querySelector(".line-clamp-4")).not.toBeNull();
  });

  test("takes its see-more copy from the shared common namespace", () => {
    // A UI primitive used from admin and org screens too, so it must not reach
    // into `dashboard.highlights` for its labels the way the old preview did.
    expect(en.common.markdownSeeMore).toBeTruthy();
    expect(en.common.markdownSeeLess).toBeTruthy();
  });

  test("still renders where ResizeObserver is unavailable", async () => {
    // Without a guard this throws, which takes the whole surrounding page down
    // over a see-more affordance — and forces every consumer's test to stub a
    // browser global just to render a bio.
    const real = globalThis.ResizeObserver;
    // @ts-expect-error — modelling an environment that has no ResizeObserver.
    delete globalThis.ResizeObserver;

    await act(async () => {
      renderClamp(<MarkdownClamp markdown="**bold**" emptyLabel="" />);
    });

    expect(screen.getByText("bold").tagName).toBe("STRONG");

    globalThis.ResizeObserver = real;
  });

  test("offers no toggle when the content already fits", async () => {
    const restore = withOverflow(false);
    await act(async () => {
      renderClamp(<MarkdownClamp markdown="short" emptyLabel="" />);
    });

    expect(screen.queryByRole("button", { name: en.common.markdownSeeMore })).toBeNull();
    restore();
  });

  test("offers a toggle when the content overflows, and expanding unclamps it", async () => {
    const restore = withOverflow(true);
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = renderClamp(<MarkdownClamp markdown="a long bio" emptyLabel="" />));
    });

    const toggle = screen.getByRole("button", { name: en.common.markdownSeeMore });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    // The toggle has to name the region it controls, or a screen reader gets a
    // button with no stated effect.
    const controlled = toggle.getAttribute("aria-controls");
    expect(controlled).toBeTruthy();
    expect(document.getElementById(controlled!)).not.toBeNull();

    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(container.querySelector(".line-clamp-4")).toBeNull();
    expect(screen.getByRole("button", { name: en.common.markdownSeeLess })).toBeInTheDocument();
    restore();
  });
});
