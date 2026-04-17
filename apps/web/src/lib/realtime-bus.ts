import { EventEmitter } from "node:events";

import { REALTIME_EVENTS } from "@/lib/realtime-events";

export type RealtimeEvent =
  | { event: typeof REALTIME_EVENTS.CHAT_UPDATE; payload: { threadId: string } }
  | { event: typeof REALTIME_EVENTS.NOTIFICATIONS_UPDATE; payload: Record<string, never> };

export type RealtimeHandler = (event: RealtimeEvent) => void;

// In-process pub/sub keyed by userId. Scales fine for a single Next.js node;
// swap the internals for Redis pub/sub if/when we need multi-instance fanout.
//
// Hoisted onto globalThis so Next.js dev mode (which hot-reloads module
// instances) and server-actions that share memory use the same emitter.
const GLOBAL_KEY = Symbol.for("english-platform.realtime-bus");

type GlobalWithBus = typeof globalThis & {
  [GLOBAL_KEY]?: EventEmitter;
};

function getBus(): EventEmitter {
  const g = globalThis as GlobalWithBus;
  if (!g[GLOBAL_KEY]) {
    const emitter = new EventEmitter();
    // Each connected browser tab adds one listener. Bump the soft cap so we
    // don't log spurious warnings on multi-tab accounts.
    emitter.setMaxListeners(0);
    g[GLOBAL_KEY] = emitter;
  }
  return g[GLOBAL_KEY]!;
}

function channel(userId: string) {
  return `user:${userId}`;
}

export function subscribeToUserRealtime(
  userId: string,
  handler: RealtimeHandler,
): () => void {
  const bus = getBus();
  const listener = (event: RealtimeEvent) => {
    handler(event);
  };
  bus.on(channel(userId), listener);
  return () => {
    bus.off(channel(userId), listener);
  };
}

export function publishChatUpdate(userId: string, threadId: string) {
  getBus().emit(channel(userId), {
    event: REALTIME_EVENTS.CHAT_UPDATE,
    payload: { threadId },
  } satisfies RealtimeEvent);
}

export function publishNotificationsUpdate(userId: string) {
  getBus().emit(channel(userId), {
    event: REALTIME_EVENTS.NOTIFICATIONS_UPDATE,
    payload: {},
  } satisfies RealtimeEvent);
}
