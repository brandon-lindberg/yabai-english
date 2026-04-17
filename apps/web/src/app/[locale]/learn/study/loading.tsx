import {
  Skeleton,
  SkeletonButton,
  SkeletonCard,
  SkeletonText,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="Loading study hub"
      className="mx-auto max-w-3xl flex-1 px-4 py-10 sm:px-6"
    >
      <Skeleton height="3" width="1/4" />
      <div className="mt-4">
        <Skeleton height="8" width="1/2" />
        <div className="mt-3">
          <SkeletonText lines={2} lastLineWidth="2/3" />
        </div>
      </div>

      <div className="mt-6">
        <SkeletonCard padding="md">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton height="5" width="1/3" />
              <Skeleton height="3" width="1/4" />
            </div>
            <Skeleton height="3" rounded="full" />
          </div>
        </SkeletonCard>
      </div>

      <div className="mt-8 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} padding="md">
            <div className="flex items-start gap-3">
              <Skeleton
                width="1/4"
                rounded="full"
                className="!h-10 !w-10 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <Skeleton height="5" width="1/3" />
                <div className="mt-2">
                  <SkeletonText lines={1} />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {Array.from({ length: 3 }).map((__, j) => (
                    <div key={j} className="space-y-2">
                      <Skeleton height="3" width="1/2" />
                      <Skeleton height="6" width="2/3" />
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <SkeletonButton width="1/3" />
                  <SkeletonButton width="1/3" />
                </div>
              </div>
            </div>
          </SkeletonCard>
        ))}
      </div>
    </main>
  );
}
