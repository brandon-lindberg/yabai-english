"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { japaneseAttemptViewSchema, type JapaneseAttemptView, type JapaneseResponseInput } from "@/lib/japanese-placement/public";
import { clearSessionDraft } from "@/hooks/use-session-draft";

export function japaneseSentenceDraftKey(attemptId: string, itemId: string) {
  return `japanese-placement:sentence:${attemptId}:${itemId}`;
}

class ApiFailure extends Error { constructor(public code: string, public status = 0) { super(code); } }
const root = "/api/japanese-placement/attempts";
async function request(url: string, signal: AbortSignal, body?: unknown) {
  const response = await fetch(url, { signal, cache: "no-store", ...(body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
  const value = await response.json();
  if (!response.ok) throw new ApiFailure(typeof value.error === "string" ? value.error : "NETWORK", response.status);
  return value;
}

export function useJapaneseAssessment() {
  const [view, setView] = useState<JapaneseAttemptView | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState(false);
  const [pending, setPending] = useState<JapaneseResponseInput | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const current = useRef(view);
  const controller = useRef<AbortController | null>(null);
  const startId = useRef<string | null>(null);
  const pendingRef = useRef<JapaneseResponseInput | null>(null);
  const lastAction = useRef<"load" | "start" | "answer">("load");
  const clock = useRef<{ budget: number; received: number; wall: number } | null>(null);
  const expiryRequested = useRef(false);

  const apply = useCallback((value: unknown) => {
    const next = value == null ? null : japaneseAttemptViewSchema.parse(value);
    const previous = current.current;
    if (previous?.question?.response.kind === "sentence_assembly" && (next?.status !== "IN_PROGRESS"
      || next.attemptId !== previous.attemptId || next.question?.id !== previous.question.id)) {
      clearSessionDraft(japaneseSentenceDraftKey(previous.attemptId, previous.question.id));
    }
    current.current = next; setView(next); setLoaded(true); setError(null);
    pendingRef.current = null; setPending(null);
    if (next?.status === "IN_PROGRESS") {
      const budget = Math.max(0, Date.parse(next.expiresAt!) - Date.parse(next.serverNow!));
      clock.current = { budget, received: performance.now(), wall: Date.now() };
      setRemaining(Math.ceil(budget / 1000)); expiryRequested.current = budget <= 0;
    } else { clock.current = null; setRemaining(null); }
  }, []);

  const read = useCallback(async (signal: AbortSignal) => {
    const url = current.current ? `${root}/${encodeURIComponent(current.current.attemptId)}` : root;
    const value = await request(url, signal);
    return url === root ? value.attempt : value;
  }, []);

  const run = useCallback(async (action: "load" | "start" | "answer", task: (signal: AbortSignal) => Promise<unknown>) => {
    if (controller.current) return;
    const owned = new AbortController(); controller.current = owned;
    lastAction.current = action; setBusy(true); setError(null); setNotice(false);
    try {
      const value = await task(owned.signal);
      if (!owned.signal.aborted) { apply(value); if (action === "start") startId.current = null; }
    } catch (failure) {
      if (owned.signal.aborted) return;
      const code = failure instanceof ApiFailure ? failure.code : "NETWORK";
      if (failure instanceof ApiFailure && failure.status === 409 && ["ACTIVE_ATTEMPT_EXISTS", "RESPONSE_CONFLICT", "ATTEMPT_COMPLETED"].includes(code)) {
        try { const value = await read(owned.signal); if (!owned.signal.aborted) { apply(value); setNotice(true); } }
        catch { if (!owned.signal.aborted) { setError("NETWORK"); setLoaded(true); } }
      } else { setError(code); setLoaded(true); }
    } finally {
      if (controller.current === owned) { controller.current = null; setBusy(false); }
    }
  }, [apply, read]);

  const refresh = useCallback(() => run("load", read), [run, read]);
  const start = useCallback(() => {
    startId.current ??= crypto.randomUUID();
    return run("start", (signal) => request(root, signal, { requestId: startId.current }));
  }, [run]);
  const submit = useCallback((response: JapaneseResponseInput) => {
    if (!current.current || controller.current || pendingRef.current) return;
    pendingRef.current = response; setPending(response);
    return run("answer", (signal) => request(`${root}/${encodeURIComponent(current.current!.attemptId)}/responses`, signal, response));
  }, [run]);
  const retry = useCallback(() => {
    const response = pendingRef.current;
    if (response && current.current) return run("answer", (signal) => request(`${root}/${encodeURIComponent(current.current!.attemptId)}/responses`, signal, response));
    return lastAction.current === "start" ? start() : refresh();
  }, [refresh, run, start]);

  useEffect(() => {
    void refresh();
    const onFocus = () => { if (document.visibilityState === "visible" && !pendingRef.current) void refresh(); };
    window.addEventListener("focus", onFocus); document.addEventListener("visibilitychange", onFocus);
    return () => { controller.current?.abort(); controller.current = null; window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); };
  }, [refresh]);
  useEffect(() => {
    if (view?.status !== "IN_PROGRESS") return;
    const tick = () => { const timer = clock.current; if (timer) setRemaining(Math.max(0, Math.ceil((timer.budget - Math.max(performance.now() - timer.received, Date.now() - timer.wall)) / 1000))); };
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [view?.status]);
  useEffect(() => {
    if (view?.status === "IN_PROGRESS" && remaining === 0 && !busy && !expiryRequested.current) {
      expiryRequested.current = true; void refresh();
    }
  }, [view?.status, remaining, busy, refresh]);
  return { view, loaded, busy, error, notice, pending, remaining, start, submit, refresh, retry };
}
