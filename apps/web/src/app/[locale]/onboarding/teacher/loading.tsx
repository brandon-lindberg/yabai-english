import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="Loading teacher onboarding"
      className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6"
    >
      <Skeleton height="8" width="2/3" />
      <div className="mt-3 space-y-2">
        <Skeleton height="4" width="full" />
        <Skeleton height="4" width="2/3" />
      </div>

      <div className="mt-8 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6"
          >
            <div className="flex items-start gap-3">
              <Skeleton width="1/4" rounded="full" className="!h-6 !w-6 shrink-0" />
              <div className="min-w-0 flex-1">
                <Skeleton height="5" width="1/2" />
                <div className="mt-2 space-y-1">
                  <Skeleton height="3" width="full" />
                  <Skeleton height="3" width="3/4" />
                </div>
                <div className="mt-3">
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
