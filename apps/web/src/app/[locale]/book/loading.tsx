import {
  Skeleton,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonCard,
  SkeletonText,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="Loading teachers"
      className="mx-auto max-w-5xl flex-1 px-4 py-10 sm:px-6"
    >
      <Skeleton height="8" width="1/3" />
      <div className="mt-3">
        <SkeletonText lines={2} lastLineWidth="2/3" />
      </div>

      <div className="mt-6">
        <SkeletonCard padding="sm">
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton height="10" width="1/3" rounded="xl" />
            <Skeleton height="10" width="1/4" rounded="xl" />
            <Skeleton height="10" width="1/4" rounded="xl" />
          </div>
        </SkeletonCard>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} padding="md">
            <div className="flex items-start gap-4">
              <SkeletonAvatar size="lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton height="5" width="1/2" />
                <Skeleton height="3" width="1/3" />
                <SkeletonText lines={2} />
                <div className="flex flex-wrap gap-2 pt-2">
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
