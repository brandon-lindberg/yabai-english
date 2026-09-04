// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { resetRealtimeForTests, subscribeRealtime } from "@/lib/realtime-client";

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

describe("realtime-client — one connection for the whole tab", () => {
  /*
    A browser allows six connections per origin over HTTP/1.1, which is what
    the dev server speaks. An SSE stream holds one open for as long as the page
    lives, so every extra subscriber is a permanent tax on that budget — and
    when the budget runs out, ordinary requests do not fail, they queue, until
    some stream ends. The server logs a fast handler and the person watching
    the tab waits a minute and a half.

    The bell and the chat panel each opened their own. Worse, the panel's
    subscription was keyed on values that change while using it — the open
    flag, the selected thread, a memoised loader that depends on the admin
    search box — so typing in that box tore the connection down and opened a
    fresh one per keystroke.
  */
  const handlers = () => ({
    onChatUpdate: vi.fn(),
    onNotificationsUpdate: vi.fn(),
    onConnected: vi.fn(),
  });

  beforeEach(() => {
    resetRealtimeForTests();
    FakeEventSource.instances = [];
    vi.stubGlobal("EventSource", FakeEventSource);
  });

  afterEach(() => {
    resetRealtimeForTests();
    vi.unstubAllGlobals();
  });

  test("two subscribers share a single stream", () => {
    const a = subscribeRealtime(handlers());
    const b = subscribeRealtime(handlers());
    try {
      expect(FakeEventSource.instances).toHaveLength(1);
    } finally {
      a();
      b();
    }
  });

  test("both subscribers still receive events", () => {
    const first = handlers();
    const second = handlers();
    const a = subscribeRealtime(first);
    const b = subscribeRealtime(second);
    try {
      FakeEventSource.instances[0].emit("chat:update", { threadId: "t1" });

      expect(first.onChatUpdate).toHaveBeenCalledWith({ threadId: "t1" });
      expect(second.onChatUpdate).toHaveBeenCalledWith({ threadId: "t1" });
    } finally {
      a();
      b();
    }
  });

  test("the stream stays open while anyone is still listening", () => {
    // The panel resubscribing must not disturb the bell's connection.
    const a = subscribeRealtime(handlers());
    const b = subscribeRealtime(handlers());

    b();

    expect(FakeEventSource.instances[0].closed).toBe(false);
    a();
  });

  test("a resubscribe while another listener holds it opens nothing new", () => {
    const bell = subscribeRealtime(handlers());
    const panel = subscribeRealtime(handlers());

    panel();
    const again = subscribeRealtime(handlers());

    expect(FakeEventSource.instances).toHaveLength(1);
    bell();
    again();
  });

  test("the last one out closes it", () => {
    const a = subscribeRealtime(handlers());
    const b = subscribeRealtime(handlers());

    a();
    b();

    expect(FakeEventSource.instances[0].closed).toBe(true);
  });

  test("a later subscriber opens a fresh stream after everyone left", () => {
    subscribeRealtime(handlers())();

    const again = subscribeRealtime(handlers());

    expect(FakeEventSource.instances).toHaveLength(2);
    again();
  });

  test("a late subscriber is told it is connected", () => {
    // `onConnected` pulls a fresh snapshot. Joining an already-open stream
    // must still fire it, or the second component never loads its data.
    const a = subscribeRealtime(handlers());
    FakeEventSource.instances[0].fireOpen();

    const late = handlers();
    const b = subscribeRealtime(late);

    expect(late.onConnected).toHaveBeenCalled();
    a();
    b();
  });
});

