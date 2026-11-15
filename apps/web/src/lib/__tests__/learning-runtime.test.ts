import { afterEach, expect, test, vi } from "vitest";
import { learningWorkGate } from "../learning-work-gate";
import { learningResponse, registerLearningPool, reportLearningRuntime, runLearningWork } from "../learning-runtime";
import { queuePreparationResponse } from "../study/queue-preparation-server";
import { readPreparedQueue } from "../study/queue-preparation";

afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.restoreAllMocks(); expect(learningWorkGate.snapshot()).toMatchObject({ active: 0, queued: 0 }); });

test("an observation failure cannot turn a successful answer into an uncertain save", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.spyOn(process, "memoryUsage").mockImplementation(() => { throw new Error("diagnostic unavailable"); });
  const response = await learningResponse(undefined, "study.review", async () => Response.json({ saved: true }));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ saved: true });
});

test("resource records are throttled and contain only counters and fixed operation metadata", () => {
  vi.stubEnv("NODE_ENV", "production");
  const clock = vi.spyOn(Date, "now").mockReturnValue(100000);
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  registerLearningPool(() => ({ total: 4, idle: 2, waiting: 1 }));
  reportLearningRuntime("placement.english", { status: 200, durationMs: 20, waitMs: 1 });
  reportLearningRuntime("placement.english", { status: 200 });
  expect(log).toHaveBeenCalledTimes(1);
  const row = JSON.parse(log.mock.calls[0][0]);
  expect(row).toMatchObject({ event: "learning_runtime", operation: "placement.english", pool: { total: 4, idle: 2, waiting: 1 }, work: { active: 0, queued: 0 } });
  expect(Object.keys(row).sort()).toEqual(["durationMs", "event", "eventLoopDelayMaxMs", "externalMiB", "heapUsedMiB", "operation", "pool", "rssMiB", "status", "waitMs", "work"].sort());
  clock.mockReturnValue(130000);
  reportLearningRuntime("placement.english");
  expect(log).toHaveBeenCalledTimes(2);
});

test("overload rejects before calling the handler, gives a retry hint and frees expired waiters", async () => {
  vi.useFakeTimers();
  const leases = await Promise.all(Array.from({ length: 4 }, () => learningWorkGate.acquire()));
  try {
    const run = vi.fn(async () => Response.json({ saved: true }));
    const queued = Array.from({ length: 8 }, () => learningResponse(undefined, "study.review", run));
    const refused = await learningResponse(undefined, "study.review", run);
    expect(refused.status).toBe(503);
    expect(refused.headers.get("Retry-After")).toBe("2");
    expect(await refused.json()).toEqual({ error: "LEARNING_BUSY" });
    expect(run).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2000);
    expect((await Promise.all(queued)).every(r => r.status === 503)).toBe(true);
    expect(run).not.toHaveBeenCalled();
  } finally { leases.forEach(lease => lease.release()); }
});

test("a completed or failed handler releases its slot without retrying a mutation", async () => {
  const failure = vi.fn(async () => { throw new Error("write failed"); });
  await expect(runLearningWork("study.review", failure)).rejects.toThrow("write failed");
  expect(failure).toHaveBeenCalledTimes(1);
  const response = await learningResponse(undefined, "study.review", async () => Response.json({ saved: true }));
  expect(response.headers.get("X-Learning-Request-Id")).toMatch(/^[a-f0-9-]{36}$/);
  expect(await response.json()).toEqual({ saved: true });
});

test("streaming preparation holds admission until commit even after its response is returned and cancelled", async () => {
  let commit!: () => void;
  const work = new Promise<void>(resolve => { commit = resolve; });
  const response = await queuePreparationResponse(new Request("http://localhost", { headers: { Accept: "application/x-ndjson" } }), async () => {
    await work; return { cards: [] };
  }) as Response;
  try {
    expect(learningWorkGate.snapshot().active).toBe(1);
    await response.body!.cancel();
    expect(learningWorkGate.snapshot().active).toBe(1);
  } finally { commit(); await vi.waitFor(() => expect(learningWorkGate.snapshot().active).toBe(0)); }
});

test("busy streams report a safe error and never begin preparation", async () => {
  const controller = new AbortController();
  controller.abort();
  const run = vi.fn(async () => ({ cards: [] }));
  // Already-cancelled JSON requests have no work; streaming capacity errors are
  // also tested with a full gate so the response remains readable.
  const response = await queuePreparationResponse(new Request("http://localhost", { signal: controller.signal }), run) as Response;
  expect(response.status).toBe(503);
  expect(run).not.toHaveBeenCalled();
  vi.useFakeTimers();
  const leases = await Promise.all(Array.from({ length: 4 }, () => learningWorkGate.acquire()));
  try {
    const stream = await queuePreparationResponse(new Request("http://localhost", { headers: { Accept: "application/x-ndjson" } }), run) as Response;
    const result = expect(readPreparedQueue(stream, vi.fn())).rejects.toMatchObject({ status: 503, message: "LEARNING_BUSY" });
    await vi.advanceTimersByTimeAsync(2000); await result;
    expect(run).not.toHaveBeenCalled();
  } finally { leases.forEach(lease => lease.release()); }
});

test("cancelling a queued response removes it before any preparation starts", async () => {
  const leases = await Promise.all(Array.from({ length: 4 }, () => learningWorkGate.acquire()));
  const run = vi.fn(async () => ({ cards: [] }));
  try {
    const response = await queuePreparationResponse(new Request("http://localhost", { headers: { Accept: "application/x-ndjson" } }), run) as Response;
    expect(learningWorkGate.snapshot().queued).toBe(1);
    await response.body!.cancel();
    expect(learningWorkGate.snapshot().queued).toBe(0);
    expect(run).not.toHaveBeenCalled();
  } finally { leases.forEach(lease => lease.release()); await Promise.resolve(); }
});
