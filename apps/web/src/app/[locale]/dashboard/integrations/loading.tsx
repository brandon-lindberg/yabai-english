import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors the real integrations page: heading + description + integration
 * cards in a 2-column grid + settings card.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading integrations"
      className="space-y-8"
    >
      {/* Page header */}
      <div>
        <Skeleton height="8" width="1/2" />
        <div className="mt-3 space-y-2">
          <Skeleton height="4" width="full" />
          <Skeleton height="4" width="2/3" />
        </div>
      </div>

      {/* Integration cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6"
          >
            <div className="flex items-start gap-3">
              <Skeleton width="1/4" rounded="xl" className="!h-10 !w-10 shrink-0" />
              <div className="min-w-0 flex-1">
                <Skeleton height="5" width="2/3" />
                <div className="mt-2 space-y-1">
                  <Skeleton height="3" width="full" />
                  <Skeleton height="3" width="3/4" />
                </div>
                <div className="mt-3">
                  <Skeleton height="8" width="1/3" rounded="full" className="!w-24" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Settings card */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <Skeleton height="5" width="1/3" />
        <div className="mt-4 rounded-xl border border-border p-4">
          <Skeleton height="4" width="full" />
          <div className="mt-2">
            <Skeleton height="3" width="3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}
