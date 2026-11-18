import "server-only";
import { PrivateApiFailure } from "./private-api-error";

export class LearningBusyError extends PrivateApiFailure {
  constructor() { super(503, "LEARNING_BUSY"); }
}

type Lease = { waitMs: number; release: () => void };
type Waiter = { admit: () => void };

function createGateState() {
  return { active: 0, rejected: 0, peakActive: 0, peakQueued: 0, waiting: [] as Waiter[] };
}

/** Admission happens before transactions; cancellation only removes waiting work. */
export function createLearningWorkGate(limits: { active: number; queued: number; waitMs: number }, state = createGateState()) {
  const { waiting } = state;
  function lease(start: number): Lease {
    state.active++;
    state.peakActive = Math.max(state.peakActive, state.active);
    let released = false;
    return { waitMs: performance.now() - start, release() {
      if (released) return;
      released = true; state.active--;
      waiting.shift()?.admit();
    } };
  }
  return {
    snapshot: () => ({ active: state.active, queued: waiting.length, rejected: state.rejected, peakActive: state.peakActive, peakQueued: state.peakQueued }),
    acquire(signal?: AbortSignal): Promise<Lease> {
      const start = performance.now();
      if (signal?.aborted || (state.active >= limits.active && waiting.length >= limits.queued)) {
        state.rejected++; return Promise.reject(new LearningBusyError());
      }
      if (state.active < limits.active) return Promise.resolve(lease(start));
      return new Promise((resolve, reject) => {
        const cleanup = () => { clearTimeout(timer); signal?.removeEventListener("abort", refuse); };
        const refuse = () => {
          const index = waiting.indexOf(waiter);
          if (index < 0) return;
          waiting.splice(index, 1); cleanup(); state.rejected++; reject(new LearningBusyError());
        };
        const waiter: Waiter = { admit() { cleanup(); resolve(lease(start)); } };
        const timer = setTimeout(refuse, limits.waitMs);
        timer.unref?.();
        waiting.push(waiter);
        state.peakQueued = Math.max(state.peakQueued, waiting.length);
        signal?.addEventListener("abort", refuse, { once: true });
      });
    },
  };
}

// Routes share the same queue and counters. Each bundle creates its own errors
// so its HTTP and streaming handlers can recognize an admission refusal.
const shared = globalThis as unknown as { learningWorkState?: ReturnType<typeof createGateState> };
export const learningWorkGate = createLearningWorkGate({ active: 4, queued: 8, waitMs: 2000 }, shared.learningWorkState ??= createGateState());
