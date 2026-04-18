import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading completed lessons"
      className="space-y-8"
    >
      <Skeleton height="4" width="full" />

      <div>
        <Skeleton height="6" width="1/3" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <Skeleton height="4" width="full" />
                  <div className="mt-2">
                    <Skeleton height="3" width="3/4" />
                  </div>
                  <div className="mt-1">
                    <Skeleton height="3" width="1/2" />
                  </div>
                </div>
                <Skeleton
                  width="1/4"
                  rounded="full"
                  className="!h-9 !w-24 shrink-0"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
