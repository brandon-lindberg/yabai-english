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
      aria-label="Loading"
      className="mx-auto flex max-w-3xl flex-1 flex-col px-4 py-12 sm:px-6"
    >
      <Skeleton height="8" width="1/2" />
      <div className="mt-3">
        <SkeletonText lines={2} lastLineWidth="2/3" />
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <SkeletonCard padding="md">
          <Skeleton height="5" width="2/3" />
          <div className="mt-3">
            <SkeletonText lines={2} />
          </div>
          <div className="mt-4">
            <SkeletonButton width="1/2" />
          </div>
        </SkeletonCard>
        <SkeletonCard padding="md">
          <Skeleton height="5" width="2/3" />
          <div className="mt-3">
            <SkeletonText lines={2} />
          </div>
          <div className="mt-4">
            <SkeletonButton width="1/2" />
          </div>
        </SkeletonCard>
        <SkeletonCard padding="md">
          <Skeleton height="5" width="2/3" />
          <div className="mt-3">
            <SkeletonText lines={2} />
          </div>
          <div className="mt-4">
            <SkeletonButton width="1/2" />
          </div>
        </SkeletonCard>
      </div>
    </main>
  );
}
