import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock("@/auth", () => ({ auth: authMock }));

import { GET } from "@/app/api/realtime/stream/route";
import {
  publishChatUpdate,
  publishNotificationsUpdate,
} from "@/lib/realtime-bus";

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
  });

  afterEach(() => {
    vi.useRealTimers();
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
