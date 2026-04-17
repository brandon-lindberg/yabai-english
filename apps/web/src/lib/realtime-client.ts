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

export function subscribeRealtime(handlers: RealtimeHandlers): () => void {
  if (typeof window === "undefined" || typeof EventSource === "undefined") {
    // SSR or unsupported runtime: no-op subscription.
    return () => {};
  }

  const es = new EventSource(STREAM_PATH);

  const onOpen = () => {
    handlers.onConnected();
  };

  const onChat = (ev: MessageEvent) => {
    try {
      const data = ev.data ? JSON.parse(ev.data as string) : {};
      handlers.onChatUpdate(data as { threadId?: string });
    } catch {
      handlers.onChatUpdate({});
    }
  };

  const onNotifications = () => {
    handlers.onNotificationsUpdate();
  };

  es.onopen = onOpen;
  es.addEventListener(REALTIME_EVENTS.CHAT_UPDATE, onChat as EventListener);
  es.addEventListener(
    REALTIME_EVENTS.NOTIFICATIONS_UPDATE,
    onNotifications as EventListener,
  );

  return () => {
    es.onopen = null;
    es.removeEventListener(
      REALTIME_EVENTS.CHAT_UPDATE,
      onChat as EventListener,
    );
    es.removeEventListener(
      REALTIME_EVENTS.NOTIFICATIONS_UPDATE,
      onNotifications as EventListener,
    );
    es.close();
  };
}
