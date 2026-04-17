import {
  Skeleton,
  SkeletonCard,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="Loading users"
    >
      <Skeleton height="8" width="1/4" />

      <div className="mt-6">
        <SkeletonCard padding="sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Skeleton height="10" width="1/3" rounded="xl" />
            <div className="flex gap-2">
              <Skeleton height="10" width="1/4" rounded="xl" />
              <Skeleton height="10" width="1/4" rounded="xl" />
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <div className="grid grid-cols-[1.5fr_1fr_1fr_120px] gap-2 border-b border-border bg-background px-4 py-2">
              <Skeleton height="3" width="1/2" />
              <Skeleton height="3" width="1/2" />
              <Skeleton height="3" width="1/2" />
              <Skeleton height="3" width="1/2" />
            </div>
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-[1.5fr_1fr_1fr_120px] items-center gap-2 border-b border-border/60 px-4 py-3 last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <Skeleton
                    width="1/4"
                    rounded="full"
                    className="!h-8 !w-8 shrink-0"
                  />
                  <Skeleton height="4" width="3/4" />
                </div>
                <Skeleton height="3" width="3/4" />
                <Skeleton height="3" width="1/2" />
                <Skeleton
                  width="1/4"
                  rounded="full"
                  className="!h-7 !w-20 shrink-0"
                />
              </div>
            ))}
          </div>
        </SkeletonCard>
      </div>
    </main>
  );
}
