import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors the real study hub: back link → title → subtitle → XP bar card →
 * level cards (title + 3-col stats + action buttons) → bottom link.
 */
export default function Loading() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="Loading study hub"
      className="mx-auto max-w-3xl flex-1 px-4 py-10 sm:px-6"
    >
      {/* Back link */}
      <Skeleton height="4" width="1/4" className="!w-28" />

      {/* Title + subtitle */}
      <div className="mt-4">
        <Skeleton height="8" width="3/4" />
        <div className="mt-2">
          <Skeleton height="4" width="full" />
        </div>
      </div>

      {/* ── XP bar card ── */}
      <div className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <Skeleton height="5" width="1/2" />
        <div className="mt-1">
          <Skeleton height="3" width="1/3" />
        </div>
        <div className="mt-3">
          <Skeleton height="3" width="full" rounded="full" />
        </div>
        <div className="mt-2">
          <Skeleton height="3" width="2/3" />
        </div>
      </div>

      {/* ── Level cards ── */}
      <section className="mt-8 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <article
            key={i}
            className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
          >
            {/* Title + badge row */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <Skeleton height="6" width="2/3" />
              <Skeleton height="5" width="1/4" rounded="full" className="!w-16" />
            </div>

            {/* 3-column stats grid — matches the real page */}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm sm:gap-3">
              {Array.from({ length: 3 }).map((__, j) => (
                <div
                  key={j}
                  className="rounded-xl bg-foreground/5 px-1.5 py-2 sm:px-2"
                >
                  <Skeleton height="3" width="2/3" className="mx-auto" />
                  <div className="mt-1">
                    <Skeleton height="5" width="1/2" className="mx-auto" />
                  </div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex flex-wrap gap-2 sm:gap-3">
              <Skeleton height="10" width="1/4" rounded="xl" className="!w-20" />
              <Skeleton height="10" width="1/4" rounded="xl" className="!w-28" />
              <Skeleton height="10" width="1/4" rounded="xl" className="!w-24" />
            </div>
          </article>
        ))}
      </section>

      {/* Bottom link */}
      <div className="mt-10">
        <Skeleton height="4" width="1/4" className="!w-28" />
      </div>
    </main>
  );
}
