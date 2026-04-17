import {
  Skeleton,
  SkeletonCard,
  SkeletonText,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading completed lessons"
      className="space-y-8"
    >
      <SkeletonText lines={1} />

      <div>
        <Skeleton height="6" width="1/3" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} padding="md">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton height="5" width="1/2" />
                  <Skeleton height="3" width="2/3" />
                </div>
                <Skeleton
                  width="1/4"
                  rounded="full"
                  className="!h-8 !w-24 shrink-0"
                />
              </div>
            </SkeletonCard>
          ))}
        </div>
      </div>
    </div>
  );
}
