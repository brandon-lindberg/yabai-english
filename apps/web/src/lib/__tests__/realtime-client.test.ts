// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { subscribeRealtime } from "@/lib/realtime-client";

type Listener = (ev: MessageEvent) => void;

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  url: string;
  readyState = 0;
  listeners = new Map<string, Set<Listener>>();
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: Listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: Listener) {
    this.listeners.get(type)?.delete(listener);
  }

  close() {
    this.closed = true;
  }

  emit(type: string, data: unknown) {
    const ev = new MessageEvent(type, { data: JSON.stringify(data) });
    this.listeners.get(type)?.forEach((l) => l(ev));
  }

  fireOpen() {
    this.readyState = 1;
    this.onopen?.();
  }
}

describe("realtime-client", () => {
  beforeEach(() => {
    FakeEventSource.instances = [];
    vi.stubGlobal("EventSource", FakeEventSource);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("opens an SSE connection to the stream endpoint", () => {
    const unsubscribe = subscribeRealtime({
      onChatUpdate: vi.fn(),
      onNotificationsUpdate: vi.fn(),
      onConnected: vi.fn(),
    });
    try {
      expect(FakeEventSource.instances).toHaveLength(1);
      expect(FakeEventSource.instances[0].url).toBe("/api/realtime/stream");
    } finally {
      unsubscribe();
    }
  });

  test("invokes onConnected on initial connect and on reconnect", () => {
    const onConnected = vi.fn();
    const unsubscribe = subscribeRealtime({
      onChatUpdate: vi.fn(),
      onNotificationsUpdate: vi.fn(),
      onConnected,
    });
    try {
      const es = FakeEventSource.instances[0];
      es.fireOpen();
      es.fireOpen();
      expect(onConnected).toHaveBeenCalledTimes(2);
    } finally {
      unsubscribe();
    }
  });

  test("routes chat:update events to onChatUpdate with threadId payload", () => {
    const onChatUpdate = vi.fn();
    const unsubscribe = subscribeRealtime({
      onChatUpdate,
      onNotificationsUpdate: vi.fn(),
      onConnected: vi.fn(),
    });
    try {
      const es = FakeEventSource.instances[0];
      es.emit("chat:update", { threadId: "thread-77" });
      expect(onChatUpdate).toHaveBeenCalledWith({ threadId: "thread-77" });
    } finally {
      unsubscribe();
    }
  });

  test("routes notifications:update events to onNotificationsUpdate", () => {
    const onNotificationsUpdate = vi.fn();
    const unsubscribe = subscribeRealtime({
      onChatUpdate: vi.fn(),
      onNotificationsUpdate,
      onConnected: vi.fn(),
    });
    try {
      const es = FakeEventSource.instances[0];
      es.emit("notifications:update", {});
      expect(onNotificationsUpdate).toHaveBeenCalledTimes(1);
    } finally {
      unsubscribe();
    }
  });

  test("closes the EventSource on unsubscribe", () => {
    const unsubscribe = subscribeRealtime({
      onChatUpdate: vi.fn(),
      onNotificationsUpdate: vi.fn(),
      onConnected: vi.fn(),
    });
    const es = FakeEventSource.instances[0];
    unsubscribe();
    expect(es.closed).toBe(true);
  });
});
