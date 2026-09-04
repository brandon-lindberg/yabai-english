"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Keeps a ref pointing at the newest value, for effects that must read it
 * without re-running when it changes.
 *
 * The alternative is a dependency list, and for a subscription that is the
 * wrong tool: listing the value tears down and rebuilds whatever the effect set
 * up every time it moves. That is how the chat panel came to close and reopen
 * its SSE connection on every keystroke, and how the session check came to fire
 * a request per render. Omitting the value instead leaves the effect reading a
 * stale closure, which is the bug the dependency rule exists to catch.
 *
 * A ref that is kept current gives an effect today's value with yesterday's
 * dependency list. The ref object's identity never changes, so it is safe —
 * and honest — to list the ref itself.
 *
 * Not a substitute for dependencies in general: reach for it only where the
 * effect genuinely should not re-run, which usually means it owns a connection
 * or a timer rather than deriving something.
 */
export function useLatestRef<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}
