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
      aria-label="Loading practice"
      className="mx-auto max-w-lg flex-1 px-4 py-10 sm:px-6"
    >
      <Skeleton height="3" width="1/4" />

      <div className="mt-4 space-y-2">
        <Skeleton height="8" width="1/2" />
        <Skeleton height="5" width="1/3" />
      </div>

      <div className="mt-8">
        <SkeletonCard padding="lg">
          <div className="flex items-center justify-between">
            <Skeleton height="3" width="1/3" />
            <Skeleton height="3" width="1/4" />
          </div>
          <div className="mt-6 flex min-h-[12rem] flex-col items-center justify-center gap-3">
            <Skeleton height="6" width="2/3" />
            <SkeletonText lines={2} lastLineWidth="2/3" />
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <SkeletonButton width="1/3" />
            <SkeletonButton width="1/3" />
          </div>
        </SkeletonCard>
      </div>
    </main>
  );
}
