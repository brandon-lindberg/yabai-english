import {
  Skeleton,
  SkeletonAvatar,
} from "@/components/ui/skeleton";

/**
 * Skeleton that mirrors the real dashboard page structure exactly so that
 * the transition from loading → loaded is seamless with no layout shift.
 *
 * Mirrors: PageHeader → AppCard (level + buttons) → 2-col (next lesson +
 * profile) → study highlight → flashcard stats → quick review
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading dashboard"
      className="space-y-10"
    >
      {/* ── PageHeader ── */}
      <header className="mb-8 space-y-2">
        <Skeleton height="8" width="3/4" />
        <Skeleton height="4" width="full" />
        <Skeleton height="4" width="2/3" />
      </header>

      {/* ── Level + action buttons (AppCard) ── */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="min-w-0 flex-1">
            <Skeleton height="4" width="full" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton height="10" width="1/4" rounded="full" className="!w-28" />
            <Skeleton height="10" width="1/4" rounded="full" className="!w-36" />
            <Skeleton height="10" width="1/4" rounded="full" className="!w-32" />
          </div>
        </div>
      </div>

      {/* ── Two-column: Next lesson + Profile ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Next lesson card */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <Skeleton height="6" width="1/2" />
          <div className="mt-3">
            <Skeleton height="4" width="full" />
          </div>
          <div className="mt-2">
            <Skeleton height="3" width="3/4" />
          </div>
          <div className="mt-1">
            <Skeleton height="3" width="1/2" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Skeleton height="6" width="1/4" rounded="full" className="!w-20" />
            <Skeleton height="4" width="1/4" className="!w-24" />
            <Skeleton height="4" width="1/4" className="!w-20" />
          </div>
        </div>
        {/* Profile summary card */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <SkeletonAvatar size="lg" />
            <div className="min-w-0 flex-1">
              <Skeleton height="4" width="1/2" />
              <div className="mt-2">
                <Skeleton height="3" width="full" />
                <div className="mt-1">
                  <Skeleton height="3" width="3/4" />
                </div>
              </div>
              {/* XP bar */}
              <div className="mt-3 space-y-1">
                <Skeleton height="3" width="1/2" />
                <Skeleton height="3" width="full" rounded="full" />
              </div>
              <div className="mt-3">
                <Skeleton height="3" width="1/4" className="!w-16" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Study highlight ── */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Skeleton height="6" width="1/3" />
          <Skeleton height="4" width="1/4" className="!w-16" />
        </div>
        <div className="mt-1">
          <Skeleton height="3" width="2/3" />
        </div>
        {/* Resume box */}
        <div className="mt-4 rounded-xl bg-foreground/5 px-3 py-3">
          <Skeleton height="3" width="1/4" />
          <div className="mt-1">
            <Skeleton height="4" width="2/3" />
          </div>
          <div className="mt-1">
            <Skeleton height="3" width="1/2" />
          </div>
          <div className="mt-3">
            <Skeleton height="8" width="1/4" rounded="full" className="!w-24" />
          </div>
        </div>
      </div>

      {/* ── Flashcard stats ── */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <Skeleton height="6" width="1/3" />
        <div className="mt-1">
          <Skeleton height="3" width="2/3" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-foreground/5 px-3 py-2 space-y-1">
              <Skeleton height="3" width="3/4" />
              <Skeleton height="5" width="1/2" />
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick review ── */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <Skeleton height="6" width="1/3" />
          <Skeleton height="3" width="1/4" />
        </div>
        <div className="mt-1">
          <Skeleton height="3" width="1/2" />
        </div>
        <div className="mt-4 flex justify-center gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/5] w-full max-w-[11rem] rounded-2xl border-2 border-border bg-background p-3 shadow-md"
            >
              <div className="flex h-full flex-col items-center justify-center gap-2">
                <Skeleton height="4" width="3/4" />
                <Skeleton height="3" width="1/2" />
                <Skeleton height="3" width="2/3" />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-center gap-4">
          <Skeleton height="3" width="1/4" />
          <Skeleton height="3" width="1/4" />
        </div>
      </div>
    </div>
  );
}
