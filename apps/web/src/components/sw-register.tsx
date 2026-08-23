"use client";

import { useEffect } from "react";

/**
 * The service worker is a production-only concern.
 *
 * In development it caches Turbopack's chunks, whose URLs stay stable across
 * rebuilds while their contents do not — so the cache pins whatever code was
 * current when it first ran. That is how a dev browser kept polling a
 * socket.io endpoint for months after the socket.io client was deleted from
 * the app: the request was real, the code making it was four months old.
 *
 * Skipping registration is not enough on its own. Anyone who already installed
 * the worker keeps it, and its cache, until something removes them — so in
 * development this actively tears both down rather than leaving a stale worker
 * in charge of a machine it was never meant to run on.
 */
export function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // SW registration failed — app still works without it
      });
      return;
    }

    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) =>
        Promise.all(registrations.map((registration) => registration.unregister())),
      )
      .catch(() => {
        // Nothing to undo, or the browser refused — either way, not fatal.
      });

    if (typeof caches !== "undefined") {
      void caches
        .keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .catch(() => {});
    }
  }, []);

  return null;
}
