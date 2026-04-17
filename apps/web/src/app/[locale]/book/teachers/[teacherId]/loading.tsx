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
      aria-label="Loading teacher profile"
      className="mx-auto max-w-4xl flex-1 px-4 py-10 sm:px-6"
    >
      <Skeleton height="8" width="1/2" />
      <div className="mt-3">
        <SkeletonText lines={1} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <SkeletonCard padding="md">
          <div className="flex items-start gap-4">
            <SkeletonAvatar size="xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton height="5" width="2/3" />
              <Skeleton height="3" width="1/3" />
            </div>
          </div>
          <div className="mt-4">
            <SkeletonText lines={4} />
          </div>
          <div className="mt-4 flex gap-2">
            <Skeleton height="3" width="1/4" />
            <Skeleton height="3" width="1/4" />
          </div>
        </SkeletonCard>

        <SkeletonCard padding="md">
          <Skeleton height="5" width="1/2" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} height="10" rounded="xl" />
            ))}
          </div>
        </SkeletonCard>
      </div>

      <div className="mt-8 space-y-4">
        <Skeleton height="6" width="1/3" />
        <SkeletonText lines={1} />
        <SkeletonCard padding="lg">
          <div className="space-y-4">
            <Skeleton height="10" rounded="xl" />
            <Skeleton height="10" rounded="xl" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton height="10" rounded="xl" />
              <Skeleton height="10" rounded="xl" />
            </div>
            <div className="pt-2">
              <SkeletonButton width="1/3" />
            </div>
          </div>
        </SkeletonCard>
      </div>
    </main>
  );
}
