import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main role="status" aria-busy="true" aria-label="Loading reports">
      <Skeleton height="8" width="1/3" />
      <div className="mt-2">
        <Skeleton height="3" width="1/2" />
      </div>

      <div className="mt-8 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <Skeleton height="4" width="1/2" />
                <div className="mt-2 space-y-1">
                  <Skeleton height="3" width="full" />
                  <Skeleton height="3" width="3/4" />
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Skeleton width="1/4" rounded="full" className="!h-6 !w-20" />
                <Skeleton height="3" width="1/4" className="!w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
