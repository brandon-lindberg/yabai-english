import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors the real practice session: back link → title → XP bar → progress
 * counter → flashcard prompt card → answer grid.
 */
export default function Loading() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="Loading practice"
      className="mx-auto max-w-lg flex-1 px-4 py-10 sm:px-6"
    >
      {/* Back link */}
      <Skeleton height="3" width="1/4" className="!w-28" />

      {/* Title */}
      <div className="mt-4 space-y-2">
        <Skeleton height="8" width="3/4" />
        <Skeleton height="4" width="1/2" />
      </div>

      {/* ── XP bar card ── */}
      <div className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <Skeleton height="4" width="1/2" />
        <div className="mt-1">
          <Skeleton height="3" width="1/3" />
        </div>
        <div className="mt-2">
          <Skeleton height="3" width="full" rounded="full" />
        </div>
        <div className="mt-1">
          <Skeleton height="3" width="2/3" />
        </div>
      </div>

      {/* Progress + score */}
      <div className="mt-4 flex flex-wrap justify-between gap-2">
        <Skeleton height="3" width="1/4" className="!w-12" />
        <Skeleton height="3" width="1/3" className="!w-36" />
      </div>

      {/* ── Flashcard ── */}
      <div className="mt-6 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-8">
        <Skeleton height="3" width="1/4" />
        <div className="mt-3 min-h-[6rem] sm:min-h-[8rem]">
          <Skeleton height="8" width="3/4" />
          <div className="mt-3">
            <Skeleton height="6" width="1/2" />
          </div>
        </div>
        <div className="mt-4 sm:mt-6">
          <Skeleton height="4" width="2/3" />
        </div>
      </div>

      {/* ── Answer options ── */}
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-surface px-4 py-4"
          >
            <Skeleton height="4" width="3/4" />
            <div className="mt-1">
              <Skeleton height="3" width="1/2" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
