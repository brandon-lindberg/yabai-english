import "server-only";
import { PrivateApiFailure } from "./private-api-error";

export class LearningBusyError extends PrivateApiFailure {
  constructor() { super(503, "LEARNING_BUSY"); }
}

type Lease = { waitMs: number; release: () => void };
type Waiter = { admit: () => void };

/** Admission happens before transactions; cancellation only removes waiting work. */
export function createLearningWorkGate(limits: { active: number; queued: number; waitMs: number }) {
  let active = 0, rejected = 0, peakActive = 0, peakQueued = 0;
  const waiting: Waiter[] = [];
  function lease(start: number): Lease {
    active++;
    peakActive = Math.max(peakActive, active);
    let released = false;
    return { waitMs: performance.now() - start, release() {
      if (released) return;
      released = true; active--;
      waiting.shift()?.admit();
    } };
  }
  return {
    snapshot: () => ({ active, queued: waiting.length, rejected, peakActive, peakQueued }),
    acquire(signal?: AbortSignal): Promise<Lease> {
      const start = performance.now();
      if (signal?.aborted || (active >= limits.active && waiting.length >= limits.queued)) {
        rejected++; return Promise.reject(new LearningBusyError());
      }
      if (active < limits.active) return Promise.resolve(lease(start));
      return new Promise((resolve, reject) => {
        const cleanup = () => { clearTimeout(timer); signal?.removeEventListener("abort", refuse); };
        const refuse = () => {
          const index = waiting.indexOf(waiter);
          if (index < 0) return;
          waiting.splice(index, 1); cleanup(); rejected++; reject(new LearningBusyError());
        };
        const waiter: Waiter = { admit() { cleanup(); resolve(lease(start)); } };
        const timer = setTimeout(refuse, limits.waitMs);
        timer.unref?.();
        waiting.push(waiter);
        peakQueued = Math.max(peakQueued, waiting.length);
        signal?.addEventListener("abort", refuse, { once: true });
      });
    },
  };
}

// Shared by independently bundled API modules, like the process-owned Prisma client.
const shared = globalThis as unknown as { learningWorkGate?: ReturnType<typeof createLearningWorkGate> };
export const learningWorkGate = shared.learningWorkGate ??= createLearningWorkGate({ active: 4, queued: 8, waitMs: 2000 });
