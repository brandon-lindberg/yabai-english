"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { Session } from "next-auth";

/**
 * `useSession`, minus its inability to tell "signed out" from "could not ask".
 *
 * next-auth's client fetch catches every error and returns null, and `status`
 * is derived as `session ? "authenticated" : "unauthenticated"`. So one failed
 * request to /api/auth/session — a laptop opened before the wifi is up, a
 * coffee-shop captive portal, a dropped connection — reports a signed-in user
 * as signed out. The header then offers "Sign in" to somebody whose cookie is
 * perfectly valid, over a page still showing their data.
 *
 * It is sticky, too: `_getSession` returns early whenever its cached session is
 * null ("if the client doesn't have a session we don't need to ask the server"),
 * so neither the focus refetch nor the poll ever corrects it. Only a full
 * reload does — which is what a puzzled user eventually tries.
 *
 * So a downgrade to "signed out" is treated as a claim to be checked, not a
 * fact. We ask the endpoint ourselves:
 *
 *   - the request fails    → we learned nothing; keep the session we had
 *   - it returns a session → still signed in; resync next-auth's own cache
 *   - it returns nothing   → genuinely signed out; honour it
 */
export type VerifiedSessionStatus = "authenticated" | "unauthenticated" | "loading";

/** What our own check of the session endpoint concluded. */
type Verdict = "unchecked" | "signed-in" | "signed-out";

export function useVerifiedSession(): {
  data: Session | null;
  status: VerifiedSessionStatus;
} {
  const { data, status, update } = useSession();

  /** The most recent session next-auth reported. */
  const [lastKnown, setLastKnown] = useState<Session | null>(null);
  const [verdict, setVerdict] = useState<Verdict>("unchecked");

  /*
    Recorded during render — React's documented adjustment pattern — rather than
    in an effect. An effect would commit one render showing the old value first,
    and a ref cannot be read during render at all.
  */
  if (status === "authenticated" && data && data !== lastKnown) {
    setLastKnown(data);
    // A fresh sign-in retires whatever the last check concluded.
    if (verdict !== "unchecked") setVerdict("unchecked");
  }

  const verify = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", {
        headers: { "Content-Type": "application/json" },
        // Reach the server, not a cache that may be holding the stale answer.
        cache: "no-store",
      });
      if (!res.ok) return;
      const body = (await res.json()) as Session | null;
      if (body && Object.keys(body).length > 0) {
        setLastKnown(body);
        setVerdict("signed-in");
        // Push the truth back into next-auth, whose own cache will otherwise
        // never ask again.
        void update();
        return;
      }
      // A reachable server saying "no session" is real evidence. Honour it, or
      // signing out in another tab would leave this one signed in forever.
      setVerdict("signed-out");
    } catch {
      // Unreachable. That is a statement about the network, not about the user.
    }
  }, [update]);

  /** next-auth says signed out, but we have seen a session in this tab. */
  const doubtful = status === "unauthenticated" && lastKnown !== null;

  useEffect(() => {
    if (!doubtful) return;
    /*
      The rule below guards against a setState running synchronously with the
      effect and cascading a second render. Every setState in `verify` sits
      behind `await fetch(...)`, so none can run in this tick — the linter
      cannot see through the async boundary. Synchronising React with an
      external system, which is what the session endpoint is, is precisely what
      an effect is for.
    */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void verify();
    // next-auth will not retry once its cached session is null, so recovery
    // has to be armed here rather than left to it.
    const onOnline = () => void verify();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [doubtful, verify]);

  if (doubtful && verdict !== "signed-out") {
    return { data: lastKnown, status: "authenticated" };
  }

  return { data: data ?? null, status };
}
