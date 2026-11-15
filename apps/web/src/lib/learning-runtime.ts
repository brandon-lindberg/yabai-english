import "server-only";
import { randomUUID } from "node:crypto";
import { monitorEventLoopDelay } from "node:perf_hooks";
import { learningWorkGate, LearningBusyError } from "./learning-work-gate";
import { PrivateApiFailure } from "./private-api-error";

type PoolState = { total: number; idle: number; waiting: number };
type Diagnostics = {
  pool?: () => PoolState;
  delay?: ReturnType<typeof monitorEventLoopDelay>;
  lastLog: Map<string, number>;
};
const shared = globalThis as unknown as { learningDiagnostics?: Diagnostics };
const diagnostics: Diagnostics = shared.learningDiagnostics ??= { lastLog: new Map() };
export function registerLearningPool(read: () => PoolState) { diagnostics.pool = read; }
export type LearningOperation = "health" | "study.prepare" | "study.review" | "study.overview" | "study.assessment" | "placement.english" | "placement.japanese";

/** Fixed operation labels only: no URLs, account IDs, answers, SQL or credentials. */
export function reportLearningRuntime(operation: LearningOperation, fields: { requestId?: string; durationMs?: number; waitMs?: number; status?: number } = {}) {
  if (process.env.NODE_ENV !== "production") return;
  // Diagnostics must never replace a committed answer with an HTTP failure.
  try {
  const now = Date.now(), slow = (fields.durationMs ?? 0) >= 300 || (fields.status ?? 200) >= 500;
  if (now - (diagnostics.lastLog.get(operation) ?? 0) < (slow ? 10_000 : 30_000)) return;
  diagnostics.lastLog.set(operation, now);
  if (!diagnostics.delay) { diagnostics.delay = monitorEventLoopDelay({ resolution: 20 }); diagnostics.delay.enable(); }
  const memory = process.memoryUsage();
  const eventLoopDelayMaxMs = Math.round(diagnostics.delay.max / 1e6);
  diagnostics.delay.reset();
  console.info(JSON.stringify({ event: "learning_runtime", operation, ...fields,
    rssMiB: Math.round(memory.rss / 1048576), heapUsedMiB: Math.round(memory.heapUsed / 1048576),
    externalMiB: Math.round(memory.external / 1048576), eventLoopDelayMaxMs,
    pool: diagnostics.pool?.() ?? null, work: learningWorkGate.snapshot() }));
  } catch { /* Best-effort resource observation. */ }
}

/** Release only when the underlying work settles, never by racing an active write. */
export async function runLearningWork<T>(operation: LearningOperation, run: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  const start = performance.now(), requestId = randomUUID();
  let lease: Awaited<ReturnType<typeof learningWorkGate.acquire>> | undefined;
  let status = 500;
  try {
    lease = await learningWorkGate.acquire(signal);
    const value = await run();
    status = value instanceof Response ? value.status : 200;
    if (value instanceof Response) value.headers.set("X-Learning-Request-Id", requestId);
    return value;
  } catch (error) {
    status = error instanceof PrivateApiFailure ? error.status : error instanceof Error && error.name === "AbortError" ? 499 : 500;
    throw error;
  } finally {
    lease?.release();
    reportLearningRuntime(operation, { requestId, durationMs: Math.round(performance.now() - start), waitMs: Math.round(lease?.waitMs ?? performance.now() - start), status });
  }
}

export function learningBusyResponse() {
  return Response.json({ error: "LEARNING_BUSY" }, { status: 503, headers: { "Retry-After": "2", "Cache-Control": "private, no-store" } });
}

export async function learningResponse(req: Request | undefined, operation: LearningOperation, run: () => Promise<Response>) {
  try { return await runLearningWork(operation, run, req?.signal); }
  catch (error) { if (error instanceof LearningBusyError) return learningBusyResponse(); throw error; }
}
