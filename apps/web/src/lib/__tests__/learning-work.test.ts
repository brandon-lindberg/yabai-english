import { afterEach, expect, test, vi } from "vitest";
import { createLearningWorkGate, LearningBusyError } from "../learning-work-gate";

afterEach(() => vi.useRealTimers());
test("caps active work, admits queued work FIFO and releases each slot once", async () => {
  const gate = createLearningWorkGate({ active: 2, queued: 2, waitMs: 1000 });
  const a = await gate.acquire(), b = await gate.acquire();
  const order: string[] = [];
  const c = gate.acquire().then(lease => { order.push("c"); return lease; });
  const d = gate.acquire().then(lease => { order.push("d"); return lease; });
  await expect(gate.acquire()).rejects.toBeInstanceOf(LearningBusyError);
  expect(gate.snapshot()).toMatchObject({ active: 2, queued: 2, rejected: 1 });
  a.release(); a.release(); const third = await c;
  expect(order).toEqual(["c"]);
  expect(gate.snapshot()).toMatchObject({ active: 2, queued: 1 });
  b.release(); const fourth = await d;
  expect(order).toEqual(["c", "d"]);
  third.release(); fourth.release();
  expect(gate.snapshot()).toMatchObject({ active: 0, queued: 0 });
});
test("expired and aborted waiters are removed without taking a later slot", async () => {
  vi.useFakeTimers();
  const gate = createLearningWorkGate({ active: 1, queued: 2, waitMs: 100 });
  const first = await gate.acquire();
  const controller = new AbortController();
  const aborted = expect(gate.acquire(controller.signal)).rejects.toMatchObject({ code: "LEARNING_BUSY" });
  const expired = expect(gate.acquire()).rejects.toMatchObject({ code: "LEARNING_BUSY" });
  controller.abort(); await aborted;
  await vi.advanceTimersByTimeAsync(100); await expired;
  first.release();
  expect(gate.snapshot()).toMatchObject({ active: 0, queued: 0 });
  expect(vi.getTimerCount()).toBe(0);
  await expect(gate.acquire(controller.signal)).rejects.toBeInstanceOf(LearningBusyError);
  const next = await gate.acquire(); next.release();
});
test("a disconnected active request does not release its slot before work completes", async () => {
  const gate = createLearningWorkGate({ active: 1, queued: 0, waitMs: 100 });
  const controller = new AbortController();
  const running = await gate.acquire(controller.signal);
  controller.abort();
  await expect(gate.acquire()).rejects.toBeInstanceOf(LearningBusyError);
  running.release();
  const next = await gate.acquire(); next.release();
});
