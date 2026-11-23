import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { authMock, recentAwardsMock } = vi.hoisted(() => ({ authMock: vi.fn(), recentAwardsMock: vi.fn() }));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/achievements/achievement-work", () => ({
  drainAchievementWork: async () => {},
  readRecentAwardNotices: recentAwardsMock,
}));

import { GET } from "@/app/api/realtime/stream/route";
import {
  publishChatUpdate,
  publishNotificationsUpdate,
} from "@/lib/realtime-bus";
import { EventEmitter } from "node:events";

function listenerCount() {
  const bus = (globalThis as unknown as { [key: symbol]: EventEmitter })[Symbol.for("english-platform.realtime-bus")];
  return bus?.eventNames().reduce((total, event) => total + bus.listenerCount(event), 0) ?? 0;
}

async function readChunk(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<string> {
  const { value, done } = await reader.read();
  if (done) return "";
  return new TextDecoder().decode(value);
}

describe("GET /api/realtime/stream", () => {
  beforeEach(() => {
    authMock.mockReset();
    recentAwardsMock.mockReset();
    recentAwardsMock.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  test.each(["cancel", "abort", "cancel then abort"])("releases the heartbeat and listener on %s", async (end) => {
    vi.useFakeTimers();
    authMock.mockResolvedValue({ user: { id: "cleanup-user", role: "STUDENT" } });
    const initialListeners = listenerCount();
    const abort = new AbortController();
    const response = await GET(new Request("http://localhost/api/realtime/stream", { signal: abort.signal }));
    const reader = response.body!.getReader();
    await readChunk(reader);
    expect(listenerCount()).toBe(initialListeners + 1);
    if (end.startsWith("cancel")) await reader.cancel();
    if (end.includes("abort")) {
      if (end.startsWith("cancel")) await vi.advanceTimersByTimeAsync(25_000);
      abort.abort();
    }
    expect({ listeners: listenerCount(), timers: vi.getTimerCount() }).toEqual({ listeners: initialListeners, timers: 0 });
  });

  test("an already aborted request does not retain stream resources", async () => {
    vi.useFakeTimers();
    authMock.mockResolvedValue({ user: { id: "aborted-user", role: "STUDENT" } });
    const initialListeners = listenerCount();
    const abort = new AbortController(); abort.abort();
    const response = await GET(new Request("http://localhost/api/realtime/stream", { signal: abort.signal }));
    expect((await response.body!.getReader().read()).done).toBe(true);
    expect({ listeners: listenerCount(), timers: vi.getTimerCount() }).toEqual({ listeners: initialListeners, timers: 0 });
  });

  test("rejects unauthenticated requests with 401", async () => {
    authMock.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/realtime/stream"));
    expect(res.status).toBe(401);
  });

  test("streams chat:update events for the authenticated user as SSE frames", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1", role: "STUDENT" } });
    const res = await GET(new Request("http://localhost/api/realtime/stream"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/event-stream/i);

    const reader = res.body!.getReader();

    // Drain the opening "connected" frame so we're parked on the next event.
    const hello = await readChunk(reader);
    expect(hello).toContain("event: connected");

    publishChatUpdate("user-1", "thread-99");
    const chunk = await readChunk(reader);
    expect(chunk).toContain("event: chat:update");
    expect(chunk).toContain('data: {"threadId":"thread-99"}');

    await reader.cancel();
  });

  test("streams notifications:update events for the authenticated user", async () => {
    authMock.mockResolvedValue({ user: { id: "user-2", role: "STUDENT" } });
    const res = await GET(new Request("http://localhost/api/realtime/stream"));
    const reader = res.body!.getReader();
    await readChunk(reader);

    publishNotificationsUpdate("user-2");
    const chunk = await readChunk(reader);
    expect(chunk).toContain("event: notifications:update");

    await reader.cancel();
  });

  test("reconnect replays a teacher unlock through the dedicated achievement event", async () => {
    authMock.mockResolvedValue({ user: { id: "teacher", role: "TEACHER" } });
    recentAwardsMock.mockResolvedValue([{
      id: "teach-hidden-notes", scope: "TEACHING", hidden: true,
      title: ["To Be Continued…", "つづきは次回"], awardedAt: "2026-11-23T03:00:00.000Z",
    }]);
    const response = await GET(new Request("http://localhost/api/realtime/stream"));
    const reader = response.body!.getReader();
    await readChunk(reader);
    const frame = await readChunk(reader);
    expect(recentAwardsMock).toHaveBeenCalledWith(expect.anything(), "teacher", "TEACHING");
    expect(frame).toContain("event: achievements:unlocked");
    expect(frame).toContain('"id":"teach-hidden-notes"');
    await reader.cancel();
  });

  test("does not deliver events intended for other users", async () => {
    authMock.mockResolvedValue({ user: { id: "user-a", role: "STUDENT" } });
    const res = await GET(new Request("http://localhost/api/realtime/stream"));
    const reader = res.body!.getReader();
    await readChunk(reader);

    publishChatUpdate("user-b", "thread-x");

    const race = await Promise.race([
      reader.read().then(() => "received"),
      new Promise<string>((resolve) => setTimeout(() => resolve("idle"), 50)),
    ]);
    expect(race).toBe("idle");

    await reader.cancel();
  });
});
