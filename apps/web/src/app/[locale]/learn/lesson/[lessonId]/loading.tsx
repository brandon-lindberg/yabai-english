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
      aria-label="Loading lesson"
      className="mx-auto max-w-lg flex-1 px-4 py-10 sm:px-6"
    >
      <Skeleton height="3" width="1/4" />

      <div className="mt-4 space-y-2">
        <Skeleton height="8" width="2/3" />
        <Skeleton height="5" width="1/2" />
      </div>

      <div className="mt-8 space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} padding="md">
            <SkeletonText lines={2} />
            <div className="mt-4 space-y-2">
              <Skeleton height="10" rounded="xl" />
              <Skeleton height="10" rounded="xl" />
              <Skeleton height="10" rounded="xl" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </main>
  );
}
