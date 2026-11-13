import { expect, test, vi } from "vitest";
import { queuePreparationResponse } from "@/lib/study/queue-preparation-server";
import { readPreparedQueue, QueuePreparationError } from "@/lib/study/queue-preparation";
import { PrivateApiFailure } from "@/lib/private-api-error";

test("progress reports completed work and waits for the service commit before ready", async () => {
  let commit!: () => void;
  const committed = new Promise<void>(resolve => { commit = resolve; });
  const run = vi.fn(async report => {
    report!({ completed: 0, total: 3 });
    report!({ completed: 1, total: 3 });
    report!({ completed: 2, total: 3 });
    await committed;
    return { cards: ["one", "two"] };
  });
  const req = new Request("http://localhost/queue", { headers: { Accept: "application/x-ndjson" } });
  const response = await queuePreparationResponse(req, run) as Response;
  const progress: number[] = [];
  const result = readPreparedQueue(response as Response, value => progress.push(value.completed / value.total));
  await vi.waitFor(() => expect(progress).toEqual([0, 1 / 3, 2 / 3]));
  commit();
  expect(await result).toEqual({ cards: ["one", "two"] });
  expect(progress.at(-1)).toBe(1);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});

test("a failed transaction never reports completion and preserves safe error status", async () => {
  const response = await queuePreparationResponse(new Request("http://localhost", { headers: { Accept: "application/x-ndjson" } }), async report => {
    report!({ completed: 1, total: 2 });
    throw new PrivateApiFailure(403, "LEVEL_LOCKED");
  });
  const progress = vi.fn();
  await expect(readPreparedQueue(response as Response, progress)).rejects.toMatchObject({ status: 403, message: "LEVEL_LOCKED" });
  expect(progress).toHaveBeenCalledTimes(1);
});

test("default JSON clients keep the original response and no streaming callback", async () => {
  const run = vi.fn().mockResolvedValue({ cards: [] });
  const data = await queuePreparationResponse(new Request("http://localhost"), run);
  expect(data).toEqual({ cards: [] });
  expect(run).toHaveBeenCalledWith(undefined);
  expect(await readPreparedQueue(new Response(JSON.stringify(data)), vi.fn())).toEqual(data);
});

test("stream reader handles split UTF-8, rejects missing completion, and cancels malformed streams", async () => {
  const bytes = new TextEncoder().encode(JSON.stringify({ type: "ready", data: { text: "日本語" } }) + "\n");
  const response = new Response(new ReadableStream({ start(controller) { for (const byte of bytes) controller.enqueue(new Uint8Array([byte])); controller.close(); } }), { headers: { "Content-Type": "application/x-ndjson" } });
  expect(await readPreparedQueue(response, vi.fn())).toEqual({ text: "日本語" });
  const cancelled = vi.fn();
  const broken = new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('{"type":"progress","completed":4,"total":3}\n')); }, cancel: cancelled }), { headers: { "Content-Type": "application/x-ndjson" } });
  await expect(readPreparedQueue(broken, vi.fn())).rejects.toBeInstanceOf(QueuePreparationError);
  expect(cancelled).toHaveBeenCalled();
  await expect(readPreparedQueue(new Response("", { headers: { "Content-Type": "application/x-ndjson" } }), vi.fn())).rejects.toThrow();
});

test("aborted requests stop preparation without enqueueing into a cancelled stream", async () => {
  const controller = new AbortController();
  const req = new Request("http://localhost", { signal: controller.signal, headers: { Accept: "application/x-ndjson" } });
  let work!: () => void;
  const response = await queuePreparationResponse(req, async report => {
    await new Promise<void>(resolve => { work = resolve; });
    report!({ completed: 1, total: 2 });
    return { cards: [] };
  });
  const reader = (response as Response).body!.getReader();
  controller.abort(); work();
  expect(await reader.read()).toMatchObject({ done: true });
});
