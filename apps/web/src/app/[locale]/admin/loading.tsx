import {
  Skeleton,
  SkeletonCard,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="Loading admin home"
      className="max-w-4xl"
    >
      <Skeleton height="8" width="1/3" />

      <div className="mt-6">
        <Skeleton height="6" width="1/4" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} padding="md">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton height="5" width="1/2" />
                  <Skeleton height="3" width="2/3" />
                </div>
                <Skeleton
                  width="1/4"
                  rounded="full"
                  className="!h-8 !w-20 shrink-0"
                />
              </div>
            </SkeletonCard>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <Skeleton height="6" width="1/3" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <SkeletonCard key={i} padding="md">
              <Skeleton height="5" width="1/3" />
              <div className="mt-3 space-y-2">
                <Skeleton height="3" width="2/3" />
                <Skeleton height="3" width="1/2" />
              </div>
            </SkeletonCard>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <Skeleton height="6" width="1/4" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} padding="sm">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton height="4" width="1/2" />
                  <Skeleton height="3" width="1/3" />
                </div>
                <Skeleton
                  width="1/4"
                  rounded="full"
                  className="!h-7 !w-16 shrink-0"
                />
              </div>
            </SkeletonCard>
          ))}
        </div>
      </div>
    </main>
  );
}
