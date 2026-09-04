// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, test, vi } from "vitest";
import { useLatestRef } from "@/hooks/use-latest-ref";

/*
  The shape that kept recurring: an effect needs a value, but must not re-run
  when that value changes.

  Listing it as a dependency tears down and rebuilds whatever the effect set up
  — an SSE connection, a subscription, a one-shot guard — every time it moves.
  Omitting it leaves the effect reading a stale closure. A ref that is kept
  current gives the effect today's value with yesterday's dependency list.
*/

describe("useLatestRef", () => {
  test("an effect sees the value on its first run", () => {
    // Read from an effect, never during render: a ref read while rendering is
    // a value React does not know the output depends on.
    const seen = vi.fn();
    function Probe({ value }: { value: number }) {
      const ref = useLatestRef(value);
      useEffect(() => {
        seen(ref.current);
      }, [ref]);
      return null;
    }

    render(<Probe value={1} />);

    expect(seen).toHaveBeenCalledWith(1);
  });

  test("an effect reads the new value without having re-run — and the ref is stable", () => {
    // The two halves are one test on purpose: the effect lists `[ref]`, so if
    // the ref identity were not stable it would have re-run, and the "set up
    // once" assertion below is exactly what proves it.
    const ran = vi.fn();
    let read: (() => number) | undefined;

    function Probe({ value }: { value: number }) {
      const ref = useLatestRef(value);
      useEffect(() => {
        ran();
        read = () => ref.current;
      }, [ref]);
      return null;
    }

    const view = render(<Probe value={1} />);
    view.rerender(<Probe value={2} />);
    view.rerender(<Probe value={3} />);

    // Set up once...
    expect(ran).toHaveBeenCalledTimes(1);
    // ...and still sees the latest.
    expect(read!()).toBe(3);
  });

})
