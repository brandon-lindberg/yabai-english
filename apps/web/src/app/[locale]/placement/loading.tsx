import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors the real placement page: heading → description → quiz card with
 * timer, progress, instruction, question prompt, and answer buttons.
 */
export default function Loading() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="Loading placement"
      className="mx-auto max-w-2xl flex-1 px-4 py-10 sm:px-6"
    >
      {/* Page heading */}
      <Skeleton height="8" width="3/4" />
      <div className="mt-3 space-y-2">
        <Skeleton height="4" width="full" />
        <Skeleton height="4" width="2/3" />
      </div>

      <div className="mt-8 space-y-6">
        {/* Timer */}
        <Skeleton height="4" width="1/3" />

        {/* Progress */}
        <Skeleton height="3" width="1/4" />

        {/* Question card */}
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
          {/* Instruction */}
          <Skeleton height="3" width="full" />
          <div className="mt-1">
            <Skeleton height="3" width="2/3" />
          </div>
          {/* Question prompt */}
          <div className="mt-3">
            <Skeleton height="5" width="3/4" />
          </div>
          {/* Answer options */}
          <ul className="mt-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i}>
                <div className="rounded-xl border border-border px-3 py-3 sm:px-4">
                  <Skeleton height="4" width="3/4" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
