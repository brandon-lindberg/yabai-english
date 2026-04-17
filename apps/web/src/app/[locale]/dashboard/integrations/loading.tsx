import {
  Skeleton,
  SkeletonButton,
  SkeletonCard,
  SkeletonText,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading integrations"
      className="space-y-8"
    >
      <div>
        <Skeleton height="8" width="1/2" />
        <div className="mt-3">
          <SkeletonText lines={2} lastLineWidth="2/3" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} padding="md">
            <div className="flex items-start gap-3">
              <Skeleton
                width="1/4"
                rounded="xl"
                className="!h-10 !w-10 shrink-0"
              />
              <div className="min-w-0 flex-1 space-y-3">
                <Skeleton height="5" width="1/2" />
                <SkeletonText lines={2} />
                <SkeletonButton width="1/2" />
              </div>
            </div>
          </SkeletonCard>
        ))}
      </div>

      <SkeletonCard padding="md">
        <Skeleton height="5" width="1/3" />
        <div className="mt-4">
          <Skeleton height="16" rounded="xl" />
        </div>
      </SkeletonCard>
    </div>
  );
}
