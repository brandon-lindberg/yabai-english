"use client";

import { signOut, useSession } from "next-auth/react";
import { useEffect, useMemo, useRef } from "react";
import { getInactivityTimeoutMs } from "@/lib/session-timeout";

const ACTIVITY_EVENTS: ReadonlyArray<keyof WindowEventMap> = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
];

/**
 * Logs out authenticated users after a period of inactivity.
 * Timeout is configured via NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES (or AUTH_IDLE_TIMEOUT_MINUTES).
 */
export function IdleLogoutGuard() {
  const { status } = useSession();
  const timeoutMs = useMemo(() => getInactivityTimeoutMs(), []);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void signOut({ callbackUrl: "/" });
      }, timeoutMs);
    };

    resetTimer();
    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, resetTimer, { passive: true });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, resetTimer);
      }
    };
  }, [status, timeoutMs]);

  return null;
}
