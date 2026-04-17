import {
  Skeleton,
  SkeletonCard,
  SkeletonText,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="Loading reports"
    >
      <Skeleton height="8" width="1/3" />
      <div className="mt-2">
        <Skeleton height="3" width="1/2" />
      </div>

      <div className="mt-8 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} padding="md">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <Skeleton height="4" width="1/3" />
                <div className="mt-2">
                  <SkeletonText lines={2} />
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <Skeleton
                  width="1/4"
                  rounded="full"
                  className="!h-6 !w-20"
                />
                <Skeleton height="3" width="1/4" className="!w-24" />
              </div>
            </div>
          </SkeletonCard>
        ))}
      </div>
    </main>
  );
}
