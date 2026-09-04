"use client";

import { REALTIME_EVENTS } from "@/lib/realtime-events";

export type RealtimeHandlers = {
  onChatUpdate: (payload: { threadId?: string }) => void;
  onNotificationsUpdate: () => void;
  /**
   * Fires on initial SSE connect and on every automatic reconnect. Use it to
   * pull a fresh snapshot so we never show stale state after a dropped
   * connection.
   */
  onConnected: () => void;
};

const STREAM_PATH = "/api/realtime/stream";

/**
 * One SSE connection per tab, shared by every subscriber.
 *
 * A browser allows six connections per origin over HTTP/1.1 — which is what a
 * local dev server speaks — and an SSE stream holds one open for as long as the
 * page lives. Every extra subscriber is a permanent tax on that budget, and
 * when the budget runs out requests do not fail, they *queue*, until some
 * stream ends. The server logs a handler that took 14ms and the person watching
 * the tab waits a minute and a half.
 *
 * The bell and the chat panel each opened their own. Worse, the panel's
 * subscription was keyed on things that change while you use it — whether the
 * panel is open, which thread is selected, a memoised loader that depends on
 * the admin search box — so it tore the connection down and opened a fresh one
 * on every keystroke, leaving a trail of half-closed sockets against that cap.
 *
 * Ref-counting also makes that churn harmless: a subscriber leaving and
 * rejoining while anyone else is still listening never touches the socket.
 */
type Subscriber = RealtimeHandlers;

let source: EventSource | null = null;
let subscribers = new Set<Subscriber>();
/** Whether the shared stream is currently open, for subscribers joining late. */
let connected = false;

function openStream() {
  const es = new EventSource(STREAM_PATH);

  es.onopen = () => {
    connected = true;
    for (const s of subscribers) s.onConnected();
  };

  es.addEventListener(REALTIME_EVENTS.CHAT_UPDATE, ((ev: MessageEvent) => {
    let payload: { threadId?: string } = {};
    try {
      payload = ev.data ? (JSON.parse(ev.data as string) as { threadId?: string }) : {};
    } catch {
      payload = {};
    }
    for (const s of subscribers) s.onChatUpdate(payload);
  }) as EventListener);

  es.addEventListener(REALTIME_EVENTS.NOTIFICATIONS_UPDATE, (() => {
    for (const s of subscribers) s.onNotificationsUpdate();
  }) as EventListener);

  return es;
}

export function subscribeRealtime(handlers: RealtimeHandlers): () => void {
  if (typeof window === "undefined" || typeof EventSource === "undefined") {
    // SSR or unsupported runtime: no-op subscription.
    return () => {};
  }

  subscribers.add(handlers);
  if (!source) {
    connected = false;
    source = openStream();
  } else if (connected) {
    // Joining a stream that is already open. `onConnected` is what pulls a
    // fresh snapshot, so a late subscriber that never heard it would sit there
    // with no data.
    handlers.onConnected();
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    subscribers.delete(handlers);
    if (subscribers.size === 0 && source) {
      source.close();
      source = null;
      connected = false;
    }
  };
}

/** Test seam: drop the shared connection and every subscriber. */
export function resetRealtimeForTests() {
  source?.close();
  source = null;
  subscribers = new Set();
  connected = false;
}
