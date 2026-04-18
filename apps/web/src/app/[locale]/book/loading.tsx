import { Skeleton, SkeletonAvatar } from "@/components/ui/skeleton";

/**
 * Mirrors the book/find-teachers page: PageHeader → filter bar → teacher
 * cards in a 2-column grid.
 */
export default function Loading() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="Loading teachers"
      className="mx-auto max-w-5xl flex-1 px-4 py-10 sm:px-6"
    >
      {/* Page header */}
      <Skeleton height="8" width="2/3" />
      <div className="mt-3 space-y-2">
        <Skeleton height="4" width="full" />
        <Skeleton height="4" width="2/3" />
      </div>

      {/* Filter bar */}
      <div className="mt-6 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1">
            <Skeleton height="10" width="full" rounded="xl" />
          </div>
          <Skeleton height="10" width="1/4" rounded="xl" className="!w-28" />
          <Skeleton height="10" width="1/4" rounded="xl" className="!w-28" />
        </div>
      </div>

      {/* Teacher cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6"
          >
            <div className="flex items-start gap-4">
              <SkeletonAvatar size="lg" />
              <div className="min-w-0 flex-1">
                <Skeleton height="5" width="2/3" />
                <div className="mt-1">
                  <Skeleton height="3" width="1/2" />
                </div>
                <div className="mt-2 space-y-1">
                  <Skeleton height="3" width="full" />
                  <Skeleton height="3" width="3/4" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Skeleton height="8" width="1/4" rounded="full" className="!w-24" />
                  <Skeleton height="8" width="1/4" rounded="full" className="!w-24" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
