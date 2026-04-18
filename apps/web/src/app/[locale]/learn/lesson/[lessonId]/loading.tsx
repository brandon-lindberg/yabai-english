import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="Loading lesson"
      className="mx-auto max-w-lg flex-1 px-4 py-10 sm:px-6"
    >
      <Skeleton height="3" width="1/4" className="!w-28" />

      <div className="mt-4 space-y-2">
        <Skeleton height="8" width="3/4" />
        <Skeleton height="4" width="1/2" />
      </div>

      <div className="mt-8 space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6"
          >
            <Skeleton height="4" width="full" />
            <div className="mt-1">
              <Skeleton height="3" width="3/4" />
            </div>
            <div className="mt-4 space-y-2">
              {Array.from({ length: 3 }).map((__, j) => (
                <div
                  key={j}
                  className="rounded-xl border border-border px-3 py-3"
                >
                  <Skeleton height="4" width="3/4" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
