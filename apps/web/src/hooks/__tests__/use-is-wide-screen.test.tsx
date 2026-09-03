// @vitest-environment jsdom

import { afterEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useIsWideScreen } from "@/hooks/use-is-wide-screen";

function Probe() {
  return <span>{useIsWideScreen() ? "wide" : "narrow"}</span>;
}

/** A matchMedia that answers one fixed way, as jsdom provides none. */
function stubViewport(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useIsWideScreen", () => {
  test("reports a wide viewport", () => {
    stubViewport(true);
    render(<Probe />);
    expect(screen.getByText("wide")).toBeInTheDocument();
  });

  test("reports a narrow viewport", () => {
    stubViewport(false);
    render(<Probe />);
    expect(screen.getByText("narrow")).toBeInTheDocument();
  });

  test("asks about the breakpoint it was given", () => {
    stubViewport(true);
    render(<Probe />);
    expect(window.matchMedia).toHaveBeenCalledWith("(min-width: 1024px)");
  });

  // Guessing narrow means a wide screen briefly shows the compact layout;
  // guessing wide would flash a desktop layout at every phone.
  test("assumes narrow when there is no matchMedia to ask", () => {
    vi.stubGlobal("matchMedia", undefined);
    render(<Probe />);
    expect(screen.getByText("narrow")).toBeInTheDocument();
  });
});
