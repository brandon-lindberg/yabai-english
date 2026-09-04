// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useSessionDraft } from "@/hooks/use-session-draft";

/*
  A multi-step form holds its answers in component state, which lasts exactly as
  long as the component is mounted. Switching language navigates to the other
  locale's URL — a different route, so a full remount — and the wizard came back
  at step one with every answer reset.

  Restoring the step alone would be worse than the bug: you would land on the
  terms step with your timezone and goals silently back at their defaults, and
  submit those. So the draft travels whole.
*/

type Draft = { step: number; goals: string[] };

function Probe({ onReady }: { onReady?: (api: unknown) => void }) {
  const [draft, setDraft, clear] = useSessionDraft<Draft>("test-draft", {
    step: 0,
    goals: ["conversation"],
  });
  onReady?.({ setDraft, clear });
  return (
    <span data-testid="draft">
      {draft.step}:{draft.goals.join(",")}
    </span>
  );
}

function value() {
  return screen.getByTestId("draft").textContent;
}

describe("useSessionDraft", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  test("starts from the given defaults", () => {
    render(<Probe />);

    expect(value()).toBe("0:conversation");
  });

  test("a draft survives the component being torn down and rebuilt", () => {
    // Which is what a language switch does: same wizard, different route.
    let api: { setDraft: (d: Draft) => void } | undefined;
    const first = render(<Probe onReady={(a) => (api = a as typeof api)} />);
    act(() => api!.setDraft({ step: 3, goals: ["business", "travel"] }));
    first.unmount();

    render(<Probe />);

    expect(value()).toBe("3:business,travel");
  });

  test("finishing clears it, so the next visit starts clean", () => {
    let api: { setDraft: (d: Draft) => void; clear: () => void } | undefined;
    const first = render(<Probe onReady={(a) => (api = a as typeof api)} />);
    act(() => api!.setDraft({ step: 3, goals: ["business"] }));
    act(() => api!.clear());
    first.unmount();

    render(<Probe />);

    expect(value()).toBe("0:conversation");
  });

  test("a corrupted draft falls back to the defaults rather than throwing", () => {
    window.sessionStorage.setItem("test-draft", "{not json");

    render(<Probe />);

    expect(value()).toBe("0:conversation");
  });

  test("works where storage itself throws", () => {
    // Private windows and "block site data" make even reading throw. A wizard
    // must still open.
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });

    expect(() => render(<Probe />)).not.toThrow();
    expect(value()).toBe("0:conversation");
    spy.mockRestore();
  });
});
