import {
  Skeleton,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonCard,
  SkeletonText,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading dashboard"
      className="space-y-10"
    >
      <SkeletonCard padding="md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <SkeletonText lines={1} />
          </div>
          <SkeletonButton width="1/3" />
        </div>
      </SkeletonCard>

      <div>
        <Skeleton height="8" width="1/2" />
        <div className="mt-3">
          <SkeletonText lines={2} lastLineWidth="2/3" />
        </div>
      </div>

      <SkeletonCard padding="md">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="min-w-0 flex-1">
            <SkeletonText lines={1} />
          </div>
          <div className="flex flex-wrap gap-2">
            <SkeletonButton width="1/4" />
            <SkeletonButton width="1/4" />
            <SkeletonButton width="1/4" />
          </div>
        </div>
      </SkeletonCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SkeletonCard padding="md">
          <Skeleton height="5" width="1/3" />
          <div className="mt-4">
            <SkeletonText lines={3} />
          </div>
          <div className="mt-4">
            <SkeletonButton width="1/3" />
          </div>
        </SkeletonCard>
        <SkeletonCard padding="md">
          <div className="flex items-center gap-3">
            <SkeletonAvatar size="lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton height="5" width="1/2" />
              <Skeleton height="3" width="2/3" />
            </div>
          </div>
          <div className="mt-4">
            <SkeletonText lines={2} />
          </div>
        </SkeletonCard>
      </div>

      <SkeletonCard padding="md">
        <Skeleton height="5" width="1/3" />
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton height="3" width="1/2" />
              <Skeleton height="8" width="2/3" />
            </div>
          ))}
        </div>
      </SkeletonCard>

      <SkeletonCard padding="md">
        <Skeleton height="5" width="1/3" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-border p-3"
            >
              <Skeleton
                width="1/4"
                rounded="full"
                className="!h-10 !w-10 shrink-0"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton height="4" width="3/4" />
                <Skeleton height="3" width="1/2" />
              </div>
            </div>
          ))}
        </div>
      </SkeletonCard>
    </div>
  );
}
