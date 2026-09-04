"use client";

import { signOut } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useVerifiedSession } from "@/hooks/use-verified-session";
import { getInactivityTimeoutMs } from "@/lib/session-timeout";
import { buttonClasses } from "@/components/ui/button";

const ACTIVITY_EVENTS: ReadonlyArray<keyof WindowEventMap> = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
];

/**
 * Hides the page after a period of inactivity, then ends the session.
 *
 * In that order, and the order is the whole point. This used to call
 * `signOut()` and nothing else — a round-trip, from a machine that has very
 * often just been carried somewhere else and has no network yet. The request
 * failed, nothing was rendered in its place, and the previous person's data sat
 * on an unattended screen for as long as it took them to notice.
 *
 * Covering the page needs no server, so it happens first and unconditionally.
 * Ending the session does need one, so it is attempted, and retried when the
 * browser says it is back online.
 *
 * The trigger is our own timer — a local fact — not an inference from a session
 * lookup that may have failed. That distinction matters: gating the page on a
 * *reported* signed-out state would blank the dashboard on every network blip.
 *
 * Timeout is configured via NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES (or
 * AUTH_IDLE_TIMEOUT_MINUTES).
 */
export function IdleLogoutGuard() {
  const { status } = useVerifiedSession();
  const t = useTranslations("auth");
  const timeoutMs = useMemo(() => getInactivityTimeoutMs(), []);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [locked, setLocked] = useState(false);

  const endSession = useCallback(() => {
    void Promise.resolve(signOut({ callbackUrl: "/" })).catch(() => {
      // Unreachable. The page is already covered; the retry below is armed.
    });
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || locked) return;

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setLocked(true);
        endSession();
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
  }, [status, timeoutMs, locked, endSession]);

  // next-auth does not retry a failed sign-out, so the session would otherwise
  // stay alive on the server until it expires on its own.
  useEffect(() => {
    if (!locked) return;
    const retry = () => endSession();
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [locked, endSession]);

  if (!locked) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={t("idleLockTitle")}
      /* Opaque, not translucent: the point is that nothing behind it reads. */
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--app-canvas)] px-6"
    >
      <div className="max-w-[42ch] text-center">
        <h2 className="text-xl font-semibold text-foreground">{t("idleLockTitle")}</h2>
        <p className="mt-3 text-sm text-muted">{t("idleLockBody")}</p>
        {/*
          A full document load, not a client-side navigation. Routing within
          the app would leave the entire React tree — and everything it is
          holding — alive behind the new page. Discarding it is the point.
        */}
        <button
          type="button"
          onClick={() => window.location.assign("/auth/signin")}
          className={`${buttonClasses()} mt-6`}
        >
          {t("idleLockAction")}
        </button>
      </div>
    </div>
  );
}
